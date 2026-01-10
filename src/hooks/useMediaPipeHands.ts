import { useEffect, useRef, useCallback, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { HandLandmarks, GestureClassificationResult } from '@/types/gesture';
import { classifyGesture } from '@/lib/gestures';

interface UseMediaPipeHandsOptions {
  onGestureDetected: (result: GestureClassificationResult) => void;
  isActive: boolean;
}

export function useMediaPipeHands({ onGestureDetected, isActive }: UseMediaPipeHandsOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw video frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mirror the video
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }
    
    ctx.restore();

    // Draw hand landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // Mirror the landmarks for drawing
        const mirroredLandmarks = landmarks.map(lm => ({
          x: 1 - lm.x,
          y: lm.y,
          z: lm.z
        }));

        // Draw connections with gradient
        drawConnectors(ctx, mirroredLandmarks, HAND_CONNECTIONS, {
          color: 'rgba(0, 200, 255, 0.6)',
          lineWidth: 3
        });
        
        // Draw landmarks with glow effect
        drawLandmarks(ctx, mirroredLandmarks, {
          color: '#00d4ff',
          fillColor: 'rgba(180, 80, 255, 0.8)',
          lineWidth: 2,
          radius: 5
        });

        // Classify gesture using original landmarks
        const handLandmarks: HandLandmarks[] = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z
        }));

        const result = classifyGesture(handLandmarks);
        onGestureDetected(result);
      }
    } else {
      onGestureDetected({ gesture: null, confidence: 0 });
    }
  }, [onGestureDetected]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !isActive) return;

    try {
      setIsLoading(true);
      setError(null);

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Start camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      cameraRef.current = camera;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      setIsLoading(false);
    }
  }, [isActive, onResults]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
  }, []);

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

  return {
    videoRef,
    canvasRef,
    isLoading,
    error
  };
}
