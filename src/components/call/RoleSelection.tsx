import { motion } from 'framer-motion';
import { Hand, Headphones, Video, ArrowRight, Shield, Sparkles, Zap } from 'lucide-react';
import { UserRole } from '@/types/call';
import { Button } from '@/components/ui/button';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Communication
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">SignVerse</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time video calls with AI sign language translation. 
            Bridge communication barriers instantly.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-6 mb-12 flex-wrap"
        >
          {[
            { icon: Zap, label: 'Real-time' },
            { icon: Shield, label: 'Secure' },
            { icon: Video, label: 'HD Video' },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-muted-foreground">
              <feature.icon className="w-4 h-4" />
              <span className="text-sm">{feature.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Signer Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group cursor-pointer"
            onClick={() => onSelectRole('signer')}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
              {/* Glow effect */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Hand className="w-10 h-10 text-primary" />
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  I use Sign Language
                </h2>

                {/* Description */}
                <p className="text-muted-foreground mb-6">
                  Express yourself through sign language. Our AI captures your gestures and translates them to speech in real-time.
                </p>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {[
                    'Camera captures your signs',
                    'AI translates to natural text',
                    'Voice speaks for you instantly',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <Button size="lg" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Select
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Listener Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group cursor-pointer"
            onClick={() => onSelectRole('listener')}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/10 via-card to-card border border-accent/20 p-8 h-full transition-all duration-300 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10">
              {/* Glow effect */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Headphones className="w-10 h-10 text-accent" />
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  I Listen to AI Voice
                </h2>

                {/* Description */}
                <p className="text-muted-foreground mb-6">
                  Receive translated messages through natural AI voice. See live subtitles for complete understanding.
                </p>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {[
                    'See live video of the signer',
                    'Hear natural AI voice translation',
                    'Read live subtitles on screen',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <Button size="lg" variant="secondary" className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  Select
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-muted-foreground text-sm mt-8"
        >
          No account required • End-to-end encrypted • Works on all devices
        </motion.p>
      </div>
    </div>
  );
}
