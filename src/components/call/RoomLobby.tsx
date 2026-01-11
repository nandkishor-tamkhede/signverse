import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ArrowLeft, Users, Plus, LogIn, Check, Video, Camera, Loader2, ShieldAlert, MonitorX, Lock, AlertTriangle, CameraOff, RefreshCw } from 'lucide-react';
import { UserRole, CallRoom } from '@/types/call';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MediaPermissionState, MediaError } from '@/hooks/useMediaPermission';

interface RoomLobbyProps {
  role: UserRole;
  room: CallRoom | null;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onCreateRoom: () => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onStartCall: () => void;
  // Camera preloading props
  cameraStream?: MediaStream | null;
  isCameraReady?: boolean;
  isCameraLoading?: boolean;
  cameraError?: MediaError | null;
  cameraPermissionState?: MediaPermissionState;
  onPreloadCamera?: () => void;
}

const getErrorIcon = (permissionState?: MediaPermissionState) => {
  switch (permissionState) {
    case 'denied':
      return <ShieldAlert className="w-8 h-8 text-destructive" />;
    case 'not-found':
      return <MonitorX className="w-8 h-8 text-destructive" />;
    case 'insecure':
      return <Lock className="w-8 h-8 text-destructive" />;
    case 'unsupported':
      return <AlertTriangle className="w-8 h-8 text-destructive" />;
    case 'in-use':
      return <CameraOff className="w-8 h-8 text-destructive" />;
    default:
      return <CameraOff className="w-8 h-8 text-destructive" />;
  }
};

export function RoomLobby({
  role,
  room,
  isLoading,
  error,
  onBack,
  onCreateRoom,
  onJoinRoom,
  onStartCall,
  cameraStream,
  isCameraReady = false,
  isCameraLoading = false,
  cameraError,
  cameraPermissionState,
  onPreloadCamera,
}: RoomLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [copied, setCopied] = useState(false);

  // Preload camera when entering lobby
  useEffect(() => {
    if (onPreloadCamera && !isCameraReady && !isCameraLoading && !cameraError) {
      console.log('[RoomLobby] Preloading camera...');
      onPreloadCamera();
    }
  }, [onPreloadCamera, isCameraReady, isCameraLoading, cameraError]);

  const copyRoomCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      toast.success('Room code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      await onJoinRoom(roomCode.trim());
    }
  };

  // Room ready state
  if (room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-10">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            
            <div className="text-center space-y-6">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
              >
                <Check className="w-10 h-10 text-green-500" />
              </motion.div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">Room Created!</h2>
                <p className="text-muted-foreground">
                  Share this code with the other person
                </p>
              </div>
              
              {/* Room code */}
              <div className="bg-muted/50 rounded-2xl p-6">
                <p className="text-sm text-muted-foreground mb-2">Room Code</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl md:text-5xl font-mono font-bold tracking-[0.3em] gradient-text">
                    {room.room_code}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyRoomCode}
                    className="shrink-0 rounded-full"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Role badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm">
                <Users className="w-4 h-4" />
                {role === 'signer' ? 'Sign Language User' : 'AI Voice Listener'}
              </div>

              {/* Camera preview (if preloaded) */}
              {cameraStream && (
                <div className="bg-muted/50 rounded-xl overflow-hidden aspect-video mb-4">
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                    ref={(el) => {
                      if (el && cameraStream) {
                        el.srcObject = cameraStream;
                      }
                    }}
                  />
                </div>
              )}

              {/* Camera error state */}
              {cameraError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    {getErrorIcon(cameraPermissionState)}
                    <div className="flex-1">
                      <p className="text-destructive font-medium text-sm mb-2">{cameraError.message}</p>
                      {cameraError.instructions && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {cameraError.instructions.map((instruction, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreloadCamera}
                        className="mt-3"
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera status */}
              {!cameraError && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  {isCameraLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Preparing camera & microphone...</span>
                    </>
                  ) : isCameraReady ? (
                    <>
                      <Camera className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-500">Camera & microphone ready</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Camera will start when you join</span>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={onStartCall}
                  size="lg"
                  className="w-full h-14 text-lg rounded-xl"
                  disabled={isCameraLoading}
                >
                  {isCameraLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 mr-2" />
                      {isCameraReady ? 'Start Video Call' : 'Start Call'}
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Role Selection
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Select mode
  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full"
        >
          <div className="rounded-3xl bg-card border border-border p-8 md:p-10">
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-6 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Role indicator */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm mb-6">
              <Users className="w-4 h-4" />
              {role === 'signer' ? 'Sign Language User' : 'AI Voice Listener'}
            </div>

            <h2 className="text-2xl font-bold mb-2">Join or Create Room</h2>
            <p className="text-muted-foreground mb-8">
              Create a new room or join an existing one with a code.
            </p>

            <div className="space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => {
                    setMode('create');
                    onCreateRoom();
                  }}
                  className="w-full h-16 text-lg rounded-xl justify-start px-6"
                  disabled={isLoading}
                >
                  <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center mr-4">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Create New Room</div>
                    <div className="text-sm opacity-80">Start a new video call</div>
                  </div>
                </Button>
              </motion.div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-card text-muted-foreground text-sm">or</span>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  onClick={() => setMode('join')}
                  className="w-full h-16 text-lg rounded-xl justify-start px-6"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mr-4">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Join with Code</div>
                    <div className="text-sm text-muted-foreground">Enter a room code</div>
                  </div>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Join mode
  if (mode === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full"
        >
          <div className="rounded-3xl bg-card border border-border p-8 md:p-10">
            <form onSubmit={handleJoinSubmit} className="space-y-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('select')}
                className="-ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div>
                <h2 className="text-2xl font-bold mb-2">Join Room</h2>
                <p className="text-muted-foreground">
                  Enter the 6-character code shared by the host
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  className="text-center text-3xl font-mono tracking-[0.3em] h-16 rounded-xl"
                  maxLength={6}
                  autoFocus
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg rounded-xl"
                disabled={isLoading || roomCode.length !== 6}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Creating room - loading state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold mb-2">Creating your room...</h2>
        <p className="text-muted-foreground">This will just take a moment</p>
      </motion.div>
    </div>
  );
}
