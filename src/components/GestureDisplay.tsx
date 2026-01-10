import { motion, AnimatePresence } from 'framer-motion';
import { GestureDefinition, Language } from '@/types/gesture';

interface GestureDisplayProps {
  gesture: GestureDefinition | null;
  confidence: number;
  language: Language;
}

export function GestureDisplay({ gesture, confidence, language }: GestureDisplayProps) {
  const displayText = gesture 
    ? (language === 'hi' ? gesture.hindiText : gesture.englishText)
    : 'Show a gesture...';

  return (
    <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: gesture 
            ? 'radial-gradient(circle at center, hsl(var(--primary) / 0.3), transparent 70%)'
            : 'radial-gradient(circle at center, transparent, transparent)'
        }}
        transition={{ duration: 0.5 }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={gesture?.name || 'none'}
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-10"
        >
          {gesture && (
            <motion.span 
              className="text-6xl md:text-7xl block mb-4"
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {gesture.emoji}
            </motion.span>
          )}
          
          <h2 className={`font-display font-bold ${gesture ? 'gradient-text text-4xl md:text-6xl' : 'text-muted-foreground text-2xl md:text-3xl'}`}>
            {displayText}
          </h2>
          
          {gesture && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground mt-4 text-sm md:text-base"
            >
              {gesture.description}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Confidence Bar */}
      <div className="mt-6 relative z-10">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Confidence</span>
          <span className="text-foreground font-medium">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
