// Type declarations for MediaPipe loaded via CDN

declare global {
  interface Window {
    Hands: typeof import('@mediapipe/hands').Hands;
    Camera: typeof import('@mediapipe/camera_utils').Camera;
    drawConnectors: typeof import('@mediapipe/drawing_utils').drawConnectors;
    drawLandmarks: typeof import('@mediapipe/drawing_utils').drawLandmarks;
    HAND_CONNECTIONS: typeof import('@mediapipe/hands').HAND_CONNECTIONS;
  }
}

export {};
