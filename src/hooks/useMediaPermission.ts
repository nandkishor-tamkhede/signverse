import { useState, useEffect, useCallback, useRef } from 'react';

export type MediaPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'unsupported'
  | 'insecure';

export interface MediaError {
  type: MediaPermissionState;
  message: string;
  instructions?: string[];
}

interface UseMediaPermissionOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

interface UseMediaPermissionReturn {
  permissionState: MediaPermissionState;
  error: MediaError | null;
  stream: MediaStream | null;
  isLoading: boolean;
  /**
   * Explicitly requests media access from the browser.
   * Returns a live MediaStream when granted, otherwise null.
   * Must be called after a user action (click, tap).
   */
  requestPermission: () => Promise<MediaStream | null>;
  /**
   * Releases the current media stream, stopping all tracks.
   */
  releaseStream: () => void;
  /**
   * Checks the current permission status without requesting access.
   */
  checkPermission: () => Promise<void>;
}

const ERROR_MESSAGES: Record<MediaPermissionState, MediaError | null> = {
  idle: null,
  requesting: null,
  granted: null,
  denied: {
    type: 'denied',
    message: 'Camera and microphone access denied. Please enable permissions in your browser settings.',
    instructions: [
      'Click the camera/lock icon in your browser address bar',
      'Select "Allow" for camera and microphone access',
      'Refresh this page',
    ],
  },
  'not-found': {
    type: 'not-found',
    message: 'No camera or microphone found. Please connect a device.',
    instructions: [
      'Connect a webcam or camera to your device',
      'Check if your devices are enabled in system settings',
      'Try a different USB port',
      'Restart your browser',
    ],
  },
  'in-use': {
    type: 'in-use',
    message: 'Camera or microphone is in use by another application.',
    instructions: [
      'Close other apps using the camera (Zoom, Teams, etc.)',
      'Close other browser tabs with camera access',
      'Restart your browser',
    ],
  },
  unsupported: {
    type: 'unsupported',
    message: 'Your browser does not support camera or microphone access.',
    instructions: [
      'Use Chrome, Edge, Firefox, or Safari',
      'Update your browser to the latest version',
      'Enable JavaScript if disabled',
    ],
  },
  insecure: {
    type: 'insecure',
    message: 'Camera and microphone access requires a secure connection (HTTPS).',
    instructions: [
      'Access this site via https://',
      'Or use localhost for development',
    ],
  },
};

export function useMediaPermission(
  options: UseMediaPermissionOptions = { video: true, audio: true }
): UseMediaPermissionReturn {
  const [permissionState, setPermissionState] = useState<MediaPermissionState>('idle');
  const [error, setError] = useState<MediaError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);

  // Check if browser supports MediaDevices
  const checkBrowserSupport = useCallback((): boolean => {
    // Check for secure context (HTTPS)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      // Allow localhost for development
      if (
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setPermissionState('insecure');
        setError(ERROR_MESSAGES.insecure);
        console.error('[Media] Site is not served over HTTPS');
        return false;
      }
    }

    // Check for MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unsupported');
      setError(ERROR_MESSAGES.unsupported);
      console.error('[Media] MediaDevices API not supported');
      return false;
    }

    return true;
  }, []);

  // Parse error and set appropriate state
  const handleError = useCallback((err: unknown) => {
    const error = err as Error & { name?: string };
    console.error('[Media] Error:', error.name, error.message);

    let state: MediaPermissionState = 'denied';
    
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
    
    // Use predefined error or create custom one
    const predefinedError = ERROR_MESSAGES[state];
    if (predefinedError) {
      setError(predefinedError);
    } else {
      setError({
        type: state,
        message: error.message || 'An unknown error occurred',
      });
    }
  }, []);

  // Release current stream
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      console.log('[Media] Releasing stream...');
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          console.log('[Media] Stopped track:', track.kind);
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  // Check current permission status
  const checkPermission = useCallback(async () => {
    if (!checkBrowserSupport()) return;

    try {
      // Use Permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        const cameraResult = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        }).catch(() => null);

        const micResult = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        }).catch(() => null);

        // If either is denied, report denied
        if (cameraResult?.state === 'denied' || micResult?.state === 'denied') {
          setPermissionState('denied');
          setError(ERROR_MESSAGES.denied);
          return;
        }

        // If both are granted, report granted
        if (cameraResult?.state === 'granted' && micResult?.state === 'granted') {
          setPermissionState('granted');
          setError(null);
          return;
        }

        // Otherwise, idle (needs prompt)
        setPermissionState('idle');
        setError(null);

        // Listen for permission changes
        const handleChange = (result: PermissionStatus, type: 'camera' | 'microphone') => {
          result.addEventListener('change', () => {
            console.log(`[Media] ${type} permission changed to:`, result.state);
            if (result.state === 'granted') {
              // Re-check both permissions
              checkPermission();
            } else if (result.state === 'denied') {
              setPermissionState('denied');
              setError(ERROR_MESSAGES.denied);
            }
          });
        };

        if (cameraResult) handleChange(cameraResult, 'camera');
        if (micResult) handleChange(micResult, 'microphone');
      }
    } catch {
      console.log('[Media] Permissions API not available, will check on request');
    }
  }, [checkBrowserSupport]);

  // Request media permission and return stream
  const requestPermission = useCallback(async (): Promise<MediaStream | null> => {
    // Prevent concurrent requests
    if (isRequestingRef.current) {
      console.log('[Media] Already requesting, ignoring...');
      return streamRef.current;
    }

    // If we already have a valid stream, return it
    if (streamRef.current && streamRef.current.active) {
      console.log('[Media] Using existing active stream');
      return streamRef.current;
    }

    if (!checkBrowserSupport()) return null;

    isRequestingRef.current = true;
    setIsLoading(true);
    setPermissionState('requesting');
    setError(null);

    try {
      console.log('[Media] Requesting media access...');
      const startTime = performance.now();

      // Build constraints
      const constraints: MediaStreamConstraints = {};

      if (options.video) {
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

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const elapsed = performance.now() - startTime;
      console.log(`[Media] Permission granted in ${elapsed.toFixed(0)}ms`);
      console.log('[Media] Tracks:', mediaStream.getTracks().map(t => `${t.kind}: ${t.label}`).join(', '));

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermissionState('granted');
      setError(null);
      setIsLoading(false);
      isRequestingRef.current = false;

      return mediaStream;
    } catch (err) {
      handleError(err);
      setIsLoading(false);
      isRequestingRef.current = false;
      return null;
    }
  }, [options.video, options.audio, checkBrowserSupport, handleError]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Release stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
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
    permissionState,
    error,
    stream,
    isLoading,
    requestPermission,
    releaseStream,
    checkPermission,
  };
}
