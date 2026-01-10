import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface SpeechWaveformProps {
  isSpeaking: boolean;
  isMuted: boolean;
}

export function SpeechWaveform({ isSpeaking, isMuted }: SpeechWaveformProps) {
  const bars = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Voice Output
        </h3>
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-destructive" />
        ) : (
          <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-primary' : 'text-muted-foreground'}`} />
        )}
      </div>

      <div className="flex items-center justify-center gap-1 h-16">
        {isMuted ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground text-sm"
          >
            Voice output is muted
          </motion.p>
        ) : (
          bars.map((bar) => (
            <motion.div
              key={bar}
              className="w-2 rounded-full"
              style={{
                background: isSpeaking 
                  ? 'linear-gradient(180deg, hsl(var(--primary)), hsl(var(--accent)))'
                  : 'hsl(var(--muted))'
              }}
              animate={{
                height: isSpeaking 
                  ? [12, 40, 24, 56, 32, 48, 16][bar - 1]
                  : 12,
                scaleY: isSpeaking ? [1, 1.5, 0.8, 1.8, 1.2, 1.6, 0.6][bar - 1] : 1
              }}
              transition={{
                duration: 0.4,
                repeat: isSpeaking ? Infinity : 0,
                repeatType: 'reverse',
                delay: bar * 0.1,
                ease: 'easeInOut'
              }}
            />
          ))
        )}
      </div>

      <p className={`text-center text-sm mt-4 ${isSpeaking ? 'text-primary' : 'text-muted-foreground'}`}>
        {isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Waiting for gesture'}
      </p>
    </div>
  );
}
