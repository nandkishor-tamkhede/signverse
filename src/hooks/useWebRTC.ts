import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallState, GestureMessage } from '@/types/call';
import { RateLimiter } from '@/lib/throttle';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  onGestureReceived?: (message: GestureMessage) => void;
  onTextReceived?: (text: string) => void;
}

interface SignalPayload {
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

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log('[WebRTC] Creating peer connection');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate');
        await sendSignal('ice-candidate', { candidate: event.candidate.toJSON() });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsRemoteConnected(true);
        setCallState(prev => ({ ...prev, status: 'connected' }));
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setIsRemoteConnected(false);
        setCallState(prev => ({ ...prev, status: 'disconnected' }));
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received');
      const [remoteStream] = event.streams;
      setCallState(prev => ({ ...prev, remoteStream }));
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: SignalPayload) => {
    if (signal.sender_id === participantId) return;

    const pc = peerConnectionRef.current;
    if (!pc && signal.signal_type !== 'offer') {
      console.log('[WebRTC] No peer connection, ignoring signal:', signal.signal_type);
      return;
    }

    console.log('[WebRTC] Handling signal:', signal.signal_type);

    try {
      switch (signal.signal_type) {
        case 'offer': {
          const newPc = pc || createPeerConnection();
          
          // Add local tracks if we have them
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              newPc.addTrack(track, localStreamRef.current!);
            });
          }

          const offerData = signal.signal_data as { type: RTCSdpType; sdp: string };
          await newPc.setRemoteDescription(new RTCSessionDescription({
            type: offerData.type,
            sdp: offerData.sdp,
          }));
          
          // Process pending candidates
          for (const candidate of pendingCandidatesRef.current) {
            await newPc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];

          const answer = await newPc.createAnswer();
          await newPc.setLocalDescription(answer);

          await sendSignal('answer', { type: answer.type, sdp: answer.sdp });
          break;
        }

        case 'answer': {
          if (pc && pc.signalingState === 'have-local-offer') {
            const answerData = signal.signal_data as { type: RTCSdpType; sdp: string };
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: answerData.type,
              sdp: answerData.sdp,
            }));
            
            // Process pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
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
    setCallState({ status: 'connecting', localStream });
    localStreamRef.current = localStream;

    const pc = createPeerConnection();

    // Add local tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendSignal('offer', { type: offer.type, sdp: offer.sdp });
  }, [createPeerConnection, sendSignal]);

  // Join call as responder
  const joinCall = useCallback(async (localStream: MediaStream) => {
    console.log('[WebRTC] Joining call as responder');
    setCallState({ status: 'connecting', localStream });
    localStreamRef.current = localStream;
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
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setCallState({ status: 'idle' });
    setIsRemoteConnected(false);
  }, []);

  // Subscribe to signals
  useEffect(() => {
    if (!roomId || !participantId) return;

    console.log('[WebRTC] Subscribing to room signals:', roomId);

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
          handleSignal(signal);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, participantId, handleSignal]);

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
