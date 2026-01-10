import { motion } from 'framer-motion';
import { Camera, CameraOff, Volume2, VolumeX, Sun, Moon, Trash2, Languages } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Language } from '@/types/gesture';

interface ControlPanelProps {
  isCameraActive: boolean;
  isMuted: boolean;
  isDarkMode: boolean;
  language: Language;
  speechRate: number;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onToggleDarkMode: () => void;
  onToggleLanguage: () => void;
  onSpeechRateChange: (value: number) => void;
  onClearHistory: () => void;
}

export function ControlPanel({
  isCameraActive,
  isMuted,
  isDarkMode,
  language,
  speechRate,
  onToggleCamera,
  onToggleMute,
  onToggleDarkMode,
  onToggleLanguage,
  onSpeechRateChange,
  onClearHistory
}: ControlPanelProps) {
  return (
    <motion.div 
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Controls
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Camera Toggle */}
        <Button
          onClick={onToggleCamera}
          variant={isCameraActive ? 'default' : 'outline'}
          className={`flex flex-col items-center gap-2 h-auto py-4 ${
            isCameraActive 
              ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' 
              : 'border-primary/50 hover:bg-primary/10'
          }`}
        >
          {isCameraActive ? (
            <CameraOff className="w-5 h-5" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
          <span className="text-xs">{isCameraActive ? 'Stop' : 'Start'}</span>
        </Button>

        {/* Mute Toggle */}
        <Button
          onClick={onToggleMute}
          variant="outline"
          className={`flex flex-col items-center gap-2 h-auto py-4 border-primary/50 ${
            isMuted ? 'bg-destructive/20 border-destructive' : 'hover:bg-primary/10'
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-destructive" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>

        {/* Language Toggle */}
        <Button
          onClick={onToggleLanguage}
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 border-primary/50 hover:bg-primary/10"
        >
          <Languages className="w-5 h-5" />
          <span className="text-xs">{language === 'en' ? 'English' : 'हिंदी'}</span>
        </Button>

        {/* Theme Toggle */}
        <Button
          onClick={onToggleDarkMode}
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 border-primary/50 hover:bg-primary/10"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span className="text-xs">{isDarkMode ? 'Light' : 'Dark'}</span>
        </Button>

        {/* Clear History */}
        <Button
          onClick={onClearHistory}
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 border-primary/50 hover:bg-destructive/10 hover:border-destructive"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs">Clear</span>
        </Button>

        {/* Speech Rate */}
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-primary/50 col-span-2 sm:col-span-1">
          <span className="text-xs text-muted-foreground">Speed: {speechRate.toFixed(1)}x</span>
          <Slider
            value={[speechRate]}
            onValueChange={([value]) => onSpeechRateChange(value)}
            min={0.5}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
