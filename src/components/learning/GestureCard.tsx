import { motion } from 'framer-motion';
import { CheckCircle, Star, Target } from 'lucide-react';
import { LessonGesture } from '@/types/learning';
import { cn } from '@/lib/utils';

interface GestureCardProps {
  gesture: LessonGesture;
  isCompleted: boolean;
  bestAccuracy: number;
  attempts: number;
  onClick: () => void;
  index: number;
}

export function GestureCard({
  gesture,
  isCompleted,
  bestAccuracy,
  attempts,
  onClick,
  index,
}: GestureCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'hard': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer transition-all duration-200',
        'border border-border/50 hover:border-primary/50 hover:shadow-lg',
        'bg-card/60 backdrop-blur-sm hover:bg-card/80',
        isCompleted && 'border-green-500/30 bg-green-500/5'
      )}
    >
      {/* Completed indicator */}
      {isCompleted && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-green-500 rounded-full p-1">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Emoji */}
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
        {gesture.gesture.emoji}
      </div>

      {/* Text */}
      <h4 className="font-semibold text-lg mb-1">
        {gesture.gesture.englishText}
      </h4>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
        {gesture.gesture.description}
      </p>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className={cn('px-2 py-0.5 rounded-full capitalize', getDifficultyColor(gesture.difficulty))}>
          {gesture.difficulty}
        </span>
        
        {attempts > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{Math.round(bestAccuracy)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>{attempts}x</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
