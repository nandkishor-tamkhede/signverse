import { GestureDefinition, HandLandmarks, GestureClassificationResult } from '@/types/gesture';

// Complete gesture definitions - easy to extend
export const GESTURES: GestureDefinition[] = [
  {
    name: 'hello',
    englishText: 'Hello',
    hindiText: 'नमस्ते',
    emoji: '👋',
    description: 'Open palm waving'
  },
  {
    name: 'stop',
    englishText: 'Stop',
    hindiText: 'रुको',
    emoji: '✋',
    description: 'Open palm facing forward'
  },
  {
    name: 'yes',
    englishText: 'Yes',
    hindiText: 'हाँ',
    emoji: '👍',
    description: 'Thumbs up gesture'
  },
  {
    name: 'no',
    englishText: 'No',
    hindiText: 'नहीं',
    emoji: '👎',
    description: 'Thumbs down gesture'
  },
  {
    name: 'thank_you',
    englishText: 'Thank You',
    hindiText: 'धन्यवाद',
    emoji: '🙏',
    description: 'Both palms together'
  },
  {
    name: 'i_love_you',
    englishText: 'I Love You',
    hindiText: 'मैं तुमसे प्यार करता हूँ',
    emoji: '🤟',
    description: 'Thumb, index and pinky extended'
  },
  {
    name: 'victory',
    englishText: 'Victory',
    hindiText: 'जीत',
    emoji: '✌️',
    description: 'Peace sign - two fingers up'
  },
  {
    name: 'thumbs_up',
    englishText: 'Good',
    hindiText: 'अच्छा',
    emoji: '👍',
    description: 'Thumbs up'
  },
  {
    name: 'open_palm',
    englishText: 'Open Palm',
    hindiText: 'खुली हथेली',
    emoji: '✋',
    description: 'All fingers extended'
  },
  {
    name: 'closed_fist',
    englishText: 'Fist',
    hindiText: 'मुट्ठी',
    emoji: '✊',
    description: 'All fingers closed'
  },
  {
    name: 'one',
    englishText: 'One',
    hindiText: 'एक',
    emoji: '☝️',
    description: 'Index finger pointing up'
  },
  {
    name: 'two',
    englishText: 'Two',
    hindiText: 'दो',
    emoji: '✌️',
    description: 'Two fingers up'
  },
  {
    name: 'three',
    englishText: 'Three',
    hindiText: 'तीन',
    emoji: '🤟',
    description: 'Three fingers up'
  },
  {
    name: 'ok',
    englishText: 'OK',
    hindiText: 'ठीक है',
    emoji: '👌',
    description: 'Thumb and index forming circle'
  },
  {
    name: 'call',
    englishText: 'Call Me',
    hindiText: 'मुझे फोन करो',
    emoji: '🤙',
    description: 'Thumb and pinky extended'
  }
];

// Quick phrases for common needs
export const QUICK_PHRASES = [
  { text: 'Help', hindi: 'मदद', emoji: '🆘' },
  { text: 'Water please', hindi: 'पानी चाहिए', emoji: '💧' },
  { text: 'Call someone', hindi: 'किसी को बुलाओ', emoji: '📞' },
  { text: 'I need assistance', hindi: 'मुझे सहायता चाहिए', emoji: '🙋' },
  { text: 'Bathroom', hindi: 'बाथरूम', emoji: '🚻' },
  { text: 'Food', hindi: 'खाना', emoji: '🍽️' },
  { text: 'Medicine', hindi: 'दवाई', emoji: '💊' },
  { text: 'Pain', hindi: 'दर्द', emoji: '😣' }
];

// Finger landmark indices for MediaPipe Hands
const FINGER_TIPS = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
const FINGER_PIPS = [3, 6, 10, 14, 18]; // PIP joints
const FINGER_MCPS = [2, 5, 9, 13, 17]; // MCP joints

function isFingerExtended(landmarks: HandLandmarks[], fingerTip: number, fingerPip: number, fingerMcp: number, isThumb: boolean = false): boolean {
  if (isThumb) {
    // For thumb, check if tip is away from palm center
    const palmCenter = landmarks[0];
    const tipDist = Math.abs(landmarks[fingerTip].x - palmCenter.x);
    const mcpDist = Math.abs(landmarks[fingerMcp].x - palmCenter.x);
    return tipDist > mcpDist;
  }
  
  // For other fingers, tip should be above PIP (lower y value)
  return landmarks[fingerTip].y < landmarks[fingerPip].y;
}

function getFingerStates(landmarks: HandLandmarks[]): boolean[] {
  return [
    isFingerExtended(landmarks, FINGER_TIPS[0], FINGER_PIPS[0], FINGER_MCPS[0], true), // Thumb
    isFingerExtended(landmarks, FINGER_TIPS[1], FINGER_PIPS[1], FINGER_MCPS[1]), // Index
    isFingerExtended(landmarks, FINGER_TIPS[2], FINGER_PIPS[2], FINGER_MCPS[2]), // Middle
    isFingerExtended(landmarks, FINGER_TIPS[3], FINGER_PIPS[3], FINGER_MCPS[3]), // Ring
    isFingerExtended(landmarks, FINGER_TIPS[4], FINGER_PIPS[4], FINGER_MCPS[4]), // Pinky
  ];
}

function calculateDistance(p1: HandLandmarks, p2: HandLandmarks): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

export function classifyGesture(landmarks: HandLandmarks[]): GestureClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: null, confidence: 0 };
  }

  const fingerStates = getFingerStates(landmarks);
  const [thumbUp, indexUp, middleUp, ringUp, pinkyUp] = fingerStates;
  const extendedCount = fingerStates.filter(Boolean).length;

  // Thumb and index touch detection for OK gesture
  const thumbIndexDist = calculateDistance(landmarks[4], landmarks[8]);
  const isThumbIndexTouch = thumbIndexDist < 0.05;

  let gesture: GestureDefinition | null = null;
  let confidence = 0;

  // Closed Fist - no fingers extended
  if (extendedCount === 0) {
    gesture = GESTURES.find(g => g.name === 'closed_fist') || null;
    confidence = 0.9;
  }
  // One - only index finger
  else if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'one') || null;
    confidence = 0.85;
  }
  // Two/Victory - index and middle fingers
  else if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'victory') || null;
    confidence = 0.85;
  }
  // Three - index, middle, ring
  else if (!thumbUp && indexUp && middleUp && ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'three') || null;
    confidence = 0.85;
  }
  // Thumbs Up - only thumb extended
  else if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'thumbs_up') || null;
    confidence = 0.9;
  }
  // I Love You - thumb, index, pinky
  else if (thumbUp && indexUp && !middleUp && !ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'i_love_you') || null;
    confidence = 0.88;
  }
  // Call Me - thumb and pinky only
  else if (thumbUp && !indexUp && !middleUp && !ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'call') || null;
    confidence = 0.85;
  }
  // OK gesture - thumb and index touching, others extended
  else if (isThumbIndexTouch && middleUp && ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'ok') || null;
    confidence = 0.85;
  }
  // Open Palm / Stop / Hello - all fingers extended
  else if (extendedCount >= 4) {
    // Check hand orientation for Hello vs Stop
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const isWaving = Math.abs(wrist.x - middleTip.x) > 0.1;
    
    if (isWaving) {
      gesture = GESTURES.find(g => g.name === 'hello') || null;
      confidence = 0.8;
    } else {
      gesture = GESTURES.find(g => g.name === 'open_palm') || null;
      confidence = 0.85;
    }
  }

  return { gesture, confidence };
}
