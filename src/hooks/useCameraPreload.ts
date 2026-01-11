import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCameraPreloadReturn {
  stream: MediaStream | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  preload: () => Promise<MediaStream | null>;
  release: () => void;
}

/**
 * Preloads camera and microphone to reduce call join latency.
 * Call preload() early (e.g., when entering lobby) so the stream is ready instantly.
 */
export function useCameraPreload(): UseCameraPreloadReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const preload = useCallback(async (): Promise<MediaStream | null> => {
    // Already have a stream
    if (streamRef.current) {
      console.log('[CameraPreload] Using cached stream');
      return streamRef.current;
    }

    if (isLoading) {
      console.log('[CameraPreload] Already loading...');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[CameraPreload] Requesting media devices...');
      const startTime = performance.now();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const elapsed = performance.now() - startTime;
      console.log(`[CameraPreload] Media ready in ${elapsed.toFixed(0)}ms`);

      streamRef.current = mediaStream;
      setStream(mediaStream);
      return mediaStream;
    } catch (err) {
      console.error('[CameraPreload] Failed to get media:', err);
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const release = useCallback(() => {
    if (streamRef.current) {
      console.log('[CameraPreload] Releasing stream');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't release on unmount - let the caller control this
    };
  }, []);

  return {
    stream,
    isReady: !!stream,
    isLoading,
    error,
    preload,
    release,
  };
}
