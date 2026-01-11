import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallState, GestureMessage } from '@/types/call';
import { RateLimiter } from '@/lib/throttle';

// Fast STUN servers with low latency - ordered by typical response time
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

// Shorter timeout for faster failure detection
const CONNECTION_TIMEOUT_MS = 15000;

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  onGestureReceived?: (message: GestureMessage) => void;
  onTextReceived?: (text: string) => void;
}

interface SignalPayload {
  id?: string;
  created_at?: string;
  sender_id: string;
  signal_type: string;
  signal_data: {
    type?: string;
    sdp?: string;
    candidate?: RTCIceCandidateInit;
    gesture?: string;
    text?: string;
    hindiText?: string;
    confidence?: number;
    timestamp?: number;
  };
}

// Rate limiter for signals: max 60 signals per minute (client-side)
const signalRateLimiter = new RateLimiter(60, 60 * 1000);

export function useWebRTC({ roomId, userId, onGestureReceived, onTextReceived }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const connectTimeoutRef = useRef<number | null>(null);

  // Use authenticated user ID instead of random UUID
  const participantId = userId;

  // Helper to send signal with rate limiting
  const sendSignal = useCallback(async (signalType: string, signalData: Record<string, unknown>) => {
    if (!signalRateLimiter.canProceed()) {
      console.warn('[WebRTC] Signal rate limited');
      return false;
    }

    try {
      await (supabase.from('call_signals') as any).insert({
        room_id: roomId,
        sender_id: participantId,
        signal_type: signalType,
        signal_data: signalData,
      });
      signalRateLimiter.recordOperation();
      return true;
    } catch (error) {
      // Handle rate limit error from database
      if (error instanceof Error && error.message?.includes('Rate limit exceeded')) {
        console.warn('[WebRTC] Database rate limit hit');
      } else {
        console.error('[WebRTC] Error sending signal:', error);
      }
      return false;
    }
  }, [roomId, participantId]);

  // Create peer connection with optimized settings
  const createPeerConnection = useCallback(() => {
    console.log('[WebRTC] Creating peer connection with optimized ICE config');
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10, // Pre-gather ICE candidates for faster connection
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate');
        await sendSignal('ice-candidate', { candidate: event.candidate.toJSON() });
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', pc.signalingState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState((prev) => ({ ...prev, status: 'connected' }));
      }
      if (pc.connectionState === 'failed') {
        setIsRemoteConnected(false);
        setCallState((prev) => ({ ...prev, status: 'error', error: 'Connection failed. Please try again.' }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsRemoteConnected(true);
        setCallState((prev) => ({ ...prev, status: 'connected' }));
      } else if (pc.iceConnectionState === 'disconnected') {
        setIsRemoteConnected(false);
        setCallState((prev) => ({ ...prev, status: 'disconnected' }));
      } else if (pc.iceConnectionState === 'failed') {
        console.error('[WebRTC] ICE failed (likely NAT/TURN issue or signaling).');
        setIsRemoteConnected(false);
        setCallState((prev) => ({ ...prev, status: 'error', error: 'ICE negotiation failed. Try again or switch networks.' }));
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind, 'streams:', event.streams.length);
      
      // Get or create remote stream
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('[WebRTC] Using existing stream with tracks:', remoteStream.getTracks().length);
        setCallState((prev) => ({ ...prev, remoteStream }));
      } else {
        // Fallback: create a new stream if none provided
        console.log('[WebRTC] Creating new MediaStream for track');
        setCallState((prev) => {
          const existingStream = prev.remoteStream || new MediaStream();
          existingStream.addTrack(event.track);
          return { ...prev, remoteStream: existingStream };
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: SignalPayload) => {
    if (signal.sender_id === participantId) return;

    // Dedupe: subscription + backlog fetch can deliver the same signal
    if (signal.id) {
      if (processedSignalIdsRef.current.has(signal.id)) return;
      processedSignalIdsRef.current.add(signal.id);
    }

    const pc = peerConnectionRef.current;
    if (!pc && signal.signal_type !== 'offer') {
      console.log('[WebRTC] No peer connection, ignoring signal:', signal.signal_type);
      return;
    }

    console.log('[WebRTC] Handling signal:', signal.signal_type);

    try {
      switch (signal.signal_type) {
        case 'offer': {
          console.log('[WebRTC] Processing offer from remote peer');
          const newPc = pc || createPeerConnection();
          
          // Add local tracks BEFORE setting remote description (critical for two-way video!)
          if (localStreamRef.current) {
            console.log('[WebRTC] Adding local tracks to answer peer connection');
            localStreamRef.current.getTracks().forEach(track => {
              console.log('[WebRTC] Adding track for answer:', track.kind);
              newPc.addTrack(track, localStreamRef.current!);
            });
          } else {
            console.warn('[WebRTC] No local stream available when processing offer!');
          }

          const offerData = signal.signal_data as { type: RTCSdpType; sdp: string };
          await newPc.setRemoteDescription(new RTCSessionDescription({
            type: offerData.type,
            sdp: offerData.sdp,
          }));
          console.log('[WebRTC] Set remote description (offer)');
          
          // Process pending candidates
          for (const candidate of pendingCandidatesRef.current) {
            await newPc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];

          const answer = await newPc.createAnswer();
          await newPc.setLocalDescription(answer);
          console.log('[WebRTC] Created and set local answer');

          await sendSignal('answer', { type: answer.type, sdp: answer.sdp });
          break;
        }

        case 'answer': {
          if (pc && pc.signalingState === 'have-local-offer') {
            console.log('[WebRTC] Processing answer from remote peer');
            const answerData = signal.signal_data as { type: RTCSdpType; sdp: string };
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: answerData.type,
              sdp: answerData.sdp,
            }));
            console.log('[WebRTC] Set remote description (answer)');
            
            // Process pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
          } else {
            console.warn('[WebRTC] Received answer but not in correct state:', pc?.signalingState);
          }
          break;
        }

        case 'ice-candidate': {
          const candidateData = signal.signal_data as { candidate: RTCIceCandidateInit };
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
          } else {
            pendingCandidatesRef.current.push(candidateData.candidate);
          }
          break;
        }

        case 'gesture': {
          if (onGestureReceived) {
            const gestureData = signal.signal_data as {
              gesture: string;
              text: string;
              hindiText?: string;
              confidence: number;
              timestamp: number;
            };
            onGestureReceived({
              gesture: gestureData.gesture,
              text: gestureData.text,
              hindiText: gestureData.hindiText,
              confidence: gestureData.confidence,
              timestamp: gestureData.timestamp,
            });
          }
          break;
        }

        case 'text': {
          if (onTextReceived) {
            const textData = signal.signal_data as { text: string };
            onTextReceived(textData.text);
          }
          break;
        }
      }
    } catch (error) {
      console.error('[WebRTC] Error handling signal:', error);
    }
  }, [participantId, createPeerConnection, onGestureReceived, onTextReceived, sendSignal]);

  // Start call as initiator
  const startCall = useCallback(async (localStream: MediaStream) => {
    console.log('[WebRTC] Starting call as initiator');
    console.log('[WebRTC] Local stream tracks:', localStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
    
    setCallState({ status: 'connecting', localStream });
    localStreamRef.current = localStream;

    const pc = createPeerConnection();

    // Add local tracks BEFORE creating offer (critical!)
    localStream.getTracks().forEach(track => {
      console.log('[WebRTC] Adding track to peer connection:', track.kind);
      pc.addTrack(track, localStream);
    });

    // Create and send offer with proper options
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    console.log('[WebRTC] Created and set local offer');

    await sendSignal('offer', { type: offer.type, sdp: offer.sdp });
  }, [createPeerConnection, sendSignal]);

  // Join call as responder
  const joinCall = useCallback(async (localStream: MediaStream) => {
    console.log('[WebRTC] Joining call as responder');
    console.log('[WebRTC] Local stream tracks:', localStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
    
    setCallState({ status: 'connecting', localStream });
    localStreamRef.current = localStream;
    
    // Note: We don't create offer here - we wait for the host's offer
    // The handleSignal function will create the peer connection and answer when offer arrives
  }, []);

  // Send gesture to remote with rate limiting
  const sendGesture = useCallback(async (message: GestureMessage) => {
    await sendSignal('gesture', {
      gesture: message.gesture,
      text: message.text,
      hindiText: message.hindiText,
      confidence: message.confidence,
      timestamp: message.timestamp,
    });
  }, [sendSignal]);

  // Send text message with rate limiting
  const sendText = useCallback(async (text: string) => {
    await sendSignal('text', { text });
  }, [sendSignal]);

  // End call
  const endCall = useCallback(() => {
    console.log('[WebRTC] Ending call');

    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    pendingCandidatesRef.current = [];
    processedSignalIdsRef.current = new Set();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setCallState({ status: 'idle' });
    setIsRemoteConnected(false);
  }, []);

  // Subscribe to signals (and also fetch backlog so we don't miss the offer)
  useEffect(() => {
    if (!roomId || !participantId) return;

    console.log('[WebRTC] Subscribing to room signals:', roomId);

    let cancelled = false;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const signal = payload.new as SignalPayload;
          console.log('[WebRTC] Signal received via realtime:', signal.signal_type);
          handleSignal(signal);
        }
      )
      .subscribe((status) => {
        console.log('[WebRTC] Realtime subscription status:', status);
      });

    channelRef.current = channel;

    // Fetch recent signals so a late joiner doesn't miss the offer
    (async () => {
      const { data, error } = await (supabase
        .from('call_signals') as any)
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (cancelled) return;

      if (error) {
        console.warn('[WebRTC] Failed to fetch signal backlog:', error.message);
        return;
      }

      if (Array.isArray(data) && data.length) {
        console.log('[WebRTC] Processing signal backlog:', data.length);
        for (const row of data) {
          await handleSignal(row as SignalPayload);
        }
      }
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, participantId, handleSignal]);

  // Connecting watchdog: never stay stuck forever
  useEffect(() => {
    if (callState.status !== 'connecting') return;
    if (isRemoteConnected) return;

    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
    }

    connectTimeoutRef.current = window.setTimeout(() => {
      console.error('[WebRTC] Connection timed out');
      setCallState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Connection timed out. Check the room code and try again.',
      }));
    }, CONNECTION_TIMEOUT_MS); // Use the faster timeout

    return () => {
      if (connectTimeoutRef.current) {
        window.clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
    };
  }, [callState.status, isRemoteConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    callState,
    isRemoteConnected,
    startCall,
    joinCall,
    endCall,
    sendGesture,
    sendText,
    participantId,
  };
}
