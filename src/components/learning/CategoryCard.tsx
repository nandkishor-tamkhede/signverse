import { motion } from 'framer-motion';
import { CheckCircle, ChevronRight, Lock } from 'lucide-react';
import { LearningCategory } from '@/lib/learningCategories';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: LearningCategory;
  completedCount: number;
  isUnlocked?: boolean;
  onClick: () => void;
  index: number;
}

export function CategoryCard({
  category,
  completedCount,
  isUnlocked = true,
  onClick,
  index,
}: CategoryCardProps) {
  const progress = category.gestures.length > 0 
    ? (completedCount / category.gestures.length) * 100 
    : 0;
  const isComplete = completedCount === category.gestures.length && category.gestures.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
      whileHover={isUnlocked ? { scale: 1.02, y: -4 } : {}}
      whileTap={isUnlocked ? { scale: 0.98 } : {}}
      onClick={isUnlocked ? onClick : undefined}
      className={cn(
        'relative overflow-hidden rounded-3xl p-6 transition-all duration-300',
        'border-2 border-border/30 backdrop-blur-md',
        isUnlocked 
          ? 'cursor-pointer hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10' 
          : 'opacity-50 cursor-not-allowed',
        'bg-gradient-to-br',
        category.bgGradient
      )}
    >
      {/* Decorative glow */}
      <div className={cn(
        'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30',
        `bg-gradient-to-br ${category.bgGradient}`
      )} />

      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10 rounded-3xl">
          <div className="text-center">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-0">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'text-5xl p-3 rounded-2xl bg-card/50 backdrop-blur-sm',
              'shadow-lg'
            )}>
              {category.icon}
            </div>
            <div>
              <h3 className={cn('text-2xl font-bold', category.color)}>
                {category.name}
              </h3>
              <span className={cn(
                'inline-block px-2 py-0.5 text-xs rounded-full capitalize mt-1',
                category.difficulty === 'beginner' && 'bg-green-500/20 text-green-400',
                category.difficulty === 'intermediate' && 'bg-yellow-500/20 text-yellow-400',
                category.difficulty === 'advanced' && 'bg-red-500/20 text-red-400'
              )}>
                {category.difficulty}
              </span>
            </div>
          </div>
          
          {isComplete && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-green-500 rounded-full p-1.5"
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {category.description}
        </p>

        {/* Progress section */}
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="relative h-3 rounded-full bg-card/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className={cn(
                'absolute inset-y-0 left-0 rounded-full',
                'bg-gradient-to-r from-primary to-primary/80'
              )}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {completedCount} of {category.gestures.length} signs learned
              </span>
            </div>
            <div className="flex items-center gap-1 text-primary font-medium">
              <span>Start</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
