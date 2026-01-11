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
  Subtitles,
  Hand,
  Loader2,
  Maximize,
  Minimize,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  User,
  Sparkles,
  Settings,
  MoreVertical
} from 'lucide-react';
import { UserRole, CallRoom, CallState, GestureMessage } from '@/types/call';
import { Button } from '@/components/ui/button';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { GestureClassificationResult, Language } from '@/types/gesture';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

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
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [signDetectionEnabled, setSignDetectionEnabled] = useState(true);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  const lastGestureRef = useRef<string | null>(null);
  const gestureStableCountRef = useRef(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const STABILITY_THRESHOLD = 5;

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  // Speech synthesis for listener role
  const { speak, isSpeaking } = useSpeechSynthesis({
    language: 'en' as Language,
    rate: 1,
    isMuted: isSpeakerMuted || role === 'signer' || !aiVoiceEnabled,
  });

  // Handle gesture detection (for signer role)
  const handleGestureDetected = useCallback((result: GestureClassificationResult) => {
    if (role !== 'signer' || !result.gesture || !signDetectionEnabled) {
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);

    if (result.gesture.name === lastGestureRef.current) {
      gestureStableCountRef.current++;
    } else {
      gestureStableCountRef.current = 1;
      lastGestureRef.current = result.gesture.name;
    }

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
  }, [role, onSendGesture, signDetectionEnabled]);

  // MediaPipe for signer
  const { videoRef: gestureVideoRef, canvasRef, isLoading: isMediaPipeLoading } = useMediaPipeHands({
    onGestureDetected: handleGestureDetected,
    isActive: role === 'signer' && callState.status === 'connected' && signDetectionEnabled,
  });

  // Speak received gestures (for listener role)
  useEffect(() => {
    if (role === 'listener' && receivedGestures.length > 0 && aiVoiceEnabled) {
      const latestGesture = receivedGestures[receivedGestures.length - 1];
      setCurrentSubtitle(latestGesture.text);
      speak(latestGesture.text, latestGesture.hindiText);
      
      const timeout = setTimeout(() => setCurrentSubtitle(''), 4000);
      return () => clearTimeout(timeout);
    }
  }, [receivedGestures, role, speak, aiVoiceEnabled]);

  // Attach local stream to video elements
  useEffect(() => {
    if (!callState.localStream) return;
    
    console.log('[CallInterface] Attaching local stream, tracks:', callState.localStream.getTracks().length);
    
    // For listener role, attach to localVideoRef
    if (role !== 'signer' && localVideoRef.current) {
      localVideoRef.current.srcObject = callState.localStream;
      localVideoRef.current.play().catch(err => {
        console.warn('[CallInterface] Local video play failed:', err);
      });
    }
    
    // For signer role, attach to gestureVideoRef
    if (role === 'signer' && gestureVideoRef.current) {
      gestureVideoRef.current.srcObject = callState.localStream;
      gestureVideoRef.current.play().catch(err => {
        console.warn('[CallInterface] Gesture video play failed:', err);
      });
    }
  }, [callState.localStream, role, gestureVideoRef]);

  // Attach remote stream to video element
  useEffect(() => {
    if (!callState.remoteStream || !remoteVideoRef.current) return;
    
    console.log('[CallInterface] Attaching remote stream, tracks:', callState.remoteStream.getTracks().length);
    
    remoteVideoRef.current.srcObject = callState.remoteStream;
    remoteVideoRef.current.play().catch(err => {
      console.warn('[CallInterface] Remote video play failed:', err);
    });
  }, [callState.remoteStream]);

  // Toggle handlers
  const toggleMute = () => {
    if (callState.localStream) {
      callState.localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (callState.localStream) {
      callState.localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Connection status
  const connectionStatus =
    callState.status === 'error'
      ? 'error'
      : isRemoteConnected
        ? 'connected'
        : callState.status === 'connecting'
          ? 'connecting'
          : 'waiting';

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background flex flex-col relative overflow-hidden"
    >
      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0 bg-card">
          {callState.remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md px-4"
              >
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <User className="w-16 h-16 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  {connectionStatus === 'connecting' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-lg">Connecting...</span>
                    </>
                  ) : connectionStatus === 'error' ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-lg text-destructive">Connection failed</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-lg">Waiting for participant...</span>
                    </>
                  )}
                </div>
                
                {connectionStatus === 'connecting' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Establishing peer-to-peer connection...
                    </p>
                  </div>
                )}
                
                {connectionStatus === 'error' && callState.error ? (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
                    <p className="text-destructive text-sm">{callState.error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEndCall}
                      className="mt-3"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg px-4 py-2 inline-block">
                    <p className="text-muted-foreground text-sm">
                      Room: <span className="font-mono font-bold">{room.room_code}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Remote participant label */}
          {callState.remoteStream && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium">
                  {role === 'signer' ? 'Listener' : 'Sign Language User'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Subtitles Overlay */}
        <AnimatePresence>
          {showSubtitles && currentSubtitle && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-32 left-0 right-0 flex justify-center px-4 pointer-events-none z-20"
            >
              <div className="bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl max-w-2xl">
                <p className="text-xl font-medium text-center">{currentSubtitle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Speaking Indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 right-4 z-20"
            >
              <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">AI Speaking</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 h-3 bg-primary-foreground rounded-full"
                      animate={{ scaleY: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local Video (PiP) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-28 right-4 w-48 md:w-64 aspect-video rounded-xl overflow-hidden shadow-2xl border-2 border-border z-10"
          drag
          dragMomentum={false}
          dragConstraints={containerRef}
        >
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
              {/* Sign detection status overlay */}
              {signDetectionEnabled && (
                <div className="absolute top-2 right-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    isTranslating 
                      ? 'bg-green-500 text-white' 
                      : isDetecting 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-black/50 text-white'
                  }`}>
                    <Hand className="w-3 h-3" />
                    {isTranslating ? 'Sending' : isDetecting ? 'Detected' : 'Ready'}
                  </div>
                </div>
              )}
              {isMediaPipeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center">
                    <Hand className="w-8 h-8 text-primary animate-pulse mx-auto mb-1" />
                    <p className="text-xs">Loading AI...</p>
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

          {/* Self label */}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs">
            You
          </div>

          {/* Muted indicator */}
          {isMuted && (
            <div className="absolute bottom-2 right-2 bg-destructive p-1 rounded-full">
              <MicOff className="w-3 h-3" />
            </div>
          )}

          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Camera off</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Conversation History Pills */}
        {receivedGestures.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 max-h-[60%] overflow-y-auto"
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 space-y-2 max-w-xs">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Conversation</p>
              {receivedGestures.slice(-8).map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm"
                >
                  {g.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-30"
          >
            <div className="bg-gradient-to-b from-black/60 to-transparent p-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Left: Room info */}
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/70" />
                    <span className="font-mono text-white">{formatDuration(callDuration)}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    isRemoteConnected 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {isRemoteConnected ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4 animate-pulse" />
                    )}
                    <span className="text-sm font-medium">
                      {isRemoteConnected ? 'Connected' : 'Connecting'}
                    </span>
                  </div>
                </div>

                {/* Center: Room code */}
                <div className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-lg">
                  <span className="text-white/70 text-sm">Room: </span>
                  <span className="font-mono font-bold text-white">{room.room_code}</span>
                </div>

                {/* Right: Settings */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <Settings className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-semibold">Accessibility Settings</p>
                      </div>
                      <DropdownMenuSeparator />
                      {role === 'signer' && (
                        <div className="flex items-center justify-between px-2 py-2">
                          <div className="flex items-center gap-2">
                            <Hand className="w-4 h-4" />
                            <span className="text-sm">Sign Detection</span>
                          </div>
                          <Switch
                            checked={signDetectionEnabled}
                            onCheckedChange={setSignDetectionEnabled}
                          />
                        </div>
                      )}
                      {role === 'listener' && (
                        <>
                          <div className="flex items-center justify-between px-2 py-2">
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4" />
                              <span className="text-sm">AI Voice</span>
                            </div>
                            <Switch
                              checked={aiVoiceEnabled}
                              onCheckedChange={setAiVoiceEnabled}
                            />
                          </div>
                          <div className="flex items-center justify-between px-2 py-2">
                            <div className="flex items-center gap-2">
                              <Subtitles className="w-4 h-4" />
                              <span className="text-sm">Subtitles</span>
                            </div>
                            <Switch
                              checked={showSubtitles}
                              onCheckedChange={setShowSubtitles}
                            />
                          </div>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Control Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30"
          >
            <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-12 pb-6 px-4">
              <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto">
                {/* Mute Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMuted ? 'destructive' : 'secondary'}
                      size="icon"
                      className={`w-14 h-14 rounded-full transition-all duration-200 ${
                        isMuted 
                          ? 'bg-destructive hover:bg-destructive/90' 
                          : 'bg-white/10 hover:bg-white/20 text-white border-0'
                      }`}
                      onClick={toggleMute}
                    >
                      {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
                </Tooltip>

                {/* Video Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isVideoOff ? 'destructive' : 'secondary'}
                      size="icon"
                      className={`w-14 h-14 rounded-full transition-all duration-200 ${
                        isVideoOff 
                          ? 'bg-destructive hover:bg-destructive/90' 
                          : 'bg-white/10 hover:bg-white/20 text-white border-0'
                      }`}
                      onClick={toggleVideo}
                    >
                      {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isVideoOff ? 'Turn on camera' : 'Turn off camera'}</TooltipContent>
                </Tooltip>

                {/* Speaker (Listener only) */}
                {role === 'listener' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isSpeakerMuted ? 'destructive' : 'secondary'}
                        size="icon"
                        className={`w-14 h-14 rounded-full transition-all duration-200 ${
                          isSpeakerMuted 
                            ? 'bg-destructive hover:bg-destructive/90' 
                            : 'bg-white/10 hover:bg-white/20 text-white border-0'
                        }`}
                        onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                      >
                        {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}</TooltipContent>
                  </Tooltip>
                )}

                {/* Subtitles (Listener only) */}
                {role === 'listener' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className={`w-14 h-14 rounded-full transition-all duration-200 ${
                          showSubtitles 
                            ? 'bg-primary/20 text-primary border-primary/50' 
                            : 'bg-white/10 hover:bg-white/20 text-white border-0'
                        }`}
                        onClick={() => setShowSubtitles(!showSubtitles)}
                      >
                        <Subtitles className="w-6 h-6" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{showSubtitles ? 'Hide subtitles' : 'Show subtitles'}</TooltipContent>
                  </Tooltip>
                )}

                {/* End Call Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="w-16 h-14 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200"
                      onClick={onEndCall}
                    >
                      <PhoneOff className="w-6 h-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>End call</TooltipContent>
                </Tooltip>

                {/* Fullscreen Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 transition-all duration-200"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
                </Tooltip>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 transition-all duration-200"
                    >
                      <MoreVertical className="w-6 h-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Switch camera
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
