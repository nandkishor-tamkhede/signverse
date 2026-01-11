import { motion, AnimatePresence } from 'framer-motion';
import { RefObject, useCallback, useEffect, useState } from 'react';
import { 
  X, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle, 
  Lightbulb,
  Camera,
  Sparkles,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GestureDefinition } from '@/types/gesture';
import { GestureClassificationResult } from '@/types/gesture';
import { LearningCategory, getGestureTips, generateEncouragement } from '@/lib/learningCategories';
import { cn } from '@/lib/utils';

interface BeginnerPracticeModeProps {
  gesture: GestureDefinition;
  category: LearningCategory;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  isActive: boolean;
  isLoading: boolean;
  detectedGesture: GestureClassificationResult | null;
  onClose: () => void;
  onComplete: (accuracy: number, passed: boolean) => void;
  onToggleCamera: () => void;
  requiredAccuracy?: number;
}

type PracticeState = 'ready' | 'countdown' | 'detecting' | 'success' | 'encourage';

export function BeginnerPracticeMode({
  gesture,
  category,
  videoRef,
  canvasRef,
  isActive,
  isLoading,
  detectedGesture,
  onClose,
  onComplete,
  onToggleCamera,
  requiredAccuracy = 50, // Lower threshold for beginners
}: BeginnerPracticeModeProps) {
  const [state, setState] = useState<PracticeState>('ready');
  const [countdown, setCountdown] = useState(3);
  const [accuracy, setAccuracy] = useState(0);
  const [feedback, setFeedback] = useState<ReturnType<typeof generateEncouragement> | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const [successfulDetections, setSuccessfulDetections] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const tips = getGestureTips(gesture);

  // Start practice
  const startPractice = useCallback(() => {
    if (!isActive) {
      onToggleCamera();
    }
    setState('countdown');
    setCountdown(3);
    setAccuracy(0);
    setDetectionCount(0);
    setSuccessfulDetections(0);
  }, [isActive, onToggleCamera]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'countdown') return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setState('detecting');
    }
  }, [state, countdown]);

  // Detection logic - more forgiving for beginners
  useEffect(() => {
    if (state !== 'detecting') return;

    const checkGesture = () => {
      setDetectionCount(prev => prev + 1);

      if (detectedGesture?.gesture) {
        const isMatch = 
          detectedGesture.gesture.name === gesture.name ||
          detectedGesture.gesture.englishText.toLowerCase() === gesture.englishText.toLowerCase();
        
        if (isMatch) {
          setSuccessfulDetections(prev => prev + 1);
          setAccuracy(Math.max(accuracy, detectedGesture.confidence * 100));
        }
      }
    };

    const interval = setInterval(checkGesture, 250);

    // Shorter detection time for beginners (4 seconds)
    const timeout = setTimeout(() => {
      clearInterval(interval);
      evaluatePerformance();
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state, detectedGesture, gesture, accuracy]);

  const evaluatePerformance = () => {
    const detectionRate = detectionCount > 0 ? (successfulDetections / detectionCount) * 100 : 0;
    const finalAccuracy = Math.min(100, Math.max(0, (detectionRate + accuracy) / 2));
    
    setAccuracy(finalAccuracy);
    setFeedback(generateEncouragement(finalAccuracy));
    setAttempts(prev => prev + 1);
    
    // More forgiving - even 40% is considered a "success" for learning
    const passed = finalAccuracy >= requiredAccuracy;
    setState(passed ? 'success' : 'encourage');
    onComplete(finalAccuracy, passed);
  };

  const handleRetry = () => {
    setState('ready');
    setFeedback(null);
    setTimeout(() => startPractice(), 100);
  };

  const handleNext = () => {
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl overflow-y-auto"
    >
      <div className="container mx-auto px-4 py-6 max-w-5xl min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{gesture.emoji}</span>
            <div>
              <h2 className="text-2xl font-bold">Practice: {gesture.englishText}</h2>
              <p className="text-muted-foreground">Try copying this gesture</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Reference */}
          <div className="space-y-6">
            {/* Sign to copy */}
            <div className={cn(
              'rounded-3xl p-8 text-center',
              'bg-gradient-to-br border-2 border-border/30',
              category.bgGradient
            )}>
              <p className="text-sm text-muted-foreground mb-4 uppercase tracking-wider">
                Copy this sign
              </p>
              <span className="text-[100px] block mb-4 drop-shadow-xl">
                {gesture.emoji}
              </span>
              <h3 className="text-3xl font-bold mb-2">{gesture.englishText}</h3>
              <p className="text-lg text-muted-foreground">{gesture.hindiText}</p>
            </div>

            {/* Tips - simplified for beginners */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                <h4 className="text-lg font-semibold">Helpful tips</h4>
              </div>
              <ul className="space-y-3">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Camera & Practice */}
          <div className="space-y-6">
            {/* Camera view */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-card border-2 border-border/30">
              <video
                ref={videoRef}
                className={cn(
                  'w-full h-full object-cover',
                  (!isActive || state === 'ready') && 'opacity-0'
                )}
                playsInline
                muted
                autoPlay
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover',
                  (!isActive || isLoading || state === 'ready') && 'opacity-0'
                )}
              />

              {/* Overlay states */}
              <AnimatePresence mode="wait">
                {state === 'ready' && (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-sm"
                  >
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground mb-6">Ready when you are!</p>
                    <Button onClick={startPractice} size="lg" className="gap-2 h-14 px-8 text-lg rounded-2xl">
                      Start Camera
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                    <p className="text-sm text-muted-foreground mt-4">
                      Take your time - you can try as many times as you want!
                    </p>
                  </motion.div>
                )}

                {state === 'countdown' && (
                  <motion.div
                    key="countdown"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
                  >
                    <p className="text-muted-foreground mb-4">Get ready to show the sign...</p>
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-[120px] font-bold text-primary leading-none"
                    >
                      {countdown}
                    </motion.div>
                  </motion.div>
                )}

                {state === 'detecting' && (
                  <motion.div
                    key="detecting"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-4 right-4"
                  >
                    <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="font-medium">Looking for your sign...</span>
                        </div>
                        <span className="text-xl font-bold text-primary">{Math.round(accuracy)}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full"
                          animate={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 text-center">
                        Hold your hand steady - you're doing great!
                      </p>
                    </div>
                  </motion.div>
                )}

                {(state === 'success' || state === 'encourage') && feedback && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm"
                  >
                    <div className="text-center p-8 max-w-md">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="text-7xl mb-4"
                      >
                        {feedback.emoji}
                      </motion.div>
                      
                      <h3 className="text-3xl font-bold mb-2">{feedback.title}</h3>
                      <p className="text-xl text-primary mb-3">{feedback.message}</p>
                      <p className="text-muted-foreground mb-6">{feedback.suggestion}</p>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          variant="outline" 
                          onClick={handleRetry} 
                          className="gap-2 h-12"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Try Again
                        </Button>
                        <Button 
                          onClick={handleNext} 
                          className="gap-2 h-12 bg-gradient-to-r from-primary to-green-500"
                        >
                          {state === 'success' ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Continue
                            </>
                          ) : (
                            <>
                              <Heart className="w-4 h-4" />
                              Keep Learning
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Encouraging message for non-perfect scores */}
                      {state === 'encourage' && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          Remember: Every expert was once a beginner!
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info box */}
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attempts this session</p>
                <p className="text-2xl font-bold">{attempts}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">No pressure!</p>
                <p className="text-sm text-primary">Learn at your own pace</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
