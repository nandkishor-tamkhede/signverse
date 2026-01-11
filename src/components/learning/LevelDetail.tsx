import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LearningLevel, LessonGesture } from '@/types/learning';
import { GestureCard } from './GestureCard';

interface LevelDetailProps {
  level: LearningLevel;
  getGestureProgress: (levelId: number, gestureId: string) => {
    completed: boolean;
    bestAccuracy: number;
    attempts: number;
  } | undefined;
  onSelectGesture: (gesture: LessonGesture) => void;
  onBack: () => void;
}

export function LevelDetail({
  level,
  getGestureProgress,
  onSelectGesture,
  onBack,
}: LevelDetailProps) {
  const completedCount = level.gestures.filter(g => 
    getGestureProgress(level.id, g.id)?.completed
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{level.icon}</span>
            <div>
              <h1 className="text-2xl font-bold">Level {level.id}: {level.name}</h1>
              <p className="text-muted-foreground">{level.description}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {completedCount} / {level.gestures.length}
          </div>
          <div className="text-sm text-muted-foreground">completed</div>
        </div>
      </div>

      {/* Gestures grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {level.gestures.map((gesture, index) => {
          const progress = getGestureProgress(level.id, gesture.id);
          return (
            <GestureCard
              key={gesture.id}
              gesture={gesture}
              isCompleted={progress?.completed || false}
              bestAccuracy={progress?.bestAccuracy || 0}
              attempts={progress?.attempts || 0}
              onClick={() => onSelectGesture(gesture)}
              index={index}
            />
          );
        })}
      </div>

      {/* Continue button */}
      {completedCount < level.gestures.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Button
            size="lg"
            onClick={() => {
              const nextGesture = level.gestures.find(g => 
                !getGestureProgress(level.id, g.id)?.completed
              );
              if (nextGesture) {
                onSelectGesture(nextGesture);
              }
            }}
            className="gap-2"
          >
            Continue Learning
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
