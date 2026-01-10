// Re-export from new modular gesture system
export { 
  ALL_GESTURES as GESTURES,
  QUICK_PHRASES,
  ASL_ALPHABET,
  ASL_NUMBERS,
  COMMON_GESTURES,
  TWO_HAND_GESTURES,
  ASL_WORDS,
  GESTURE_MAP,
  getGestureByName,
} from './gestureDatabase';

export { 
  classifyGesture,
  classifyTwoHands,
  type TwoHandClassificationResult,
} from './gestureClassifier';

export {
  GestureTemporalSmoother,
  smoothGesture,
  resetSmoothing,
  getGlobalSmoother,
} from './temporalSmoothing';

// Legacy exports for backward compatibility
import { HandLandmarks } from '@/types/gesture';

export interface GestureTrainingData {
  gestureName: string;
  landmarks: HandLandmarks[];
  timestamp: number;
  metadata?: {
    lighting?: string;
    angle?: string;
    distance?: string;
    handedness?: 'left' | 'right';
  };
}

export function saveGestureTrainingData(data: GestureTrainingData): void {
  try {
    const existing = localStorage.getItem('gestureTrainingData');
    const allData: GestureTrainingData[] = existing ? JSON.parse(existing) : [];
    allData.push(data);
    if (allData.length > 1000) allData.splice(0, allData.length - 1000);
    localStorage.setItem('gestureTrainingData', JSON.stringify(allData));
  } catch (err) {
    console.warn('[Gesture] Failed to save training data:', err);
  }
}

export function exportGestureTrainingData(): string {
  try {
    return localStorage.getItem('gestureTrainingData') || '[]';
  } catch {
    return '[]';
  }
}