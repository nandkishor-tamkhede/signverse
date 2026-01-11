import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallState, GestureMessage } from '@/types/call';
import { v4 as uuidv4 } from 'uuid';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseWebRTCOptions {
  roomId: string;
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

export function useWebRTC({ roomId, onGestureReceived, onTextReceived }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const participantIdRef = useRef<string>(uuidv4());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log('[WebRTC] Creating peer connection');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate');
        await (supabase.from('call_signals') as any).insert({
          room_id: roomId,
          sender_id: participantIdRef.current,
          signal_type: 'ice-candidate',
          signal_data: { candidate: event.candidate.toJSON() },
        });
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
  }, [roomId]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: SignalPayload) => {
    if (signal.sender_id === participantIdRef.current) return;

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

          await (supabase.from('call_signals') as any).insert({
            room_id: roomId,
            sender_id: participantIdRef.current,
            signal_type: 'answer',
            signal_data: { type: answer.type, sdp: answer.sdp },
          });
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
  }, [roomId, createPeerConnection, onGestureReceived, onTextReceived]);

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

    await (supabase.from('call_signals') as any).insert({
      room_id: roomId,
      sender_id: participantIdRef.current,
      signal_type: 'offer',
      signal_data: { type: offer.type, sdp: offer.sdp },
    });
  }, [roomId, createPeerConnection]);

  // Join call as responder
  const joinCall = useCallback(async (localStream: MediaStream) => {
    console.log('[WebRTC] Joining call as responder');
    setCallState({ status: 'connecting', localStream });
    localStreamRef.current = localStream;
  }, []);

  // Send gesture to remote
  const sendGesture = useCallback(async (message: GestureMessage) => {
    await (supabase.from('call_signals') as any).insert({
      room_id: roomId,
      sender_id: participantIdRef.current,
      signal_type: 'gesture',
      signal_data: {
        gesture: message.gesture,
        text: message.text,
        hindiText: message.hindiText,
        confidence: message.confidence,
        timestamp: message.timestamp,
      } as unknown as Record<string, unknown>,
    });
  }, [roomId]);

  // Send text message
  const sendText = useCallback(async (text: string) => {
    await (supabase.from('call_signals') as any).insert({
      room_id: roomId,
      sender_id: participantIdRef.current,
      signal_type: 'text',
      signal_data: { text },
    });
  }, [roomId]);

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
    if (!roomId) return;

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
  }, [roomId, handleSignal]);

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
    participantId: participantIdRef.current,
  };
}
