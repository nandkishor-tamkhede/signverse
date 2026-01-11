import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraState, CameraError } from './useCameraStream';

interface UseCameraPreloadReturn {
  stream: MediaStream | null;
  isReady: boolean;
  isLoading: boolean;
  error: CameraError | null;
  permissionState: CameraState;
  preload: () => Promise<MediaStream | null>;
  release: () => void;
}

const ERROR_CONFIG: Record<CameraState, CameraError | null> = {
  idle: null,
  requesting: null,
  granted: null,
  denied: {
    type: 'denied',
    message: 'Camera and microphone access denied. Please enable permissions.',
    instructions: [
      'Click the camera/lock icon in your browser address bar',
      'Select "Allow" for camera and microphone access',
      'Refresh this page',
    ],
  },
  'not-found': {
    type: 'not-found',
    message: 'No camera or microphone found.',
    instructions: [
      'Connect a webcam or camera to your device',
      'Check if your devices are enabled in system settings',
    ],
  },
  'in-use': {
    type: 'in-use',
    message: 'Camera or microphone is in use by another application.',
    instructions: [
      'Close other apps using the camera (Zoom, Teams, etc.)',
      'Close other browser tabs with camera access',
    ],
  },
  unsupported: {
    type: 'unsupported',
    message: 'Your browser does not support camera or microphone access.',
    instructions: ['Use Chrome, Edge, Firefox, or Safari'],
  },
  insecure: {
    type: 'insecure',
    message: 'Camera access requires a secure connection (HTTPS).',
    instructions: ['Access this site via https://', 'Or use localhost for development'],
  },
};

/**
 * Preloads camera and microphone to reduce call join latency.
 * Call preload() early (e.g., when entering lobby) so the stream is ready instantly.
 */
export function useCameraPreload(): UseCameraPreloadReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [permissionState, setPermissionState] = useState<CameraState>('idle');
  
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);
  const mountedRef = useRef(true);

  const handleError = useCallback((err: unknown): CameraError => {
    const error = err as Error & { name?: string };
    console.error('[CameraPreload] Error:', error.name, error.message);

    let state: CameraState = 'denied';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      state = 'denied';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      state = 'not-found';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      state = 'in-use';
    } else if (error.name === 'OverconstrainedError') {
      state = 'not-found';
    } else if (error.name === 'TypeError') {
      state = 'unsupported';
    }

    setPermissionState(state);
    
    return ERROR_CONFIG[state] || {
      type: state,
      message: error.message || 'Failed to access camera',
      instructions: ['Please check your camera and try again'],
    };
  }, []);

  const preload = useCallback(async (): Promise<MediaStream | null> => {
    // Already have a stream
    if (streamRef.current && streamRef.current.active) {
      console.log('[CameraPreload] Using cached stream');
      return streamRef.current;
    }

    // Prevent concurrent requests
    if (isRequestingRef.current) {
      console.log('[CameraPreload] Already loading...');
      return null;
    }

    // Check for secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const err = ERROR_CONFIG.insecure!;
        if (mountedRef.current) {
          setError(err);
          setPermissionState('insecure');
        }
        return null;
      }
    }

    // Check for MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = ERROR_CONFIG.unsupported!;
      if (mountedRef.current) {
        setError(err);
        setPermissionState('unsupported');
      }
      return null;
    }

    isRequestingRef.current = true;
    setIsLoading(true);
    setError(null);
    setPermissionState('requesting');

    try {
      console.log('[CameraPreload] Requesting media devices...');
      const startTime = performance.now();

      // Optimized media constraints for fast initialization
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const elapsed = performance.now() - startTime;
      console.log(`[CameraPreload] Media ready in ${elapsed.toFixed(0)}ms`);
      console.log('[CameraPreload] Tracks:', mediaStream.getTracks().map(t => `${t.kind}: ${t.label}`).join(', '));

      streamRef.current = mediaStream;
      
      if (mountedRef.current) {
        setStream(mediaStream);
        setIsLoading(false);
        setPermissionState('granted');
      }
      
      isRequestingRef.current = false;
      
      return mediaStream;
    } catch (err) {
      const mediaError = handleError(err);
      if (mountedRef.current) {
        setError(mediaError);
        setIsLoading(false);
      }
      isRequestingRef.current = false;
      return null;
    }
  }, [handleError]);

  const release = useCallback(() => {
    if (streamRef.current) {
      console.log('[CameraPreload] Releasing stream');
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          console.log('[CameraPreload] Stopped track:', track.kind);
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
      if (mountedRef.current) {
        setStream(null);
        setPermissionState('idle');
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    isReady: !!stream && stream.active,
    isLoading,
    error,
    permissionState,
    preload,
    release,
  };
}
