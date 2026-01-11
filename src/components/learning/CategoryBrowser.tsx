import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, CheckCircle, Grid, List } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LearningCategory } from '@/lib/learningCategories';
import { GestureDefinition } from '@/types/gesture';
import { cn } from '@/lib/utils';

interface CategoryBrowserProps {
  category: LearningCategory;
  onBack: () => void;
  onSelectGesture: (index: number) => void;
  getCompletionStatus: (gestureName: string) => boolean;
}

export function CategoryBrowser({
  category,
  onBack,
  onSelectGesture,
  getCompletionStatus,
}: CategoryBrowserProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const completedCount = category.gestures.filter(g => getCompletionStatus(g.name)).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{category.icon}</span>
            <div>
              <h1 className={cn('text-3xl font-bold', category.color)}>
                {category.name}
              </h1>
              <p className="text-muted-foreground">{category.description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Progress badge */}
          <div className="px-4 py-2 rounded-xl bg-card/50 backdrop-blur-sm">
            <span className="text-2xl font-bold text-primary">{completedCount}</span>
            <span className="text-muted-foreground"> / {category.gestures.length} learned</span>
          </div>

          {/* View toggle */}
          <div className="flex bg-card/50 rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(viewMode === 'grid' && 'bg-primary/20')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(viewMode === 'list' && 'bg-primary/20')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-3 rounded-full bg-card/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / category.gestures.length) * 100}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
          />
        </div>
      </div>

      {/* Gesture grid/list */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {category.gestures.map((gesture, index) => (
            <GestureGridItem
              key={gesture.name}
              gesture={gesture}
              index={index}
              isCompleted={getCompletionStatus(gesture.name)}
              category={category}
              onClick={() => onSelectGesture(index)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {category.gestures.map((gesture, index) => (
            <GestureListItem
              key={gesture.name}
              gesture={gesture}
              index={index}
              isCompleted={getCompletionStatus(gesture.name)}
              category={category}
              onClick={() => onSelectGesture(index)}
            />
          ))}
        </div>
      )}

      {/* Start learning button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-center"
      >
        <Button
          size="lg"
          onClick={() => {
            const nextIncomplete = category.gestures.findIndex(g => !getCompletionStatus(g.name));
            onSelectGesture(nextIncomplete >= 0 ? nextIncomplete : 0);
          }}
          className="gap-2 h-14 px-8 text-lg rounded-2xl"
        >
          {completedCount === 0 ? 'Start Learning' : 'Continue Learning'}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

interface GestureGridItemProps {
  gesture: GestureDefinition;
  index: number;
  isCompleted: boolean;
  category: LearningCategory;
  onClick: () => void;
}

function GestureGridItem({ gesture, index, isCompleted, category, onClick }: GestureGridItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative aspect-square rounded-2xl p-3 cursor-pointer transition-all',
        'border-2 border-border/30 hover:border-primary/40',
        'bg-gradient-to-br backdrop-blur-sm',
        category.bgGradient,
        isCompleted && 'ring-2 ring-green-500/50'
      )}
    >
      {/* Completed indicator */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1"
        >
          <CheckCircle className="w-3 h-3 text-white" />
        </motion.div>
      )}

      <div className="h-full flex flex-col items-center justify-center">
        <span className="text-4xl sm:text-5xl mb-2">{gesture.emoji}</span>
        <span className="text-sm font-semibold text-center line-clamp-1">
          {gesture.englishText}
        </span>
      </div>
    </motion.div>
  );
}

interface GestureListItemProps {
  gesture: GestureDefinition;
  index: number;
  isCompleted: boolean;
  category: LearningCategory;
  onClick: () => void;
}

function GestureListItem({ gesture, index, isCompleted, category, onClick }: GestureListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ x: 8 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all',
        'border-2 border-border/30 hover:border-primary/40',
        'bg-gradient-to-r backdrop-blur-sm',
        category.bgGradient,
        isCompleted && 'border-green-500/30'
      )}
    >
      <span className="text-4xl">{gesture.emoji}</span>
      
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{gesture.englishText}</h3>
        <p className="text-sm text-muted-foreground">{gesture.hindiText}</p>
      </div>

      {isCompleted ? (
        <div className="bg-green-500/20 p-2 rounded-full">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      ) : (
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      )}
    </motion.div>
  );
}
