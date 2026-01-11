import { motion } from 'framer-motion';
import { Hand, Sparkles, Video, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <motion.header 
      className="text-center py-8 px-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div 
        className="flex items-center justify-center gap-3 mb-4"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent blur-xl opacity-50"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="relative p-3 rounded-xl bg-gradient-to-r from-primary to-accent">
            <Hand className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-display font-bold">
          <span className="gradient-text">SignVerse</span>
          <span className="text-foreground"> AI</span>
        </h1>
        
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.div>
      </motion.div>

      <motion.p 
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Speak with Your Hands • AI-Powered Sign Language to Speech
      </motion.p>

      <motion.div 
        className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Real-time Detection
        </span>
        <span className="hidden sm:block">•</span>
        <span className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          Voice Output
        </span>
        <span className="hidden sm:block">•</span>
        <span className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Multi-language
        </span>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="mt-6 flex flex-wrap items-center justify-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Link to="/call">
          <Button size="lg" className="gap-2 rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
            <Video className="w-5 h-5" />
            Start Video Call
          </Button>
        </Link>
        <Link to="/learn">
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2 rounded-full px-6 border-2 border-secondary hover:bg-secondary/10 transition-colors"
          >
            <GraduationCap className="w-5 h-5" />
            Learn Sign Language
          </Button>
        </Link>
      </motion.div>
    </motion.header>
  );
}
