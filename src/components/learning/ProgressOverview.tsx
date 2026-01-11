import { motion } from 'framer-motion';
import { BookOpen, Trophy, Target, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProgressOverviewProps {
  totalCompleted: number;
  totalGestures: number;
  percentage: number;
  levelsCompleted: number;
  totalLevels: number;
}

export function ProgressOverview({
  totalCompleted,
  totalGestures,
  percentage,
  levelsCompleted,
  totalLevels,
}: ProgressOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 mb-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Main progress */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Your Learning Journey</h2>
              <p className="text-muted-foreground">Keep practicing to master sign language!</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{levelsCompleted}</div>
            <div className="text-xs text-muted-foreground">Levels Done</div>
          </div>
          
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Target className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalCompleted}</div>
            <div className="text-xs text-muted-foreground">Signs Learned</div>
          </div>
          
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalGestures - totalCompleted}</div>
            <div className="text-xs text-muted-foreground">To Go</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
