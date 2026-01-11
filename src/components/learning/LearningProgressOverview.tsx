import { motion } from 'framer-motion';
import { BookOpen, Trophy, Target, Sparkles } from 'lucide-react';
import { LEARNING_CATEGORIES, getTotalGesturesCount } from '@/lib/learningCategories';

interface LearningProgressOverviewProps {
  completedGestures: Set<string>;
  totalCategories?: number;
}

export function LearningProgressOverview({
  completedGestures,
}: LearningProgressOverviewProps) {
  const totalGestures = getTotalGesturesCount();
  const completedCount = completedGestures.size;
  const percentage = totalGestures > 0 ? Math.round((completedCount / totalGestures) * 100) : 0;
  
  // Count completed categories
  const completedCategories = LEARNING_CATEGORIES.filter(cat => 
    cat.gestures.every(g => completedGestures.has(g.name))
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl p-6 mb-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Main progress */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Your Learning Journey</h2>
              <p className="text-muted-foreground">Learn at your own pace - no pressure!</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="text-xl font-bold text-primary">{percentage}%</span>
            </div>
            <div className="h-4 rounded-full bg-card/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
          >
            <Trophy className="w-7 h-7 text-yellow-500 mx-auto mb-2" />
            <div className="text-3xl font-bold">{completedCategories}</div>
            <div className="text-xs text-muted-foreground">Categories Done</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
          >
            <Target className="w-7 h-7 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold">{completedCount}</div>
            <div className="text-xs text-muted-foreground">Signs Learned</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
          >
            <Sparkles className="w-7 h-7 text-blue-500 mx-auto mb-2" />
            <div className="text-3xl font-bold">{totalGestures - completedCount}</div>
            <div className="text-xs text-muted-foreground">To Explore</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
