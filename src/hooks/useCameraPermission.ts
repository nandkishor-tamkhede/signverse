import { useState, useEffect, useCallback, useRef } from 'react';
import { CameraState, CameraError, useCameraStream } from './useCameraStream';

// Re-export types for backward compatibility
export type CameraPermissionState = CameraState;

interface UseCameraPermissionReturn {
  permissionState: CameraState;
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

/**
 * @deprecated Use useCameraStream instead for better control and reliability
 */
export function useCameraPermission(): UseCameraPermissionReturn {
  const camera = useCameraStream({ video: true, audio: false });

  const requestPermission = useCallback(
    async (videoConstraints?: MediaTrackConstraints): Promise<MediaStream | null> => {
      return camera.start();
    },
    [camera]
  );

  const checkPermission = useCallback(async () => {
    // Permission check is done automatically in useCameraStream
  }, []);

  return {
    permissionState: camera.state,
    errorMessage: camera.error?.message || null,
    requestPermission,
    checkPermission,
    releaseStream: camera.stop,
  };
}
