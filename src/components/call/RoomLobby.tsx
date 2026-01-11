import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, ArrowLeft, Users, Plus, LogIn } from 'lucide-react';
import { UserRole, CallRoom } from '@/types/call';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface RoomLobbyProps {
  role: UserRole;
  room: CallRoom | null;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onCreateRoom: () => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onStartCall: () => void;
}

export function RoomLobby({
  role,
  room,
  isLoading,
  error,
  onBack,
  onCreateRoom,
  onJoinRoom,
  onStartCall,
}: RoomLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');

  const copyRoomCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.room_code);
      toast.success('Room code copied to clipboard!');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      await onJoinRoom(roomCode.trim());
    }
  };

  if (room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <GlassCard className="p-8">
            <div className="text-center space-y-6">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto">
                <Users className="w-12 h-12 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold">Room Ready!</h2>
              
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Share this code with the other person</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-4xl font-mono font-bold tracking-wider gradient-text">
                    {room.room_code}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyRoomCode}
                    className="shrink-0"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Your role: <span className="font-medium text-foreground">
                  {role === 'signer' ? 'Sign Language User' : 'AI Voice Listener'}
                </span>
              </div>

              <Button
                onClick={onStartCall}
                className="w-full h-12 text-lg"
                size="lg"
              >
                Start Call
              </Button>

              <Button
                variant="ghost"
                onClick={onBack}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <GlassCard className="p-8">
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={onBack}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Role
              </Button>

              <h2 className="text-2xl font-bold text-center">
                {role === 'signer' ? 'Sign Language User' : 'AI Voice Listener'}
              </h2>

              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setMode('create');
                    onCreateRoom();
                  }}
                  className="w-full h-14 text-lg"
                  disabled={isLoading}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Room
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setMode('join')}
                  className="w-full h-14 text-lg"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Existing Room
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <GlassCard className="p-8">
            <form onSubmit={handleJoinSubmit} className="space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('select')}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <h2 className="text-2xl font-bold text-center">Join Room</h2>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Enter the 6-character room code
                </label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  className="text-center text-2xl font-mono tracking-wider h-14"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12"
                disabled={isLoading || roomCode.length !== 6}
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </Button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Creating room - show loading
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Creating room...</p>
      </motion.div>
    </div>
  );
}
