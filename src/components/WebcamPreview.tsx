import { motion } from 'framer-motion';
import { Camera, CameraOff, Loader2, ShieldAlert, MonitorX, Lock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RefObject } from 'react';
import { CameraPermissionState } from '@/hooks/useCameraPermission';

interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  permissionState?: CameraPermissionState;
}

const getErrorIcon = (permissionState?: CameraPermissionState) => {
  switch (permissionState) {
    case 'denied':
      return <ShieldAlert className="w-16 h-16 text-destructive mb-4" />;
    case 'not-found':
      return <MonitorX className="w-16 h-16 text-destructive mb-4" />;
    case 'insecure':
      return <Lock className="w-16 h-16 text-destructive mb-4" />;
    case 'unsupported':
      return <AlertTriangle className="w-16 h-16 text-destructive mb-4" />;
    case 'in-use':
      return <CameraOff className="w-16 h-16 text-destructive mb-4" />;
    default:
      return <CameraOff className="w-16 h-16 text-destructive mb-4" />;
  }
};

const getPermissionInstructions = (permissionState?: CameraPermissionState) => {
  switch (permissionState) {
    case 'denied':
      return (
        <div className="mt-4 text-left text-sm text-muted-foreground space-y-2 max-w-md">
          <p className="font-medium text-foreground">How to enable camera:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click the camera/lock icon in your browser's address bar</li>
            <li>Select "Allow" for camera access</li>
            <li>Refresh this page</li>
          </ul>
          <p className="text-xs mt-3 opacity-75">
            Or go to browser Settings → Privacy & Security → Site Settings → Camera
          </p>
        </div>
      );
    case 'not-found':
      return (
        <div className="mt-4 text-left text-sm text-muted-foreground space-y-2 max-w-md">
          <p className="font-medium text-foreground">Troubleshooting:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Connect a webcam to your device</li>
            <li>Check if your camera is enabled in system settings</li>
            <li>Try a different USB port</li>
            <li>Restart your browser</li>
          </ul>
        </div>
      );
    case 'in-use':
      return (
        <div className="mt-4 text-left text-sm text-muted-foreground space-y-2 max-w-md">
          <p className="font-medium text-foreground">Camera is busy:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Close other apps using the camera (Zoom, Teams, etc.)</li>
            <li>Close other browser tabs with camera access</li>
            <li>Restart your browser</li>
          </ul>
        </div>
      );
    case 'insecure':
      return (
        <div className="mt-4 text-left text-sm text-muted-foreground space-y-2 max-w-md">
          <p className="font-medium text-foreground">Secure connection required:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Camera access requires HTTPS</li>
            <li>Please access this site via https://</li>
            <li>Or use localhost for development</li>
          </ul>
        </div>
      );
    case 'unsupported':
      return (
        <div className="mt-4 text-left text-sm text-muted-foreground space-y-2 max-w-md">
          <p className="font-medium text-foreground">Browser not supported:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use Chrome, Edge, Firefox, or Safari</li>
            <li>Update your browser to the latest version</li>
            <li>Enable JavaScript if disabled</li>
          </ul>
        </div>
      );
    default:
      return null;
  }
};

export function WebcamPreview({ 
  videoRef, 
  canvasRef, 
  isActive, 
  isLoading, 
  error,
  permissionState 
}: WebcamPreviewProps) {
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

      {/* Video element (visible so preview is stable even if model frames are delayed) */}
      <video
        ref={videoRef}
        className={cn(
          'relative z-10 w-full h-full object-cover rounded-2xl',
          (!isActive || error) && 'opacity-0'
        )}
        playsInline
        muted
        autoPlay
      />

      {/* Canvas for drawing (overlays landmarks/video when available) */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className={cn(
          'absolute inset-0 z-20 w-full h-full object-cover rounded-2xl pointer-events-none',
          (!isActive || isLoading || error) && 'opacity-0'
        )}
      />

      {/* Overlay states */}
      {!isActive && !error && (
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CameraOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Camera is off</p>
          <p className="text-muted-foreground text-sm mt-2">Click "Start" to begin</p>
        </motion.div>
      )}

      {isActive && isLoading && !error && (
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="text-foreground text-lg font-medium">Initializing Camera...</p>
          <p className="text-muted-foreground text-sm mt-2">
            {permissionState === 'requesting' 
              ? 'Please allow camera access when prompted' 
              : 'Loading hand detection model'}
          </p>
        </motion.div>
      )}

      {error && (
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-destructive/5 backdrop-blur-sm rounded-2xl p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {getErrorIcon(permissionState)}
          <p className="text-destructive text-lg font-medium text-center max-w-md">{error}</p>
          {getPermissionInstructions(permissionState)}
        </motion.div>
      )}

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg z-30 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg z-30 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg z-30 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg z-30 pointer-events-none" />

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
