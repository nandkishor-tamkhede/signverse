import { useEffect, useRef, useCallback, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { HandLandmarks, GestureClassificationResult } from '@/types/gesture';
import { classifyGesture } from '@/lib/gestures';
import { useCameraPermission, CameraPermissionState } from './useCameraPermission';

interface UseMediaPipeHandsOptions {
  onGestureDetected: (result: GestureClassificationResult) => void;
  isActive: boolean;
}

export function useMediaPipeHands({ onGestureDetected, isActive }: UseMediaPipeHandsOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { permissionState, errorMessage, requestPermission } = useCameraPermission();

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

  const stopCamera = useCallback(() => {
    console.log('[Camera] Stopping camera...');
    
    // Stop MediaPipe camera
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (err) {
        console.warn('[Camera] Error stopping MediaPipe camera:', err);
      }
      cameraRef.current = null;
    }
    
    // Close MediaPipe hands
    if (handsRef.current) {
      try {
        handsRef.current.close();
      } catch (err) {
        console.warn('[Camera] Error closing MediaPipe hands:', err);
      }
      handsRef.current = null;
    }
    
    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[Camera] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsInitialized(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !isActive) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('[Camera] Starting camera initialization...');

      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        console.error('[Camera] Permission not granted');
        setError(errorMessage || 'Camera permission denied');
        setIsLoading(false);
        return;
      }

      console.log('[Camera] Permission granted, getting media stream...');

      // Get media stream with proper constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320, max: 1920 },
          height: { ideal: 480, min: 240, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      console.log('[Camera] Media stream obtained, waiting for video to load...');

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current;
        if (!video) {
          reject(new Error('Video element not found'));
          return;
        }

        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          console.log('[Camera] Video metadata loaded');
          resolve();
        };

        const onError = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          reject(new Error('Failed to load video'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('error', onError);

        // Play the video
        video.play().catch(err => {
          console.error('[Camera] Error playing video:', err);
        });
      });

      console.log('[Camera] Initializing MediaPipe Hands...');

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

      console.log('[Camera] Starting MediaPipe camera...');

      // Start camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (err) {
              // Silently ignore frame send errors during shutdown
              if (handsRef.current) {
                console.warn('[Camera] Frame send error:', err);
              }
            }
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      cameraRef.current = camera;
      setIsInitialized(true);
      setIsLoading(false);
      
      console.log('[Camera] Camera started successfully');
    } catch (err) {
      const error = err as Error & { name?: string };
      console.error('[Camera] Failed to start camera:', error.name, error.message);
      
      // Map error to user-friendly message
      let errorMsg = 'Failed to access camera';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access denied. Please enable camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found. Please connect a camera to your device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMsg = 'Camera is in use by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMsg = 'Camera does not support the required settings.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      setIsLoading(false);
      stopCamera();
    }
  }, [isActive, onResults, requestPermission, errorMessage, stopCamera]);

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
    if (permissionState === 'denied' || permissionState === 'unsupported' || 
        permissionState === 'insecure' || permissionState === 'not-found' || 
        permissionState === 'in-use') {
      setError(errorMessage);
    }
  }, [permissionState, errorMessage]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    permissionState,
    isInitialized
  };
}
