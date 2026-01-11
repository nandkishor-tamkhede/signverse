import { motion } from 'framer-motion';
import { Hand, Headphones } from 'lucide-react';
import { UserRole } from '@/types/call';
import { GlassCard } from '@/components/GlassCard';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            SignVerse Video Call
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose how you want to communicate
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard
              className="p-8 cursor-pointer hover:scale-105 transition-transform duration-300 group"
              onClick={() => onSelectRole('signer')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-6 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <Hand className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">I use Sign Language</h2>
                <p className="text-muted-foreground">
                  Communicate using sign language gestures. Your signs will be translated to speech for the other person.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Camera captures your signs</li>
                  <li>✓ AI translates to text</li>
                  <li>✓ Voice speaks for you</li>
                </ul>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard
              className="p-8 cursor-pointer hover:scale-105 transition-transform duration-300 group"
              onClick={() => onSelectRole('listener')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-6 rounded-full bg-accent/20 group-hover:bg-accent/30 transition-colors">
                  <Headphones className="w-16 h-16 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold">I Listen to AI Voice</h2>
                <p className="text-muted-foreground">
                  Hear the signer's message through AI-generated voice. See live subtitles of their communication.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ See live video of signer</li>
                  <li>✓ Hear AI voice translation</li>
                  <li>✓ Read live subtitles</li>
                </ul>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
