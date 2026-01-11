import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { RoleSelection } from '@/components/call/RoleSelection';
import { RoomLobby } from '@/components/call/RoomLobby';
import { CallInterface } from '@/components/call/CallInterface';
import { useCallRoom } from '@/hooks/useCallRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { useCameraPreload } from '@/hooks/useCameraPreload';
import { UserRole, GestureMessage } from '@/types/call';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type CallPhase = 'role-selection' | 'lobby' | 'in-call';

export default function VideoCall() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<CallPhase>('role-selection');
  const [role, setRole] = useState<UserRole | null>(null);
  const [receivedGestures, setReceivedGestures] = useState<GestureMessage[]>([]);
  const [receivedText, setReceivedText] = useState<string[]>([]);

  const { isLoading: isAuthLoading, ensureAuthenticated } = useAnonymousAuth();
  const [authUserId, setAuthUserId] = useState<string>('');
  const [isEnsuringAuth, setIsEnsuringAuth] = useState(true);

  const { room, isLoading, error, createRoom, joinRoom, leaveRoom } = useCallRoom();
  const {
    stream: preloadedStream,
    isReady: isCameraReady,
    isLoading: isCameraLoading,
    preload: preloadCamera,
    release: releaseCamera,
  } = useCameraPreload();

  const handleGestureReceived = useCallback((message: GestureMessage) => {
    setReceivedGestures((prev) => [...prev, message]);
  }, []);

  const handleTextReceived = useCallback((text: string) => {
    setReceivedText((prev) => [...prev, text]);
  }, []);

  const { callState, isRemoteConnected, startCall, joinCall, endCall, sendGesture, sendText, participantId } =
    useWebRTC({
      roomId: room?.id || '',
      userId: authUserId,
      onGestureReceived: handleGestureReceived,
      onTextReceived: handleTextReceived,
    });

  const requireAuthUserId = useCallback(async () => {
    if (authUserId) return authUserId;

    setIsEnsuringAuth(true);
    const authenticatedUser = await ensureAuthenticated();
    setIsEnsuringAuth(false);

    if (!authenticatedUser?.id) return '';
    setAuthUserId(authenticatedUser.id);
    return authenticatedUser.id;
  }, [authUserId, ensureAuthenticated]);

  // Ensure user is authenticated when entering the call flow
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsEnsuringAuth(true);
      const authenticatedUser = await ensureAuthenticated();
      if (!cancelled) {
        if (authenticatedUser?.id) setAuthUserId(authenticatedUser.id);
        setIsEnsuringAuth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureAuthenticated]);

  // Handle role selection
  const handleSelectRole = async (selectedRole: UserRole) => {
    const uid = await requireAuthUserId();
    if (!uid) {
      toast.error('Failed to authenticate. Please try again.');
      return;
    }

    setRole(selectedRole);
    setPhase('lobby');
  };

  // Handle create room
  const handleCreateRoom = async () => {
    const uid = await requireAuthUserId();
    if (!uid) {
      toast.error('Authentication required');
      return;
    }

    const result = await createRoom(uid);
    if (!result) {
      toast.error(error || 'Failed to create room');
    }
  };

  // Handle join room
  const handleJoinRoom = async (code: string) => {
    const uid = await requireAuthUserId();
    if (!uid) {
      toast.error('Authentication required');
      return;
    }

    const joinedRoom = await joinRoom(code, uid);
    if (!joinedRoom) {
      toast.error(error || 'Failed to join room');
    }
  };

  // Handle start call - optimized for instant start
  const handleStartCall = async () => {
    const startTime = performance.now();
    
    try {
      const uid = await requireAuthUserId();
      if (!uid) {
        toast.error('Authentication required');
        return;
      }

      if (!room?.id) {
        toast.error('Room not ready. Please try again.');
        return;
      }

      console.log('[VideoCall] Starting call (fast path)...');

      // Transition to call UI immediately
      setPhase('in-call');

      // Use preloaded stream if available, otherwise request new one
      let stream = preloadedStream;

      if (!stream) {
        console.log('[VideoCall] No preloaded stream, requesting media...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } else {
        console.log('[VideoCall] Using preloaded stream!');
      }

      // Start WebRTC immediately based on role
      if (room.created_by === uid) {
        await startCall(stream);
      } else {
        await joinCall(stream);
      }

      const elapsed = performance.now() - startTime;
      console.log(`[VideoCall] Call initiated in ${elapsed.toFixed(0)}ms`);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Failed to access camera or microphone');
      setPhase('lobby');
    }
  };

  // Handle end call
  const handleEndCall = async () => {
    endCall();

    const uid = authUserId;
    if (uid) {
      leaveRoom(uid);
    }

    releaseCamera(); // Release preloaded camera
    setPhase('role-selection');
    setRole(null);
    setReceivedGestures([]);
    setReceivedText([]);
    navigate('/call');
  };

  // Handle back navigation
  const handleBack = () => {
    if (phase === 'lobby') {
      if (authUserId) {
        leaveRoom(authUserId);
      }
      setPhase('role-selection');
      setRole(null);
    }
  };

  // Handle send gesture
  const handleSendGesture = useCallback(
    (message: GestureMessage) => {
      sendGesture(message);
    },
    [sendGesture]
  );

  // Handle send text
  const handleSendText = useCallback(
    (text: string) => {
      sendText(text);
    },
    [sendText]
  );

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.remove('light');
  }, []);

  // Show loading while authenticating
  if (isAuthLoading || isEnsuringAuth) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Preparing secure connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10">
        {phase === 'role-selection' && <RoleSelection onSelectRole={handleSelectRole} />}

        {phase === 'lobby' && role && (
          <RoomLobby
            role={role}
            room={room}
            isLoading={isLoading}
            error={error}
            onBack={handleBack}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartCall={handleStartCall}
            cameraStream={preloadedStream}
            isCameraReady={isCameraReady}
            isCameraLoading={isCameraLoading}
            onPreloadCamera={preloadCamera}
          />
        )}

        {phase === 'in-call' && room && role && (
          <CallInterface
            role={role}
            room={room}
            callState={callState}
            isRemoteConnected={isRemoteConnected}
            onEndCall={handleEndCall}
            onSendGesture={handleSendGesture}
            onSendText={handleSendText}
            receivedGestures={receivedGestures}
            receivedText={receivedText}
          />
        )}
      </div>
    </div>
  );
}
