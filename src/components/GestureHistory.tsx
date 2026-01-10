import { motion, AnimatePresence } from 'framer-motion';
import { DetectedGesture, Language } from '@/types/gesture';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface GestureHistoryProps {
  history: DetectedGesture[];
  language: Language;
  onClear: () => void;
}

export function GestureHistory({ history, language, onClear }: GestureHistoryProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="glass-card rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" />
          History
        </h3>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive h-8 px-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground text-sm text-center py-8"
            >
              No gestures detected yet
            </motion.p>
          ) : (
            history.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{item.gesture.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {language === 'hi' ? item.gesture.hindiText : item.gesture.englishText}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(item.timestamp)}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(item.confidence * 100)}%
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
