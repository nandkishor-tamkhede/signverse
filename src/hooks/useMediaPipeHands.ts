import { useEffect, useRef, useCallback, useState } from 'react';
import { HandLandmarks, GestureClassificationResult } from '@/types/gesture';
import { classifyGesture, smoothGesture, resetSmoothing } from '@/lib/gestures';
import { useCameraPermission } from './useCameraPermission';

interface UseMediaPipeHandsOptions {
  onGestureDetected: (result: GestureClassificationResult) => void;
  isActive: boolean;
}

// Keep constant references stable to prevent repeated re-initialization.
const HAND_CONNECTIONS_LOCAL: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // index
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // middle
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // ring
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // pinky
  [5, 9],
  [9, 13],
  [13, 17], // palm
];

const MEDIAPIPE_HANDS_VERSION = '0.4.1675469240';

function isMediaPipeLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.Hands !== 'undefined' &&
    typeof window.drawConnectors !== 'undefined' &&
    typeof window.drawLandmarks !== 'undefined'
  );
}

async function waitForMediaPipe(timeout = 15000): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      if (isMediaPipeLoaded()) {
        console.log('[MediaPipe] Libraries loaded successfully');
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        console.error('[MediaPipe] Timeout waiting for libraries to load');
        resolve(false);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

async function waitForPageLoad(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (document.readyState === 'complete') return;

  await new Promise<void>((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true });
  });
}

async function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 10000): Promise<void> {
  if (video.readyState >= 2) return; // HAVE_CURRENT_DATA

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for video to become ready'));
    }, timeoutMs);

    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('loadeddata', onLoaded, { once: true });
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

export function useMediaPipeHands({ onGestureDetected, isActive }: UseMediaPipeHandsOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const inFlightSendRef = useRef(false);
  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Lifecycle token to cancel in-flight async starts (prevents double-init + wasm aborts).
  const lifecycleRef = useRef(0);

  // Keep a ref copy so start/stop doesn't recreate callbacks and retrigger effects.
  const isInitializedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { permissionState, errorMessage, requestPermission } = useCameraPermission();

  const errorMessageRef = useRef<string | null>(null);
  useEffect(() => {
    errorMessageRef.current = errorMessage;
  }, [errorMessage]);

  const onGestureDetectedRef = useRef(onGestureDetected);
  useEffect(() => {
    onGestureDetectedRef.current = onGestureDetected;
  }, [onGestureDetected]);

  const handleResults = useCallback((results: any) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw video frame (mirrored)
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

    const multi = Array.isArray(results.multiHandLandmarks) ? results.multiHandLandmarks : [];

    if (multi.length > 0) {
      // Draw all hands
      for (const landmarks of multi) {
        const mirroredLandmarks = landmarks.map((lm: any) => ({
          x: 1 - lm.x,
          y: lm.y,
          z: lm.z,
        }));

        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          window.drawConnectors(ctx, mirroredLandmarks, window.HAND_CONNECTIONS, {
            color: 'rgba(0, 200, 255, 0.6)',
            lineWidth: 3,
          });
        } else {
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
          ctx.lineWidth = 3;
          for (const [i, j] of HAND_CONNECTIONS_LOCAL) {
            ctx.beginPath();
            ctx.moveTo(mirroredLandmarks[i].x * canvas.width, mirroredLandmarks[i].y * canvas.height);
            ctx.lineTo(mirroredLandmarks[j].x * canvas.width, mirroredLandmarks[j].y * canvas.height);
            ctx.stroke();
          }
        }

        if (window.drawLandmarks) {
          window.drawLandmarks(ctx, mirroredLandmarks, {
            color: '#00d4ff',
            fillColor: 'rgba(180, 80, 255, 0.8)',
            lineWidth: 2,
            radius: 5,
          });
        }
      }

      // Classify BOTH hands, but emit a single best result per frame
      let best: GestureClassificationResult = { gesture: null, confidence: 0 };

      for (const landmarks of multi) {
        const handLandmarks: HandLandmarks[] = landmarks.map((lm: any) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }));

        const result = classifyGesture(handLandmarks);
        if ((result.confidence ?? 0) > (best.confidence ?? 0)) {
          best = result;
        }
      }

      onGestureDetectedRef.current(best);
    } else {
      onGestureDetectedRef.current({ gesture: null, confidence: 0 });
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('[Camera] Stopping camera...');

    // Cancel any in-flight starts
    lifecycleRef.current += 1;

    isStartingRef.current = false;
    isProcessingRef.current = false;
    inFlightSendRef.current = false;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
        console.log('[Camera] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    isInitializedRef.current = false;
    setIsInitialized(false);
    setIsLoading(false);
  }, []);

  // Close MediaPipe only when the hook truly unmounts (prevents wasm reload thrash on stop/start).
  useEffect(() => {
    return () => {
      try {
        handsRef.current?.close?.();
      } catch (err) {
        console.warn('[Camera] Error closing MediaPipe hands on unmount:', err);
      }
      handsRef.current = null;
    };
  }, []);

  const startProcessingLoop = useCallback(() => {
    if (isProcessingRef.current) return;

    const tick = async () => {
      if (!isProcessingRef.current) return;

      const video = videoRef.current;
      const hands = handsRef.current;

      if (!video || !hands) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      if (video.readyState < 2) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      // Prevent overlapping sends (avoids instability)
      if (inFlightSendRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      inFlightSendRef.current = true;
      try {
        await hands.send({ image: video });
      } catch (err) {
        // If we're still running, log explicitly.
        if (handsRef.current) {
          console.error('[Camera] MediaPipe send() error:', err);
        }
      } finally {
        inFlightSendRef.current = false;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    isProcessingRef.current = true;
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    // Prevent multiple initializations.
    if (isStartingRef.current || isInitializedRef.current) return;

    const startId = (lifecycleRef.current += 1);

    const stillCurrent = () => lifecycleRef.current === startId && isActive;

    try {
      isStartingRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[Camera] Starting camera initialization...');

      // Ensure page + CDN scripts are fully loaded.
      await waitForPageLoad();
      if (!stillCurrent()) return;

      // Enforce secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          throw new Error('Camera access requires a secure connection (HTTPS).');
        }
      }

      // Wait for MediaPipe libraries
      console.log('[MediaPipe] Waiting for libraries to load...');
      const loaded = await waitForMediaPipe();
      if (!loaded) {
        throw new Error('Failed to load hand detection libraries. Please refresh the page.');
      }
      if (!stillCurrent()) return;

      if (typeof window.Hands !== 'function') {
        console.error('[MediaPipe] window.Hands is:', typeof window.Hands);
        throw new Error('Hand detection library not available. Please refresh the page.');
      }

      // Request camera permission and get a live stream (single getUserMedia call).
      const stream = await requestPermission({
        width: { ideal: 640, min: 320, max: 1920 },
        height: { ideal: 480, min: 240, max: 1080 },
        facingMode: 'user',
        frameRate: { ideal: 30, max: 60 },
      });

      if (!stillCurrent()) {
        // If we got a stream but we are no longer active, stop it immediately.
        stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        return;
      }

      if (!stream) {
        console.error('[Camera] Permission not granted / stream not available');
        setError(errorMessageRef.current || 'Camera permission denied');
        setIsLoading(false);
        isStartingRef.current = false;
        return;
      }

      console.log('[Camera] Media stream obtained, attaching to video element...');

      streamRef.current = stream;
      video.srcObject = stream;

      await waitForVideoReady(video);
      if (!stillCurrent()) return;

      try {
        await video.play();
      } catch (err) {
        // On some environments, play may reject even after permission.
        console.error('[Camera] Error calling video.play():', err);
      }

      if (!stillCurrent()) return;

      // Create MediaPipe Hands once and reuse it across start/stop.
      if (!handsRef.current) {
        console.log('[MediaPipe] Initializing Hands...');
        const hands = new window.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VERSION}/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(handleResults);
        handsRef.current = hands;
      } else {
        // Ensure we are configured for 2 hands even after restarts.
        try {
          handsRef.current.setOptions?.({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
          });
          handsRef.current.onResults?.(handleResults);
        } catch (err) {
          console.warn('[MediaPipe] Failed to reconfigure Hands:', err);
        }
      }

      // Start processing frames (no MediaPipe Camera helper; avoids double getUserMedia).
      startProcessingLoop();

      isInitializedRef.current = true;
      setIsInitialized(true);
      setIsLoading(false);
      isStartingRef.current = false;

      console.log('[Camera] Camera started successfully');
    } catch (err) {
      const e = err as Error & { name?: string };
      console.error('[Camera] Failed to start camera:', e.name, e.message);

      let errorMsg = 'Failed to access camera';

      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access denied. Please enable camera permissions in your browser settings.';
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found. Please connect a camera to your device.';
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        errorMsg = 'Camera is in use by another application. Please close other apps using the camera.';
      } else if (e.name === 'TypeError') {
        errorMsg = 'Your browser does not support camera access. Please use Chrome, Edge, Firefox, or Safari.';
      } else if (e.message) {
        errorMsg = e.message;
      }

      setError(errorMsg);
      stopCamera();
      isStartingRef.current = false;
    }
  }, [isActive, requestPermission, startProcessingLoop, stopCamera, handleResults]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  // Update error from permission state
  useEffect(() => {
    if (
      permissionState === 'denied' ||
      permissionState === 'unsupported' ||
      permissionState === 'insecure' ||
      permissionState === 'not-found' ||
      permissionState === 'in-use'
    ) {
      setError(errorMessage);
    }
  }, [permissionState, errorMessage]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    permissionState,
    isInitialized,
  };
}
