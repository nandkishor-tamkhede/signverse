import { motion } from 'framer-motion';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RefObject } from 'react';

interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
}

export function WebcamPreview({ videoRef, canvasRef, isActive, isLoading, error }: WebcamPreviewProps) {
  return (
    <motion.div 
      className="relative w-full aspect-video rounded-2xl overflow-hidden glass-card"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent p-[2px]">
        <div className="absolute inset-[2px] rounded-2xl bg-card" />
      </div>

      {/* Video element (hidden) */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />

      {/* Canvas for drawing */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className={cn(
          'relative z-10 w-full h-full object-cover rounded-2xl',
          !isActive && 'opacity-0'
        )}
      />

      {/* Overlay states */}
      {!isActive && (
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CameraOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Camera is off</p>
          <p className="text-muted-foreground text-sm mt-2">Click "Start Camera" to begin</p>
        </motion.div>
      )}

      {isActive && isLoading && (
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="text-foreground text-lg font-medium">Initializing AI...</p>
          <p className="text-muted-foreground text-sm mt-2">Loading hand detection model</p>
        </motion.div>
      )}

      {error && (
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm rounded-2xl p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CameraOff className="w-16 h-16 text-destructive mb-4" />
          <p className="text-destructive text-lg font-medium text-center">{error}</p>
        </motion.div>
      )}

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg z-30" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg z-30" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg z-30" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg z-30" />

      {/* Live indicator */}
      {isActive && !isLoading && !error && (
        <motion.div 
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider">Live</span>
        </motion.div>
      )}
    </motion.div>
  );
}
