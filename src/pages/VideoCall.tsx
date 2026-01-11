import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { RoleSelection } from '@/components/call/RoleSelection';
import { RoomLobby } from '@/components/call/RoomLobby';
import { CallInterface } from '@/components/call/CallInterface';
import { useCallRoom } from '@/hooks/useCallRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { UserRole, GestureMessage } from '@/types/call';
import { toast } from 'sonner';

type CallPhase = 'role-selection' | 'lobby' | 'in-call';

export default function VideoCall() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<CallPhase>('role-selection');
  const [role, setRole] = useState<UserRole | null>(null);
  const [receivedGestures, setReceivedGestures] = useState<GestureMessage[]>([]);
  const [receivedText, setReceivedText] = useState<string[]>([]);

  const { room, isLoading, error, createRoom, joinRoom, leaveRoom } = useCallRoom();

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
    onGestureReceived: handleGestureReceived,
    onTextReceived: handleTextReceived,
  });

  // Handle role selection
  const handleSelectRole = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setPhase('lobby');
  };

  // Handle create room
  const handleCreateRoom = async () => {
    await createRoom(participantId);
  };

  // Handle join room
  const handleJoinRoom = async (code: string) => {
    const joinedRoom = await joinRoom(code);
    if (!joinedRoom) {
      toast.error('Failed to join room');
    }
  };

  // Handle start call
  const handleStartCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Check if this is the first participant (creator) or second (joiner)
      if (room?.created_by === participantId) {
        await startCall(stream);
      } else {
        await joinCall(stream);
        // Wait a bit then send offer request
        setTimeout(async () => {
          await startCall(stream);
        }, 1000);
      }

      setPhase('in-call');
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Failed to access camera or microphone');
    }
  };

  // Handle end call
  const handleEndCall = () => {
    endCall();
    leaveRoom();
    setPhase('role-selection');
    setRole(null);
    setReceivedGestures([]);
    setReceivedText([]);
    navigate('/call');
  };

  // Handle back navigation
  const handleBack = () => {
    if (phase === 'lobby') {
      leaveRoom();
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
