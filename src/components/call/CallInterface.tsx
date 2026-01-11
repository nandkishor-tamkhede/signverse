import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Hand,
  Loader2
} from 'lucide-react';
import { UserRole, CallRoom, CallState, GestureMessage } from '@/types/call';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { GestureDefinition, GestureClassificationResult, Language } from '@/types/gesture';

interface CallInterfaceProps {
  role: UserRole;
  room: CallRoom;
  callState: CallState;
  isRemoteConnected: boolean;
  onEndCall: () => void;
  onSendGesture: (message: GestureMessage) => void;
  onSendText: (text: string) => void;
  receivedGestures: GestureMessage[];
  receivedText: string[];
}

export function CallInterface({
  role,
  room,
  callState,
  isRemoteConnected,
  onEndCall,
  onSendGesture,
  receivedGestures,
  receivedText,
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const lastGestureRef = useRef<string | null>(null);
  const gestureStableCountRef = useRef(0);
  const STABILITY_THRESHOLD = 5;

  // Speech synthesis for listener role
  const { speak, isSpeaking } = useSpeechSynthesis({
    language: 'en' as Language,
    rate: 1,
    isMuted: isSpeakerMuted || role === 'signer',
  });

  // Handle gesture detection (for signer role)
  const handleGestureDetected = useCallback((result: GestureClassificationResult) => {
    if (role !== 'signer' || !result.gesture) {
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);

    // Stability check
    if (result.gesture.name === lastGestureRef.current) {
      gestureStableCountRef.current++;
    } else {
      gestureStableCountRef.current = 1;
      lastGestureRef.current = result.gesture.name;
    }

    // Only send after stable detection
    if (gestureStableCountRef.current === STABILITY_THRESHOLD) {
      setIsTranslating(true);
      
      const message: GestureMessage = {
        gesture: result.gesture.name,
        text: result.gesture.englishText,
        hindiText: result.gesture.hindiText,
        confidence: result.confidence,
        timestamp: Date.now(),
      };

      onSendGesture(message);
      
      setTimeout(() => setIsTranslating(false), 500);
    }
  }, [role, onSendGesture]);

  // MediaPipe for signer
  const { videoRef: gestureVideoRef, canvasRef, isLoading: isMediaPipeLoading } = useMediaPipeHands({
    onGestureDetected: handleGestureDetected,
    isActive: role === 'signer' && callState.status === 'connected',
  });

  // Speak received gestures (for listener role)
  useEffect(() => {
    if (role === 'listener' && receivedGestures.length > 0) {
      const latestGesture = receivedGestures[receivedGestures.length - 1];
      setCurrentSubtitle(latestGesture.text);
      speak(latestGesture.text, latestGesture.hindiText);
      
      // Clear subtitle after 3 seconds
      const timeout = setTimeout(() => setCurrentSubtitle(''), 3000);
      return () => clearTimeout(timeout);
    }
  }, [receivedGestures, role, speak]);

  // Attach local stream to video
  useEffect(() => {
    if (callState.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState.localStream]);

  // Attach remote stream to video
  useEffect(() => {
    if (callState.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  // For signer, use gesture video ref
  useEffect(() => {
    if (role === 'signer' && callState.localStream && gestureVideoRef.current) {
      gestureVideoRef.current.srcObject = callState.localStream;
    }
  }, [role, callState.localStream, gestureVideoRef]);

  // Toggle mute
  const toggleMute = () => {
    if (callState.localStream) {
      callState.localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (callState.localStream) {
      callState.localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const StatusIndicator = ({ active, label }: { active: boolean; label: string }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
      active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
    }`}>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
      {label}
    </div>
  );

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <GlassCard className="px-4 py-2">
            <span className="text-sm text-muted-foreground">Room: </span>
            <span className="font-mono font-bold">{room.room_code}</span>
          </GlassCard>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            isRemoteConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRemoteConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
            }`} />
            {isRemoteConnected ? 'Connected' : 'Waiting for other participant...'}
          </div>
        </div>

        {/* Status indicators for signer */}
        {role === 'signer' && (
          <div className="flex items-center gap-2">
            <StatusIndicator active={isDetecting} label="Detecting" />
            <StatusIndicator active={isTranslating} label="Translating" />
          </div>
        )}

        {/* Status indicators for listener */}
        {role === 'listener' && (
          <div className="flex items-center gap-2">
            <StatusIndicator active={isSpeaking} label="AI Speaking" />
          </div>
        )}
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid md:grid-cols-2 gap-4 mb-4">
        {/* Remote Video (Main) */}
        <GlassCard className="relative overflow-hidden aspect-video md:aspect-auto">
          {callState.remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Waiting for {role === 'signer' ? 'listener' : 'signer'} to connect...</p>
              </div>
            </div>
          )}

          {/* Subtitles overlay */}
          {role === 'listener' && showSubtitles && (
            <AnimatePresence>
              {currentSubtitle && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute bottom-4 left-4 right-4"
                >
                  <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-center text-lg">
                    {currentSubtitle}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </GlassCard>

        {/* Local Video (Self) */}
        <GlassCard className="relative overflow-hidden aspect-video md:aspect-auto">
          {role === 'signer' ? (
            <>
              <video
                ref={gestureVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
              />
              {isMediaPipeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Hand className="w-12 h-12 text-primary animate-pulse mx-auto mb-2" />
                    <p className="text-sm">Loading gesture detection...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}

          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-xs">
            You ({role === 'signer' ? 'Signer' : 'Listener'})
          </div>

          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <VideoOff className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </GlassCard>
      </div>

      {/* Gesture/Text History */}
      {receivedGestures.length > 0 && (
        <GlassCard className="mb-4 p-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversation
          </h3>
          <div className="flex flex-wrap gap-2">
            {receivedGestures.slice(-10).map((g, i) => (
              <span key={i} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                {g.text}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Controls */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? 'destructive' : 'secondary'}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {role === 'listener' && (
            <Button
              variant={isSpeakerMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            >
              {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </Button>
          )}

          {role === 'listener' && (
            <Button
              variant={showSubtitles ? 'secondary' : 'ghost'}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setShowSubtitles(!showSubtitles)}
            >
              <MessageSquare className="w-6 h-6" />
            </Button>
          )}

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={onEndCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
