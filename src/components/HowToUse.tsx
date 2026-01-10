import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Hand, Volume2, MessageSquare, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { GESTURES } from '@/lib/gestures';

export function HowToUse() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      icon: Hand,
      title: 'Show Your Gesture',
      description: 'Position your hand clearly in front of the camera. Make sure there is good lighting.'
    },
    {
      icon: MessageSquare,
      title: 'Gesture Recognition',
      description: 'The AI will detect and classify your hand gesture in real-time.'
    },
    {
      icon: Volume2,
      title: 'Voice Output',
      description: 'The recognized gesture will be spoken aloud automatically.'
    },
    {
      icon: Settings,
      title: 'Customize',
      description: 'Adjust speech speed, language, and other settings to your preference.'
    }
  ];

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 border-primary/50 hover:bg-primary/10 gap-2"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">How to Use</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full md:max-h-[80vh] glass-card rounded-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-2xl font-display font-bold gradient-text">
                  How to Use SignVerse
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Steps */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Getting Started
                  </h3>
                  <div className="grid gap-4">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex gap-4 p-4 rounded-xl bg-muted/30"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                          <step.icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">{step.title}</h4>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Supported Gestures */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Supported Gestures
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {GESTURES.map((gesture, index) => (
                      <motion.div
                        key={gesture.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * index }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30 text-center"
                      >
                        <span className="text-2xl">{gesture.emoji}</span>
                        <span className="text-xs font-medium truncate w-full">
                          {gesture.englishText}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Tips for Best Results
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Ensure good lighting for better hand detection</li>
                    <li>• Keep your hand within the camera frame</li>
                    <li>• Hold gestures steady for accurate recognition</li>
                    <li>• Use a plain background when possible</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
