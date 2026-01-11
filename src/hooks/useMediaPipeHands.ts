import { useEffect, useRef, useCallback, useState } from 'react';
import { HandLandmarks, GestureClassificationResult } from '@/types/gesture';
import { classifyGesture } from '@/lib/gestures';
import { useCameraStream, CameraState, CameraError } from './useCameraStream';

interface UseMediaPipeHandsOptions {
  onGestureDetected: (result: GestureClassificationResult) => void;
  isActive: boolean;
}

interface UseMediaPipeHandsReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isLoading: boolean;
  error: string | null;
  permissionState: CameraState;
  isInitialized: boolean;
}

const HAND_CONNECTIONS_LOCAL: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [0, 9], [9, 10], [10, 11], [11, 12], // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17], // palm
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
        console.error('[MediaPipe] Timeout waiting for libraries');
        resolve(false);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

async function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 10000): Promise<void> {
  if (video.readyState >= 2) return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Video ready timeout'));
    }, timeoutMs);

    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Video error'));
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

export function useMediaPipeHands({
  onGestureDetected,
  isActive,
}: UseMediaPipeHandsOptions): UseMediaPipeHandsReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);

  const rafIdRef = useRef<number | null>(null);
  const inFlightSendRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lifecycleRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use unified camera stream hook
  const camera = useCameraStream({ 
    video: {
      width: { ideal: 640, min: 320, max: 1920 },
      height: { ideal: 480, min: 240, max: 1080 },
      facingMode: 'user',
      frameRate: { ideal: 30, max: 60 },
    },
    audio: false,
  });

  // Keep callback ref stable
  const onGestureDetectedRef = useRef(onGestureDetected);
  useEffect(() => {
    onGestureDetectedRef.current = onGestureDetected;
  }, [onGestureDetected]);

  // Handle MediaPipe results
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

    const multiHands = Array.isArray(results.multiHandLandmarks)
      ? results.multiHandLandmarks
      : [];

    if (multiHands.length > 0) {
      // Draw all hands
      for (const landmarks of multiHands) {
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
            ctx.moveTo(
              mirroredLandmarks[i].x * canvas.width,
              mirroredLandmarks[i].y * canvas.height
            );
            ctx.lineTo(
              mirroredLandmarks[j].x * canvas.width,
              mirroredLandmarks[j].y * canvas.height
            );
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

      // Classify hands and emit best result
      let best: GestureClassificationResult = { gesture: null, confidence: 0 };

      for (const landmarks of multiHands) {
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

  // Stop processing
  const stopProcessing = useCallback(() => {
    console.log('[MediaPipe] Stopping processing...');
    
    lifecycleRef.current += 1;
    isProcessingRef.current = false;
    inFlightSendRef.current = false;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setIsInitialized(false);
    setIsLoading(false);
  }, []);

  // Start processing loop
  const startProcessingLoop = useCallback(() => {
    if (isProcessingRef.current) return;

    const tick = async () => {
      if (!isProcessingRef.current) return;

      const video = videoRef.current;
      const hands = handsRef.current;

      if (!video || !hands || video.readyState < 2 || inFlightSendRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      inFlightSendRef.current = true;
      try {
        await hands.send({ image: video });
      } catch (err) {
        if (handsRef.current) {
          console.error('[MediaPipe] Send error:', err);
        }
      } finally {
        inFlightSendRef.current = false;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    isProcessingRef.current = true;
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  // Initialize camera and MediaPipe
  const initialize = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const startId = (lifecycleRef.current += 1);
    const stillCurrent = () => lifecycleRef.current === startId && isActive;

    try {
      setIsLoading(true);
      setError(null);

      console.log('[MediaPipe] Starting initialization...');

      // Wait for MediaPipe libraries
      const loaded = await waitForMediaPipe();
      if (!loaded) {
        throw new Error('Failed to load hand detection. Please refresh.');
      }
      if (!stillCurrent()) return;

      // Request camera access
      const stream = await camera.start();
      if (!stillCurrent()) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!stream) {
        console.error('[MediaPipe] Camera access failed');
        setError(camera.error?.message || 'Camera access denied');
        setIsLoading(false);
        return;
      }

      // Attach stream to video element
      console.log('[MediaPipe] Attaching stream to video...');
      camera.attachToVideo(video);

      // Wait for video to be ready
      await waitForVideoReady(video);
      if (!stillCurrent()) return;

      // Initialize or reuse MediaPipe Hands
      if (!handsRef.current) {
        console.log('[MediaPipe] Creating Hands instance...');
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
        // Reconfigure existing instance
        try {
          handsRef.current.setOptions?.({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
          });
          handsRef.current.onResults?.(handleResults);
        } catch (err) {
          console.warn('[MediaPipe] Reconfigure failed:', err);
        }
      }

      // Start processing frames
      startProcessingLoop();

      setIsInitialized(true);
      setIsLoading(false);
      console.log('[MediaPipe] Initialization complete');
    } catch (err) {
      const e = err as Error;
      console.error('[MediaPipe] Initialization failed:', e.message);
      setError(e.message || 'Failed to start camera');
      stopProcessing();
    }
  }, [isActive, camera, handleResults, startProcessingLoop, stopProcessing]);

  // Handle active state changes
  useEffect(() => {
    if (isActive) {
      initialize();
    } else {
      stopProcessing();
      camera.stop();
    }

    return () => {
      stopProcessing();
      camera.stop();
    };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync camera errors
  useEffect(() => {
    if (camera.error) {
      setError(camera.error.message);
    }
  }, [camera.error]);

  // Cleanup MediaPipe on unmount
  useEffect(() => {
    return () => {
      try {
        handsRef.current?.close?.();
      } catch (err) {
        console.warn('[MediaPipe] Close error:', err);
      }
      handsRef.current = null;
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading: isLoading || camera.isLoading,
    error,
    permissionState: camera.state,
    isInitialized,
  };
}
