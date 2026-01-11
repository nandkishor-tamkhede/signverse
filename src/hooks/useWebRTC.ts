import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallState, GestureMessage } from '@/types/call';
import { RateLimiter } from '@/lib/throttle';

// Default STUN servers (fast path). TURN relays can be added dynamically.
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Aggressive timeouts for fast failure detection & recovery
const CONNECTION_TIMEOUT_MS = 8000;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;

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
    sequence?: number;
    call_session_id?: string;
  };
}

// Rate limiter for signals - increased for faster signaling
const signalRateLimiter = new RateLimiter(200, 60 * 1000);

export function useWebRTC({ roomId, userId, onGestureReceived, onTextReceived }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const connectTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const isInitiatorRef = useRef(false);
  const signalSequenceRef = useRef(0);
  const subscriptionReadyRef = useRef(false);
  const pendingSignalsRef = useRef<SignalPayload[]>([]);

  // ICE servers (starts with STUN; may be upgraded to TURN on retry)
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const hasTurnServersRef = useRef(false);

  // Prevent stale signaling from previous attempts within the same room.
  // Initiator generates a new session id; responder adopts it from the first offer.
  const callSessionIdRef = useRef<string | null>(null);

  // Glare handling ("perfect negotiation"-style).
  const makingOfferRef = useRef(false);
  const politeRef = useRef(true);

  // Avoid handling offer/ICE before local media exists.
  const hasReceivedOfferRef = useRef(false);
  const offerFallbackTimeoutRef = useRef<number | null>(null);

  const participantId = userId;

  const clearOfferFallbackTimeout = useCallback(() => {
    if (offerFallbackTimeoutRef.current) {
      window.clearTimeout(offerFallbackTimeoutRef.current);
      offerFallbackTimeoutRef.current = null;
    }
  }, []);

  // Deterministic "polite" role (so two peers are very likely to differ)
  useEffect(() => {
    if (!participantId) return;
    const last = participantId.replace(/[^0-9a-f]/gi, '').slice(-1);
    const nibble = Number.parseInt(last || '0', 16);
    politeRef.current = (nibble % 2) === 0;
    console.log('[WebRTC] Negotiation role:', politeRef.current ? 'polite' : 'impolite');
  }, [participantId]);

  // Clear timeout helper
  const clearConnectionTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const loadIceServers = useCallback(async () => {
    try {
      console.log('[WebRTC] Loading ICE servers from backend...');
      const { data, error } = await supabase.functions.invoke('ice-servers');
      if (error) throw error;

      const servers = (data as any)?.iceServers as RTCIceServer[] | undefined;
      if (Array.isArray(servers) && servers.length > 0) {
        iceServersRef.current = servers;

        hasTurnServersRef.current = servers.some((s: any) => {
          const urls = s?.urls;
          const list = Array.isArray(urls) ? urls : [urls];
          return list.some((u: any) => typeof u === 'string' && u.startsWith('turn:'));
        });

        console.log('[WebRTC] Loaded ICE servers. TURN available:', hasTurnServersRef.current);

        // If we have TURN and already have a PC, update its configuration for future restarts
        if (hasTurnServersRef.current && peerConnectionRef.current) {
          console.log('[WebRTC] TURN servers now available for ICE restart');
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Failed to load ICE servers (using STUN only):', err);
    }
  }, []);

  const validateRoomCapacity = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('room_participants') as any)
        .select('user_id')
        .eq('room_id', roomId);

      if (error) {
        console.warn('[WebRTC] Participant check failed:', error.message);
        return;
      }

      const count = Array.isArray(data) ? data.length : 0;
      console.log('[WebRTC] Room participants:', count);

      if (count > 2) {
        setIsRemoteConnected(false);
        setCallState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Room has more than 2 participants. Please create a new room.',
        }));
      }
    } catch (e) {
      console.warn('[WebRTC] Participant check failed:', e);
    }
  }, [roomId]);

  // Send signal with sequence number for ordering (broadcast-first, DB as fallback)
  const sendSignal = useCallback(async (signalType: string, signalData: Record<string, unknown>) => {
    if (!signalRateLimiter.canProceed()) {
      console.warn('[WebRTC] Signal rate limited');
      return false;
    }

    const sequence = ++signalSequenceRef.current;

    const isWebRTCHandshake = signalType === 'offer' || signalType === 'answer' || signalType === 'ice-candidate';
    const enrichedSignalData = {
      ...signalData,
      sequence,
      ...(isWebRTCHandshake && callSessionIdRef.current ? { call_session_id: callSessionIdRef.current } : {}),
    };

    // 1) Realtime broadcast (fast path)
    const broadcastSignal: SignalPayload = {
      id: `broadcast-${participantId}-${sequence}`,
      created_at: new Date().toISOString(),
      sender_id: participantId,
      signal_type: signalType,
      signal_data: enrichedSignalData as any,
    };

    if (channelRef.current) {
      void channelRef.current
        .send({ type: 'broadcast', event: 'signal', payload: broadcastSignal })
        .then((res) => console.log('[WebRTC] Broadcast sent:', signalType, res))
        .catch((err) => console.warn('[WebRTC] Broadcast send failed:', err));
    }

    // 2) Persist to DB in the background (reliability/backlog)
    void (async () => {
      try {
        const start = performance.now();
        await (supabase.from('call_signals') as any).insert({
          room_id: roomId,
          sender_id: participantId,
          signal_type: signalType,
          signal_data: enrichedSignalData,
        });
        console.log(`[WebRTC] Signal ${signalType} stored in ${(performance.now() - start).toFixed(0)}ms (seq: ${sequence})`);
      } catch (error) {
        console.error('[WebRTC] Error storing signal:', error);
      }
    })();

    signalRateLimiter.recordOperation();
    return true;
  }, [roomId, participantId]);

  // Create optimized peer connection
  const createPeerConnection = useCallback(() => {
    console.log('[WebRTC] Creating peer connection with optimized config');

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // ICE candidate handling - send immediately (trickle ICE)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE candidate ready, sending immediately');
        void sendSignal('ice-candidate', { candidate: event.candidate.toJSON() });
      }
    };

    pc.onicecandidateerror = (event) => {
      console.warn('[WebRTC] ICE candidate error:', event);
    };

    pc.onnegotiationneeded = () => {
      console.log('[WebRTC] negotiationneeded');
    };

    // ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
    };

    // Signaling state
    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', pc.signalingState);
    };

    // Connection state - primary indicator
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connected':
          clearConnectionTimeout();
          retryCountRef.current = 0;
          setIsRemoteConnected(true);
          setCallState((prev) => ({ ...prev, status: 'connected' }));
          console.log('[WebRTC] ✓ Successfully connected!');
          break;
          
        case 'failed':
          console.error('[WebRTC] Connection failed');
          handleConnectionFailure('Connection failed');
          break;
          
        case 'disconnected':
          console.warn('[WebRTC] Connection disconnected, may recover...');
          setIsRemoteConnected(false);
          // Don't immediately fail - may recover
          break;
      }
    };

    // ICE connection state - backup indicator
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearConnectionTimeout();
        setIsRemoteConnected(true);
        setCallState((prev) => ({ ...prev, status: 'connected' }));
      } else if (pc.iceConnectionState === 'failed') {
        console.error('[WebRTC] ICE connection failed');
        handleConnectionFailure('ICE negotiation failed');
      }
    };

    // Remote track received
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('[WebRTC] Remote stream with', remoteStream.getTracks().length, 'tracks');
        setCallState((prev) => ({ ...prev, remoteStream }));
      } else {
        console.log('[WebRTC] Creating new stream for track');
        setCallState((prev) => {
          const existingStream = prev.remoteStream || new MediaStream();
          existingStream.addTrack(event.track);
          return { ...prev, remoteStream: existingStream };
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal, clearConnectionTimeout]);

  // Handle connection failure with retry logic
  const handleConnectionFailure = useCallback((reason: string) => {
    console.error('[WebRTC] Connection failure:', reason);
    
    if (retryCountRef.current < MAX_RETRY_ATTEMPTS && isInitiatorRef.current) {
      retryCountRef.current++;
      console.log(`[WebRTC] Retrying connection (attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})...`);
      
      // Close existing connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Retry after delay
      setTimeout(async () => {
        if (localStreamRef.current && callState.status !== 'idle') {
          console.log('[WebRTC] Attempting reconnection...');

          // If TURN servers are available now, recreate PC with updated config
          if (hasTurnServersRef.current) {
            console.log('[WebRTC] Using TURN servers for reconnection attempt');
          }

          // New session id for the retry (prevents mixing with stale signals)
          callSessionIdRef.current = crypto.randomUUID();
          hasReceivedOfferRef.current = false;
          pendingCandidatesRef.current = [];

          const pc = createPeerConnection();

          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
          });

          try {
            makingOfferRef.current = true;
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
              iceRestart: true, // Always restart ICE on retry
            });
            await pc.setLocalDescription(offer);
            await sendSignal('offer', { type: offer.type, sdp: offer.sdp });
          } finally {
            makingOfferRef.current = false;
          }
        }
      }, RETRY_DELAY_MS);
    } else {
      setIsRemoteConnected(false);
      setCallState((prev) => ({
        ...prev,
        status: 'error',
        error: `${reason}. Please check the room code and try again.`,
      }));
    }
  }, [callState.status, createPeerConnection, sendSignal]);

  // Process a signal
  const handleSignal = useCallback(async (signal: SignalPayload) => {
    // Ignore own signals
    if (signal.sender_id === participantId) return;

    // Dedupe signals (works for DB rows + broadcast)
    const s = signal.signal_data as any;
     const key = [
       signal.sender_id,
       signal.signal_type,
       // Prefer stable identifiers so broadcast + DB copies dedupe correctly
       s?.call_session_id ?? '',
       s?.sequence ?? 'no-seq',
     ].join('|');

    if (processedSignalIdsRef.current.has(key)) return;
    processedSignalIdsRef.current.add(key);

    // Also track DB ids if present
    if (signal.id) {
      if (processedSignalIdsRef.current.has(signal.id)) return;
      processedSignalIdsRef.current.add(signal.id);
    }

    const pc = peerConnectionRef.current;

    const incomingSessionId = (signal.signal_data as any)?.call_session_id as string | undefined;

    // Adopt session id from first offer we see
    if (!callSessionIdRef.current && signal.signal_type === 'offer' && incomingSessionId) {
      callSessionIdRef.current = incomingSessionId;
      pendingCandidatesRef.current = []; // ensure no stale candidates
      console.log('[WebRTC] Adopted call session id from offer:', incomingSessionId);
    }

    // If we have a session id, ignore signals from other sessions (stale backlog)
    if (callSessionIdRef.current && incomingSessionId && incomingSessionId !== callSessionIdRef.current) {
      console.log('[WebRTC] Ignoring stale signal from different session:', signal.signal_type);
      return;
    }

    console.log('[WebRTC] Processing signal:', signal.signal_type, 'seq:', signal.signal_data.sequence);

    const ensureLocalTracks = (conn: RTCPeerConnection) => {
      const stream = localStreamRef.current;
      if (!stream) return;

      const existingTrackIds = new Set(conn.getSenders().map(s => s.track?.id).filter(Boolean) as string[]);
      for (const track of stream.getTracks()) {
        if (existingTrackIds.has(track.id)) continue;
        console.log('[WebRTC] Adding local track:', track.kind);
        conn.addTrack(track, stream);
      }
    };

    try {
      switch (signal.signal_type) {
        case 'offer': {
          console.log('[WebRTC] Received offer from remote peer');
          hasReceivedOfferRef.current = true;
          clearOfferFallbackTimeout();

          const newPc = pc || createPeerConnection();

          // Glare handling
          const offerData = signal.signal_data as { type: RTCSdpType; sdp: string };
          const offerDesc = new RTCSessionDescription({ type: offerData.type, sdp: offerData.sdp });
          const offerCollision = makingOfferRef.current || newPc.signalingState !== 'stable';

          if (offerCollision) {
            console.warn('[WebRTC] Offer collision detected. state=', newPc.signalingState);
            if (!politeRef.current) {
              console.warn('[WebRTC] Impolite peer -> ignoring incoming offer');
              return;
            }
            console.log('[WebRTC] Polite peer -> rolling back local description');
            await newPc.setLocalDescription({ type: 'rollback' } as any);
          }

          ensureLocalTracks(newPc);

          await newPc.setRemoteDescription(offerDesc);
          console.log('[WebRTC] Remote description set (offer)');

          // Process any pending ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift()!;
            await newPc.addIceCandidate(new RTCIceCandidate(candidate));
          }

          // Create and send answer
          const answer = await newPc.createAnswer();
          await newPc.setLocalDescription(answer);
          console.log('[WebRTC] Local description set (answer)');

          await sendSignal('answer', { type: answer.type, sdp: answer.sdp });
          break;
        }

        case 'answer': {
          if (!pc) {
            console.warn('[WebRTC] No PC for answer');
            return;
          }

          if (pc.signalingState !== 'have-local-offer') {
            console.warn('[WebRTC] Ignoring answer, wrong state:', pc.signalingState);
            return;
          }

          console.log('[WebRTC] Received answer from remote peer');
          const answerData = signal.signal_data as { type: RTCSdpType; sdp: string };
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: answerData.type,
            sdp: answerData.sdp,
          }));
          console.log('[WebRTC] Remote description set (answer)');

          // Process pending ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift()!;
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          break;
        }

        case 'ice-candidate': {
          const candidateData = signal.signal_data as { candidate: RTCIceCandidateInit };

          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
          } else {
            // Queue for later (most commonly candidates arrive before offer/answer is set)
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
  }, [participantId, clearOfferFallbackTimeout, createPeerConnection, onGestureReceived, onTextReceived, sendSignal]);

  // Start call as initiator (host) - optimized for speed
  const startCall = useCallback(async (localStream: MediaStream) => {
    const startTime = performance.now();
    console.log('[WebRTC] Starting call as initiator (fast path)');

    // Non-blocking checks / config upgrades
    void loadIceServers();
    void validateRoomCapacity();

    // Set local stream immediately
    localStreamRef.current = localStream;
    setCallState({ status: 'connecting', localStream });

    // Fresh session id for this attempt
    callSessionIdRef.current = crypto.randomUUID();
    hasReceivedOfferRef.current = false;
    clearOfferFallbackTimeout();
    pendingCandidatesRef.current = [];

    isInitiatorRef.current = true;
    retryCountRef.current = 0;

    // Create peer connection immediately - no waiting
    const pc = createPeerConnection();

    // Add tracks BEFORE offer (required for proper negotiation)
    localStream.getTracks().forEach(track => {
      console.log('[WebRTC] Adding track:', track.kind);
      pc.addTrack(track, localStream);
    });

    // Start offer creation immediately (don't wait for subscription)
    try {
      makingOfferRef.current = true;

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false,
      });
      await pc.setLocalDescription(offer);

      const elapsed = performance.now() - startTime;
      console.log(`[WebRTC] Offer created in ${elapsed.toFixed(0)}ms`);

      // Send offer immediately - repeat it twice for reliability
      await sendSignal('offer', { type: offer.type, sdp: offer.sdp });

      // Re-send offer after a short delay for reliability (in case first missed)
      setTimeout(() => {
        if (peerConnectionRef.current === pc && pc.signalingState === 'have-local-offer') {
          console.log('[WebRTC] Re-sending offer for reliability');
          void sendSignal('offer', { type: offer.type, sdp: offer.sdp });
        }
      }, 300);
    } finally {
      makingOfferRef.current = false;
    }
  }, [clearOfferFallbackTimeout, createPeerConnection, sendSignal]);

  // Join call as responder - optimized for speed
  const joinCall = useCallback(async (localStream: MediaStream) => {
    const startTime = performance.now();
    console.log('[WebRTC] Joining call as responder (fast path)');

    // Non-blocking checks / config upgrades
    void loadIceServers();
    void validateRoomCapacity();

    // Set local stream immediately
    localStreamRef.current = localStream;
    setCallState({ status: 'connecting', localStream });

    isInitiatorRef.current = false;
    retryCountRef.current = 0;

    // Reset state
    clearOfferFallbackTimeout();
    hasReceivedOfferRef.current = false;

    // Process pending signals immediately (may contain offer)
    if (pendingSignalsRef.current.length > 0) {
      console.log('[WebRTC] Processing', pendingSignalsRef.current.length, 'pending signals immediately');
      const signalsToProcess = [...pendingSignalsRef.current];
      pendingSignalsRef.current = [];
      for (const signal of signalsToProcess) {
        await handleSignal(signal);
      }
    }

    // Fast fallback: if no offer received quickly, become initiator
    const fallbackDelay = 600; // Much faster fallback
    offerFallbackTimeoutRef.current = window.setTimeout(async () => {
      if (hasReceivedOfferRef.current) return;
      if (!localStreamRef.current) return;
      if (peerConnectionRef.current) return;

      console.warn('[WebRTC] No offer received, initiating fallback offer');
      callSessionIdRef.current = crypto.randomUUID();
      pendingCandidatesRef.current = [];

      const pc = createPeerConnection();
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart: hasTurnServersRef.current,
        });
        await pc.setLocalDescription(offer);
        await sendSignal('offer', { type: offer.type, sdp: offer.sdp });
        console.log(`[WebRTC] Fallback offer sent in ${(performance.now() - startTime).toFixed(0)}ms`);
      } finally {
        makingOfferRef.current = false;
      }
    }, fallbackDelay);
  }, [clearOfferFallbackTimeout, createPeerConnection, handleSignal, sendSignal]);

  // Send gesture
  const sendGesture = useCallback(async (message: GestureMessage) => {
    await sendSignal('gesture', {
      gesture: message.gesture,
      text: message.text,
      hindiText: message.hindiText,
      confidence: message.confidence,
      timestamp: message.timestamp,
    });
  }, [sendSignal]);

  // Send text
  const sendText = useCallback(async (text: string) => {
    await sendSignal('text', { text });
  }, [sendSignal]);

  // End call
  const endCall = useCallback(() => {
    console.log('[WebRTC] Ending call');

    clearConnectionTimeout();
    clearOfferFallbackTimeout();

    pendingCandidatesRef.current = [];
    processedSignalIdsRef.current = new Set();
    pendingSignalsRef.current = [];
    retryCountRef.current = 0;
    signalSequenceRef.current = 0;

    callSessionIdRef.current = null;
    hasReceivedOfferRef.current = false;
    makingOfferRef.current = false;

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

    subscriptionReadyRef.current = false;
    setCallState({ status: 'idle' });
    setIsRemoteConnected(false);
  }, [clearConnectionTimeout, clearOfferFallbackTimeout]);

  // Subscribe to signals - optimized for speed (broadcast + DB changes)
  useEffect(() => {
    if (!roomId || !participantId) return;

    const startTime = performance.now();
    console.log('[WebRTC] Setting up signal subscription for room:', roomId);
    let cancelled = false;

    const channel = supabase
      // IMPORTANT: channel topic MUST be identical for both peers, otherwise broadcast signals are never delivered.
      .channel(`call-room-${roomId}`)
      // Fast path: Realtime broadcast
      .on('broadcast', { event: 'signal' }, (payload) => {
        if (cancelled) return;
        const signal = (payload as any).payload as SignalPayload;

        const isHandshake =
          signal.signal_type === 'offer' ||
          signal.signal_type === 'answer' ||
          signal.signal_type === 'ice-candidate';

        if (isHandshake && !localStreamRef.current) {
          console.log('[WebRTC] Queuing broadcast signal (local media not ready):', signal.signal_type);
          pendingSignalsRef.current.push(signal);
          return;
        }

        console.log('[WebRTC] Broadcast signal:', signal.signal_type);
        void handleSignal(signal);
      })
      // Reliability/backlog: DB inserts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (cancelled) return;
          const signal = payload.new as SignalPayload;

          const isHandshake =
            signal.signal_type === 'offer' ||
            signal.signal_type === 'answer' ||
            signal.signal_type === 'ice-candidate';

          if (isHandshake && !localStreamRef.current) {
            console.log('[WebRTC] Queuing DB signal (local media not ready):', signal.signal_type);
            pendingSignalsRef.current.push(signal);
            return;
          }

          console.log('[WebRTC] DB realtime signal:', signal.signal_type);
          void handleSignal(signal);
        }
      )
      .subscribe((status) => {
        const elapsed = performance.now() - startTime;
        console.log(`[WebRTC] Subscription ${status} in ${elapsed.toFixed(0)}ms`);
        if (status === 'SUBSCRIBED') {
          subscriptionReadyRef.current = true;
        }
      });

    channelRef.current = channel;

    // Fetch recent backlog immediately (limits stale session adoption)
    (async () => {
      try {
        const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();

        const { data, error } = await (supabase
          .from('call_signals') as any)
          .select('id,sender_id,signal_type,signal_data,created_at')
          .eq('room_id', roomId)
          .gt('created_at', since)
          .order('created_at', { ascending: true })
          .limit(50);

        if (cancelled) return;

        if (error) {
          console.warn('[WebRTC] Backlog fetch error:', error.message);
          return;
        }

        if (!Array.isArray(data) || data.length === 0) return;

        // If we haven't locked onto a session id yet, pick the most recent offer
        if (!callSessionIdRef.current) {
          const lastOffer = [...data]
            .reverse()
            .find((row: any) => row.signal_type === 'offer' && row.signal_data?.call_session_id);

          if (lastOffer?.signal_data?.call_session_id) {
            callSessionIdRef.current = lastOffer.signal_data.call_session_id;
            console.log('[WebRTC] Backlog selected call session id:', callSessionIdRef.current);
          }
        }

        console.log('[WebRTC] Processing', data.length, 'recent backlog signals');

        for (const row of data) {
          const signal = row as SignalPayload;
          const isHandshake =
            signal.signal_type === 'offer' ||
            signal.signal_type === 'answer' ||
            signal.signal_type === 'ice-candidate';

          // Drop stale handshake signals from other sessions
          if (isHandshake && callSessionIdRef.current) {
            const sid = (signal.signal_data as any)?.call_session_id;
            if (sid && sid !== callSessionIdRef.current) continue;
          }

          if (isHandshake && !localStreamRef.current) {
            pendingSignalsRef.current.push(signal);
          } else {
            await handleSignal(signal);
          }
        }
      } catch (err) {
        console.warn('[WebRTC] Backlog fetch failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, participantId, handleSignal]);

  // Connection timeout watchdog
  useEffect(() => {
    if (callState.status !== 'connecting') return;
    if (isRemoteConnected) {
      clearConnectionTimeout();
      return;
    }

    clearConnectionTimeout();

    connectTimeoutRef.current = window.setTimeout(() => {
      console.error('[WebRTC] Connection timeout');
      handleConnectionFailure('Connection timed out');
    }, CONNECTION_TIMEOUT_MS);

    return clearConnectionTimeout;
  }, [callState.status, isRemoteConnected, clearConnectionTimeout, handleConnectionFailure]);

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
