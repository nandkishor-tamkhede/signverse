import { useState, useCallback, useRef, useEffect } from 'react';

export type CameraState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'unsupported'
  | 'insecure';

export interface CameraError {
  type: CameraState;
  message: string;
  instructions: string[];
}

interface UseCameraStreamOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

interface UseCameraStreamReturn {
  stream: MediaStream | null;
  state: CameraState;
  error: CameraError | null;
  isLoading: boolean;
  isReady: boolean;
  /**
   * Requests camera/mic access. Must be called after a user action.
   * Returns the MediaStream if successful, null otherwise.
   */
  start: () => Promise<MediaStream | null>;
  /**
   * Stops all tracks and releases the stream.
   */
  stop: () => void;
  /**
   * Attaches the stream to a video element with proper attributes.
   */
  attachToVideo: (video: HTMLVideoElement) => void;
}

const ERROR_CONFIG: Record<CameraState, CameraError | null> = {
  idle: null,
  requesting: null,
  granted: null,
  denied: {
    type: 'denied',
    message: 'Camera access denied. Please enable permissions.',
    instructions: [
      'Click the camera/lock icon in your browser address bar',
      'Select "Allow" for camera access',
      'Refresh this page',
    ],
  },
  'not-found': {
    type: 'not-found',
    message: 'No camera found on your device.',
    instructions: [
      'Connect a webcam to your device',
      'Check if your camera is enabled in system settings',
      'Try a different USB port',
      'Restart your browser',
    ],
  },
  'in-use': {
    type: 'in-use',
    message: 'Camera is being used by another application.',
    instructions: [
      'Close other apps using the camera (Zoom, Teams, etc.)',
      'Close other browser tabs with camera access',
      'Restart your browser',
    ],
  },
  unsupported: {
    type: 'unsupported',
    message: 'Your browser does not support camera access.',
    instructions: [
      'Use Chrome, Edge, Firefox, or Safari',
      'Update your browser to the latest version',
    ],
  },
  insecure: {
    type: 'insecure',
    message: 'Camera requires a secure connection (HTTPS).',
    instructions: [
      'Access this site via https://',
      'Or use localhost for development',
    ],
  },
};

/**
 * Unified camera stream hook with reliable permission handling,
 * proper cleanup, and race condition prevention.
 */
export function useCameraStream(
  options: UseCameraStreamOptions = { video: true, audio: false }
): UseCameraStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<CameraError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);
  const mountedRef = useRef(true);

  // Check browser support
  const checkSupport = useCallback((): CameraState | null => {
    // Check secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return 'insecure';
      }
    }

    // Check MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'unsupported';
    }

    return null; // Supported
  }, []);

  // Map error to state
  const parseError = useCallback((err: unknown): CameraState => {
    const error = err as Error & { name?: string };
    console.error('[Camera] Error:', error.name, error.message);

    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'denied';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'not-found';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'in-use';
      case 'OverconstrainedError':
        return 'not-found';
      case 'TypeError':
        return 'unsupported';
      default:
        return 'denied';
    }
  }, []);

  // Stop and cleanup stream
  const stop = useCallback(() => {
    console.log('[Camera] Stopping stream...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          console.log('[Camera] Stopped track:', track.kind, track.label);
        } catch {
          // Ignore errors during cleanup
        }
      });
      streamRef.current = null;
    }

    if (mountedRef.current) {
      setStream(null);
      setState('idle');
      setError(null);
      setIsLoading(false);
    }
    
    isRequestingRef.current = false;
  }, []);

  // Attach stream to video element
  const attachToVideo = useCallback((video: HTMLVideoElement) => {
    if (!streamRef.current) {
      console.warn('[Camera] No stream to attach');
      return;
    }

    console.log('[Camera] Attaching stream to video element');
    
    // Set required attributes for reliable playback
    video.srcObject = streamRef.current;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    // Handle play with error catching
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch((err) => {
        console.warn('[Camera] Video play failed:', err);
        // Try playing on user interaction
        const playOnInteraction = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', playOnInteraction);
        };
        document.addEventListener('click', playOnInteraction, { once: true });
      });
    }
  }, []);

  // Start camera
  const start = useCallback(async (): Promise<MediaStream | null> => {
    // Prevent concurrent requests
    if (isRequestingRef.current) {
      console.log('[Camera] Already requesting, returning existing stream');
      return streamRef.current;
    }

    // Return existing active stream
    if (streamRef.current?.active) {
      console.log('[Camera] Using existing active stream');
      setState('granted');
      setError(null);
      return streamRef.current;
    }

    // Check browser support first
    const supportError = checkSupport();
    if (supportError) {
      setState(supportError);
      setError(ERROR_CONFIG[supportError]);
      console.error('[Camera] Browser support check failed:', supportError);
      return null;
    }

    isRequestingRef.current = true;
    setIsLoading(true);
    setState('requesting');
    setError(null);

    try {
      console.log('[Camera] Requesting media access...');
      const startTime = performance.now();

      // Build constraints
      const constraints: MediaStreamConstraints = {};

      if (options.video !== false) {
        constraints.video =
          typeof options.video === 'object'
            ? options.video
            : {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: 'user',
                frameRate: { ideal: 30, max: 60 },
              };
      }

      if (options.audio) {
        constraints.audio =
          typeof options.audio === 'object'
            ? options.audio
            : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              };
      }

      // Request media
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const elapsed = performance.now() - startTime;
      console.log(`[Camera] Stream obtained in ${elapsed.toFixed(0)}ms`);
      console.log(
        '[Camera] Tracks:',
        mediaStream.getTracks().map((t) => `${t.kind}: ${t.label}`).join(', ')
      );

      // Store stream
      streamRef.current = mediaStream;
      
      if (mountedRef.current) {
        setStream(mediaStream);
        setState('granted');
        setError(null);
        setIsLoading(false);
      }
      
      isRequestingRef.current = false;

      // Listen for track ended events
      mediaStream.getTracks().forEach((track) => {
        track.onended = () => {
          console.log('[Camera] Track ended:', track.kind);
          if (mountedRef.current) {
            stop();
          }
        };
      });

      return mediaStream;
    } catch (err) {
      const errorState = parseError(err);
      const errorConfig = ERROR_CONFIG[errorState];

      if (mountedRef.current) {
        setState(errorState);
        setError(errorConfig);
        setIsLoading(false);
      }
      
      isRequestingRef.current = false;
      return null;
    }
  }, [options.video, options.audio, checkSupport, parseError, stop]);

  // Check initial permission state (without requesting)
  useEffect(() => {
    const checkPermission = async () => {
      const supportError = checkSupport();
      if (supportError) {
        setState(supportError);
        setError(ERROR_CONFIG[supportError]);
        return;
      }

      // Try to use Permissions API
      try {
        if (navigator.permissions?.query) {
          const result = await navigator.permissions.query({
            name: 'camera' as PermissionName,
          });

          if (result.state === 'denied') {
            setState('denied');
            setError(ERROR_CONFIG.denied);
          } else if (result.state === 'granted') {
            // Permission was granted before, but we still need user action to get stream
            setState('idle');
          }

          // Listen for changes
          result.onchange = () => {
            if (result.state === 'denied') {
              setState('denied');
              setError(ERROR_CONFIG.denied);
            }
          };
        }
      } catch {
        // Permissions API not available, will check on request
      }
    };

    checkPermission();
  }, [checkSupport]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    state,
    error,
    isLoading,
    isReady: !!stream?.active,
    start,
    stop,
    attachToVideo,
  };
}
