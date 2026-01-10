import { useState, useEffect, useCallback } from 'react';

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
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<void>;
}

const ERROR_MESSAGES: Record<CameraPermissionState, string | null> = {
  'idle': null,
  'requesting': null,
  'granted': null,
  'denied': 'Camera access denied. Please enable camera permissions in your browser settings and refresh the page.',
  'not-found': 'No camera found. Please connect a camera to your device.',
  'in-use': 'Camera is in use by another application. Please close other apps using the camera.',
  'unsupported': 'Your browser does not support camera access. Please use Chrome, Edge, Firefox, or Safari.',
  'insecure': 'Camera access requires a secure connection (HTTPS). Please access this site over HTTPS.'
};

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if browser supports MediaDevices
  const checkBrowserSupport = useCallback((): boolean => {
    // Check for secure context (HTTPS)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      // Allow localhost for development
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setPermissionState('insecure');
        setErrorMessage(ERROR_MESSAGES['insecure']);
        console.error('[Camera] Site is not served over HTTPS');
        return false;
      }
    }

    // Check for MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage(ERROR_MESSAGES['unsupported']);
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
      setErrorMessage(ERROR_MESSAGES['denied']);
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
      setErrorMessage(ERROR_MESSAGES['unsupported']);
    } else {
      setPermissionState('denied');
      setErrorMessage(`Camera error: ${err.message || 'Unknown error occurred'}`);
    }
  }, []);

  // Check current permission status
  const checkPermission = useCallback(async () => {
    if (!checkBrowserSupport()) return;

    try {
      // Use Permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        switch (result.state) {
          case 'granted':
            setPermissionState('granted');
            setErrorMessage(null);
            break;
          case 'denied':
            setPermissionState('denied');
            setErrorMessage(ERROR_MESSAGES['denied']);
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
            setErrorMessage(ERROR_MESSAGES['denied']);
          }
        });
      }
    } catch (error) {
      // Permissions API not supported, will check on request
      console.log('[Camera] Permissions API not available, will check on request');
    }
  }, [checkBrowserSupport]);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!checkBrowserSupport()) return false;

    setPermissionState('requesting');
    setErrorMessage(null);

    try {
      console.log('[Camera] Requesting camera access...');
      
      // Request camera access with constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      // Successfully got access - stop tracks immediately
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('granted');
      setErrorMessage(null);
      console.log('[Camera] Permission granted');
      
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }, [checkBrowserSupport, handleError]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    permissionState,
    errorMessage,
    requestPermission,
    checkPermission
  };
}
