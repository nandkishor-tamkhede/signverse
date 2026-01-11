import { motion, AnimatePresence } from 'framer-motion';
import { RefObject, useCallback, useEffect, useState } from 'react';
import { X, RotateCcw, ArrowRight, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonGesture, PracticeState } from '@/types/learning';
import { GestureClassificationResult } from '@/types/gesture';
import { generateFeedback } from '@/lib/learningData';
import { cn } from '@/lib/utils';

interface PracticeModeProps {
  gesture: LessonGesture;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  isActive: boolean;
  isLoading: boolean;
  detectedGesture: GestureClassificationResult | null;
  onClose: () => void;
  onComplete: (accuracy: number, passed: boolean) => void;
  onToggleCamera: () => void;
  requiredAccuracy: number;
}

export function PracticeMode({
  gesture,
  videoRef,
  canvasRef,
  isActive,
  isLoading,
  detectedGesture,
  onClose,
  onComplete,
  onToggleCamera,
  requiredAccuracy,
}: PracticeModeProps) {
  const [state, setState] = useState<PracticeState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [accuracy, setAccuracy] = useState(0);
  const [feedback, setFeedback] = useState<ReturnType<typeof generateFeedback> | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const [successfulDetections, setSuccessfulDetections] = useState(0);

  // Start countdown when camera is active
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

  // Detection logic
  useEffect(() => {
    if (state !== 'detecting') return;

    const checkGesture = () => {
      setDetectionCount(prev => prev + 1);

      if (detectedGesture?.gesture) {
        // Check if detected gesture matches target
        const isMatch = detectedGesture.gesture.name === gesture.gesture.name ||
                       detectedGesture.gesture.englishText.toLowerCase() === gesture.gesture.englishText.toLowerCase();
        
        if (isMatch) {
          setSuccessfulDetections(prev => prev + 1);
          setAccuracy(detectedGesture.confidence * 100);
        }
      }
    };

    const interval = setInterval(checkGesture, 200);

    // After 5 seconds of detection, evaluate
    const timeout = setTimeout(() => {
      clearInterval(interval);
      evaluatePerformance();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state, detectedGesture, gesture]);

  const evaluatePerformance = () => {
    const detectionRate = detectionCount > 0 ? (successfulDetections / detectionCount) * 100 : 0;
    const finalAccuracy = Math.min(100, Math.max(0, (detectionRate + accuracy) / 2));
    
    setAccuracy(finalAccuracy);
    setFeedback(generateFeedback(finalAccuracy));
    
    const passed = finalAccuracy >= requiredAccuracy;
    setState(passed ? 'success' : 'retry');
    onComplete(finalAccuracy, passed);
  };

  const handleRetry = () => {
    setState('idle');
    setFeedback(null);
    startPractice();
  };

  const handleNext = () => {
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Practice: {gesture.gesture.englishText}</h2>
            <p className="text-muted-foreground">Show the sign to the camera</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Gesture Info */}
          <div className="space-y-6">
            {/* Gesture display */}
            <div className="glass-card rounded-2xl p-8 text-center">
              <span className="text-8xl block mb-4">{gesture.gesture.emoji}</span>
              <h3 className="text-3xl font-bold mb-2">{gesture.gesture.englishText}</h3>
              <p className="text-lg text-muted-foreground mb-4">{gesture.gesture.hindiText}</p>
              <p className="text-muted-foreground">{gesture.gesture.description}</p>
            </div>

            {/* Tips */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold">Tips for this sign</h4>
              </div>
              <ul className="space-y-2">
                {gesture.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Camera & Practice */}
          <div className="space-y-6">
            {/* Camera view */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-card border border-border">
              <video
                ref={videoRef}
                className={cn(
                  'w-full h-full object-cover',
                  (!isActive || state === 'idle') && 'opacity-0'
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
                  (!isActive || isLoading || state === 'idle') && 'opacity-0'
                )}
              />

              {/* Overlay states */}
              <AnimatePresence mode="wait">
                {state === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-card/90"
                  >
                    <p className="text-muted-foreground mb-4">Ready to practice?</p>
                    <Button onClick={startPractice} size="lg" className="gap-2">
                      Start Practice
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}

                {state === 'countdown' && (
                  <motion.div
                    key="countdown"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/80"
                  >
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-8xl font-bold text-primary"
                    >
                      {countdown}
                    </motion.div>
                  </motion.div>
                )}

                {state === 'detecting' && (
                  <motion.div
                    key="detecting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute bottom-4 left-4 right-4"
                  >
                    <div className="bg-card/90 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Detecting...</span>
                        <span className="text-sm text-primary">{Math.round(accuracy)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          animate={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Hold the sign steady for best results
                      </p>
                    </div>
                  </motion.div>
                )}

                {(state === 'success' || state === 'retry') && feedback && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/90"
                  >
                    <div className="text-center p-6">
                      {state === 'success' ? (
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      ) : (
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                      )}
                      <h3 className="text-2xl font-bold mb-2">{feedback.message}</h3>
                      <p className="text-lg text-primary mb-2">{Math.round(accuracy)}% accuracy</p>
                      <p className="text-muted-foreground mb-2">{feedback.suggestion}</p>
                      <p className="text-sm text-muted-foreground">{feedback.encouragement}</p>

                      <div className="flex gap-3 justify-center mt-6">
                        <Button variant="outline" onClick={handleRetry} className="gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Try Again
                        </Button>
                        <Button onClick={handleNext} className="gap-2">
                          {state === 'success' ? 'Continue' : 'Skip for Now'}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live indicator */}
              {isActive && state === 'detecting' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>

            {/* Required accuracy info */}
            <div className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Required accuracy to pass</span>
              <span className="font-semibold text-primary">{requiredAccuracy}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
