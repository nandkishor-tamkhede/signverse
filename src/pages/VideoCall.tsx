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

  const { user, isLoading: isAuthLoading, ensureAuthenticated } = useAnonymousAuth();
  const { room, isLoading, error, createRoom, joinRoom, leaveRoom } = useCallRoom();
  const { 
    stream: preloadedStream, 
    isReady: isCameraReady, 
    isLoading: isCameraLoading, 
    preload: preloadCamera,
    release: releaseCamera 
  } = useCameraPreload();

  const handleGestureReceived = useCallback((message: GestureMessage) => {
    setReceivedGestures(prev => [...prev, message]);
  }, []);

  const handleTextReceived = useCallback((text: string) => {
    setReceivedText(prev => [...prev, text]);
  }, []);

  const {
    callState,
    isRemoteConnected,
    startCall,
    joinCall,
    endCall,
    sendGesture,
    sendText,
    participantId,
  } = useWebRTC({
    roomId: room?.id || '',
    userId: user?.id || '',
    onGestureReceived: handleGestureReceived,
    onTextReceived: handleTextReceived,
  });

  // Ensure user is authenticated when entering the call flow
  useEffect(() => {
    ensureAuthenticated();
  }, [ensureAuthenticated]);

  // Handle role selection
  const handleSelectRole = async (selectedRole: UserRole) => {
    // Ensure authenticated before proceeding
    const authenticatedUser = await ensureAuthenticated();
    if (!authenticatedUser) {
      toast.error('Failed to authenticate. Please try again.');
      return;
    }
    setRole(selectedRole);
    setPhase('lobby');
  };

  // Handle create room
  const handleCreateRoom = async () => {
    if (!user?.id) {
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        toast.error('Authentication required');
        return;
      }
    }
    const result = await createRoom(user?.id || '');
    if (!result) {
      toast.error(error || 'Failed to create room');
    }
  };

  // Handle join room
  const handleJoinRoom = async (code: string) => {
    if (!user?.id) {
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        toast.error('Authentication required');
        return;
      }
    }
    const joinedRoom = await joinRoom(code, user?.id || '');
    if (!joinedRoom) {
      toast.error(error || 'Failed to join room');
    }
  };

  // Handle start call - use preloaded stream if available for instant start
  const handleStartCall = async () => {
    try {
      const startTime = performance.now();
      console.log('[VideoCall] Starting call...');

      // Use preloaded stream if available, otherwise request new one
      let stream = preloadedStream;
      
      if (!stream) {
        console.log('[VideoCall] No preloaded stream, requesting media...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } else {
        console.log('[VideoCall] Using preloaded stream for instant start!');
      }

      // Host (room creator) is the offerer. Joiner must NOT create an offer (prevents glare).
      if (room?.created_by === user?.id) {
        await startCall(stream);
      } else {
        await joinCall(stream);
      }

      const elapsed = performance.now() - startTime;
      console.log(`[VideoCall] Call started in ${elapsed.toFixed(0)}ms`);

      setPhase('in-call');
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Failed to access camera or microphone');
    }
  };

  // Handle end call
  const handleEndCall = () => {
    endCall();
    leaveRoom(user?.id);
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
      leaveRoom(user?.id);
      setPhase('role-selection');
      setRole(null);
    }
  };

  // Handle send gesture
  const handleSendGesture = useCallback((message: GestureMessage) => {
    sendGesture(message);
  }, [sendGesture]);

  // Handle send text
  const handleSendText = useCallback((text: string) => {
    sendText(text);
  }, [sendText]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.remove('light');
  }, []);

  // Show loading while authenticating
  if (isAuthLoading) {
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
        {phase === 'role-selection' && (
          <RoleSelection onSelectRole={handleSelectRole} />
        )}

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
