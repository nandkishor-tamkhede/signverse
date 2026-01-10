import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Button } from './ui/button';
import { QUICK_PHRASES } from '@/lib/gestures';
import { Language } from '@/types/gesture';

interface QuickPhrasesProps {
  language: Language;
  onSpeak: (text: string, hindiText: string) => void;
}

export function QuickPhrases({ language, onSpeak }: QuickPhrasesProps) {
  return (
    <motion.div 
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        Quick Phrases
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_PHRASES.map((phrase, index) => (
          <motion.div
            key={phrase.text}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <Button
              variant="outline"
              onClick={() => onSpeak(phrase.text, phrase.hindi)}
              className="w-full flex items-center gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary h-auto py-3 px-3"
            >
              <span className="text-xl">{phrase.emoji}</span>
              <span className="text-sm truncate">
                {language === 'hi' ? phrase.hindi : phrase.text}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
