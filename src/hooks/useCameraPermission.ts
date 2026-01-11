import { useState, useEffect, useCallback, useRef } from 'react';

export type CameraPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'unsupported'
  | 'insecure';

interface UseCameraPermissionReturn {
  permissionState: CameraPermissionState;
  errorMessage: string | null;
  /**
   * Explicitly requests camera access from the browser.
   * Returns a live MediaStream when granted, otherwise null.
   */
  requestPermission: (videoConstraints?: MediaTrackConstraints) => Promise<MediaStream | null>;
  checkPermission: () => Promise<void>;
  /**
   * Releases the current stream if one was obtained.
   */
  releaseStream: () => void;
}

const ERROR_MESSAGES: Record<CameraPermissionState, string | null> = {
  idle: null,
  requesting: null,
  granted: null,
  denied:
    'Camera access denied. Please enable camera permissions in your browser settings and refresh the page.',
  'not-found': 'No camera found. Please connect a camera to your device.',
  'in-use':
    'Camera is in use by another application. Please close other apps using the camera.',
  unsupported:
    'Your browser does not support camera access. Please use Chrome, Edge, Firefox, or Safari.',
  insecure:
    'Camera access requires a secure connection (HTTPS). Please access this site over HTTPS.',
};

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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
        setErrorMessage(ERROR_MESSAGES.insecure);
        console.error('[Camera] Site is not served over HTTPS');
        return false;
      }
    }

    // Check for MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage(ERROR_MESSAGES.unsupported);
      console.error('[Camera] MediaDevices API not supported');
      return false;
    }

    return true;
  }, []);

  // Parse error and set appropriate state
  const handleError = useCallback((error: unknown) => {
    const err = error as Error & { name?: string };
    console.error('[Camera] Error:', err.name, err.message);

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setPermissionState('denied');
      setErrorMessage(ERROR_MESSAGES.denied);
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setPermissionState('not-found');
      setErrorMessage(ERROR_MESSAGES['not-found']);
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      setPermissionState('in-use');
      setErrorMessage(ERROR_MESSAGES['in-use']);
    } else if (err.name === 'OverconstrainedError') {
      setPermissionState('not-found');
      setErrorMessage('Camera does not meet the required constraints.');
    } else if (err.name === 'TypeError') {
      setPermissionState('unsupported');
      setErrorMessage(ERROR_MESSAGES.unsupported);
    } else {
      // Default to denied to ensure user sees actionable guidance
      setPermissionState('denied');
      setErrorMessage(`Camera error: ${err.message || 'Unknown error occurred'}`);
    }
  }, []);

  // Release current stream
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      console.log('[Camera] Releasing stream...');
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Check current permission status
  const checkPermission = useCallback(async () => {
    if (!checkBrowserSupport()) return;

    try {
      // Use Permissions API if available (not supported everywhere)
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });

        switch (result.state) {
          case 'granted':
            setPermissionState('granted');
            setErrorMessage(null);
            break;
          case 'denied':
            setPermissionState('denied');
            setErrorMessage(ERROR_MESSAGES.denied);
            break;
          case 'prompt':
          default:
            setPermissionState('idle');
            setErrorMessage(null);
        }

        // Listen for permission changes
        result.addEventListener('change', () => {
          if (result.state === 'granted') {
            setPermissionState('granted');
            setErrorMessage(null);
          } else if (result.state === 'denied') {
            setPermissionState('denied');
            setErrorMessage(ERROR_MESSAGES.denied);
          }
        });
      }
    } catch {
      console.log('[Camera] Permissions API not available, will check on request');
    }
  }, [checkBrowserSupport]);

  // Request camera permission AND return a live stream when granted.
  const requestPermission = useCallback(
    async (videoConstraints?: MediaTrackConstraints): Promise<MediaStream | null> => {
      // Prevent concurrent requests
      if (isRequestingRef.current) {
        console.log('[Camera] Already requesting, ignoring...');
        return streamRef.current;
      }

      // If we already have an active stream, return it
      if (streamRef.current && streamRef.current.active) {
        console.log('[Camera] Using existing active stream');
        setPermissionState('granted');
        setErrorMessage(null);
        return streamRef.current;
      }

      if (!checkBrowserSupport()) return null;

      isRequestingRef.current = true;
      setPermissionState('requesting');
      setErrorMessage(null);

      try {
        console.log('[Camera] Requesting camera access...');
        const startTime = performance.now();

        const defaultConstraints: MediaTrackConstraints = {
          width: { ideal: 640, max: 1920 },
          height: { ideal: 480, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { ...defaultConstraints, ...(videoConstraints ?? {}) },
          audio: false,
        });

        const elapsed = performance.now() - startTime;
        console.log(`[Camera] Permission granted in ${elapsed.toFixed(0)}ms`);

        // Release any old stream before storing new one
        releaseStream();
        
        streamRef.current = stream;
        setPermissionState('granted');
        setErrorMessage(null);
        isRequestingRef.current = false;

        return stream;
      } catch (error) {
        handleError(error);
        isRequestingRef.current = false;
        return null;
      }
    },
    [checkBrowserSupport, handleError, releaseStream]
  );

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    errorMessage,
    requestPermission,
    checkPermission,
    releaseStream,
  };
}
