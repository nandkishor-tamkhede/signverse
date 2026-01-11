import { motion } from 'framer-motion';
import { Lock, CheckCircle, Trophy } from 'lucide-react';
import { LearningLevel } from '@/types/learning';
import { cn } from '@/lib/utils';

interface LevelCardProps {
  level: LearningLevel;
  isUnlocked: boolean;
  gesturesCompleted: number;
  totalGestures: number;
  isCompleted: boolean;
  onClick: () => void;
}

export function LevelCard({
  level,
  isUnlocked,
  gesturesCompleted,
  totalGestures,
  isCompleted,
  onClick,
}: LevelCardProps) {
  const progress = totalGestures > 0 ? (gesturesCompleted / totalGestures) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: level.id * 0.1 }}
      onClick={isUnlocked ? onClick : undefined}
      className={cn(
        'relative group rounded-2xl p-6 transition-all duration-300',
        'border border-border/50 backdrop-blur-sm',
        isUnlocked 
          ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-primary/50 bg-card/80'
          : 'opacity-60 cursor-not-allowed bg-card/40'
      )}
    >
      {/* Gradient background */}
      <div className={cn(
        'absolute inset-0 rounded-2xl opacity-10 bg-gradient-to-br',
        level.color
      )} />

      {/* Lock overlay for locked levels */}
      {!isUnlocked && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Complete previous level to unlock</p>
          </div>
        </div>
      )}

      <div className="relative z-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{level.icon}</span>
            <div>
              <h3 className="text-xl font-bold">Level {level.id}</h3>
              <p className="text-lg font-semibold text-primary">{level.name}</p>
            </div>
          </div>
          
          {isCompleted && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-500">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">Complete</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-4 line-clamp-2">
          {level.description}
        </p>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{gesturesCompleted} / {totalGestures} gestures</span>
          </div>
          
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', level.color)}
            />
          </div>
        </div>

        {/* Gestures count */}
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4" />
          <span>{level.gestures.length} signs to learn</span>
          <span className="text-xs px-2 py-0.5 rounded bg-muted">
            {level.requiredAccuracy}% accuracy required
          </span>
        </div>
      </div>
    </motion.div>
  );
}
