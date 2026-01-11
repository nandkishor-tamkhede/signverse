import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  X, 
  CheckCircle, 
  ChevronLeft,
  Play,
  RotateCcw,
  Lightbulb,
  Hand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GestureDefinition } from '@/types/gesture';
import { LearningCategory, getGestureTips } from '@/lib/learningCategories';
import { cn } from '@/lib/utils';

interface SignViewerProps {
  category: LearningCategory;
  currentIndex: number;
  isCompleted: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onPractice: () => void;
  totalGestures: number;
  getCompletionStatus: (gestureIndex: number) => boolean;
}

export function SignViewer({
  category,
  currentIndex,
  isCompleted,
  onNext,
  onPrevious,
  onClose,
  onPractice,
  totalGestures,
  getCompletionStatus,
}: SignViewerProps) {
  const gesture = category.gestures[currentIndex];
  const tips = getGestureTips(gesture);
  const hasNext = currentIndex < totalGestures - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl overflow-y-auto"
    >
      <div className="container mx-auto px-4 py-6 max-w-4xl min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to {category.name}</span>
          </Button>
          
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalGestures, 10) }).map((_, i) => {
              const actualIndex = totalGestures <= 10 ? i : Math.floor(i * totalGestures / 10);
              return (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    actualIndex === currentIndex 
                      ? 'w-6 bg-primary' 
                      : getCompletionStatus(actualIndex) 
                        ? 'bg-green-500' 
                        : 'bg-muted'
                  )}
                />
              );
            })}
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-2xl"
            >
              {/* Sign display card */}
              <div className={cn(
                'relative rounded-3xl p-8 mb-8 text-center',
                'bg-gradient-to-br border-2 border-border/30',
                category.bgGradient
              )}>
                {/* Completed badge */}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 bg-green-500 rounded-full p-2"
                  >
                    <CheckCircle className="w-6 h-6 text-white" />
                  </motion.div>
                )}

                {/* Large symbol/emoji */}
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <span className="text-[120px] sm:text-[150px] leading-none drop-shadow-2xl">
                    {gesture.emoji}
                  </span>
                </motion.div>

                {/* Sign name - large and clear */}
                <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-foreground">
                  {gesture.englishText}
                </h1>

                {/* Hindi translation */}
                <p className="text-xl text-muted-foreground mb-6">
                  {gesture.hindiText}
                </p>

                {/* Meaning label */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm">
                  <Hand className="w-5 h-5 text-primary" />
                  <span className="text-lg">
                    <span className="text-muted-foreground">This sign means: </span>
                    <span className="font-semibold text-foreground">"{gesture.englishText}"</span>
                  </span>
                </div>
              </div>

              {/* How to make this sign */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Lightbulb className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">How to make this sign</h2>
                </div>
                
                <p className="text-lg text-foreground mb-4 leading-relaxed">
                  {gesture.description}
                </p>

                <div className="space-y-3">
                  {tips.slice(1).map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 text-muted-foreground">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-primary/50 flex-shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practice button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={onPractice}
                  size="lg"
                  className="w-full h-16 text-lg gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <Play className="w-6 h-6" />
                  Try copying this gesture
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between py-6 border-t border-border/30">
          <Button
            variant="outline"
            size="lg"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="gap-2 min-w-[120px]"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </Button>

          <div className="text-center">
            <div className="text-sm text-muted-foreground">Sign</div>
            <div className="text-xl font-bold">
              {currentIndex + 1} <span className="text-muted-foreground font-normal">of</span> {totalGestures}
            </div>
          </div>

          <Button
            size="lg"
            onClick={onNext}
            disabled={!hasNext}
            className="gap-2 min-w-[120px]"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Repeat as many times message */}
        <div className="text-center pb-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Practice as many times as you want - there's no limit!
        </div>
      </div>
    </motion.div>
  );
}
