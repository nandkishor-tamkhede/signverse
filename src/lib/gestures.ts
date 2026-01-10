import { GestureDefinition, HandLandmarks, GestureClassificationResult } from '@/types/gesture';

// Complete gesture definitions - easy to extend
// Each gesture includes training data hints for future ML expansion
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
    name: 'thumbs_down',
    englishText: 'Bad',
    hindiText: 'बुरा',
    emoji: '👎',
    description: 'Thumbs down'
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
    name: 'four',
    englishText: 'Four',
    hindiText: 'चार',
    emoji: '🖖',
    description: 'Four fingers up'
  },
  {
    name: 'five',
    englishText: 'Five',
    hindiText: 'पाँच',
    emoji: '🖐',
    description: 'All five fingers up'
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
  },
  {
    name: 'rock',
    englishText: 'Rock On',
    hindiText: 'रॉक ऑन',
    emoji: '🤘',
    description: 'Index and pinky extended'
  },
  {
    name: 'point_up',
    englishText: 'Attention',
    hindiText: 'ध्यान दो',
    emoji: '👆',
    description: 'Index finger pointing up'
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
  { text: 'Pain', hindi: 'दर्द', emoji: '😣' },
  { text: 'Thank you', hindi: 'धन्यवाद', emoji: '🙏' },
  { text: 'Yes', hindi: 'हाँ', emoji: '✅' },
  { text: 'No', hindi: 'नहीं', emoji: '❌' },
  { text: 'I understand', hindi: 'मैं समझता हूँ', emoji: '👍' }
];

// Finger landmark indices for MediaPipe Hands (21 landmarks)
const FINGER_TIPS = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
const FINGER_PIPS = [3, 6, 10, 14, 18]; // PIP joints (proximal interphalangeal)
const FINGER_MCPS = [2, 5, 9, 13, 17]; // MCP joints (metacarpophalangeal)
const FINGER_DIPS = [3, 7, 11, 15, 19]; // DIP joints (distal interphalangeal)

// Enhanced finger extension detection with better accuracy
function isFingerExtended(
  landmarks: HandLandmarks[], 
  fingerTip: number, 
  fingerPip: number, 
  fingerMcp: number,
  fingerDip: number, 
  isThumb: boolean = false
): boolean {
  if (isThumb) {
    // For thumb, check if tip is away from palm center AND extended outward
    const palmCenter = landmarks[0]; // Wrist
    const indexMcp = landmarks[5];
    
    // Calculate thumb extension based on distance from index MCP
    const tipToIndex = Math.abs(landmarks[fingerTip].x - indexMcp.x);
    const mcpToIndex = Math.abs(landmarks[fingerMcp].x - indexMcp.x);
    
    // Also check Y-axis for vertical thumbs up/down
    const isHorizontallyExtended = tipToIndex > mcpToIndex;
    const tipY = landmarks[fingerTip].y;
    const mcpY = landmarks[fingerMcp].y;
    const isVerticallyExtended = Math.abs(tipY - mcpY) > 0.05;
    
    return isHorizontallyExtended || isVerticallyExtended;
  }
  
  // For other fingers: tip should be above PIP (lower y = higher on screen)
  // Also check straightness using DIP joint
  const tipAbovePip = landmarks[fingerTip].y < landmarks[fingerPip].y;
  const pipAboveMcp = landmarks[fingerPip].y < landmarks[fingerMcp].y;
  
  // More robust: check if finger is reasonably straight
  return tipAbovePip && pipAboveMcp;
}

// Get finger curl amount (0 = fully extended, 1 = fully curled)
function getFingerCurl(landmarks: HandLandmarks[], fingerIdx: number): number {
  const tipIdx = FINGER_TIPS[fingerIdx];
  const pipIdx = FINGER_PIPS[fingerIdx];
  const mcpIdx = FINGER_MCPS[fingerIdx];
  
  const tipY = landmarks[tipIdx].y;
  const pipY = landmarks[pipIdx].y;
  const mcpY = landmarks[mcpIdx].y;
  
  // Calculate curl based on tip position relative to pip and mcp
  const totalDist = Math.abs(mcpY - pipY) + 0.001; // Avoid division by zero
  const tipFromPip = tipY - pipY;
  
  // Normalize: negative = extended, positive = curled
  return Math.max(0, Math.min(1, (tipFromPip / totalDist + 0.5)));
}

function getFingerStates(landmarks: HandLandmarks[]): boolean[] {
  return [
    isFingerExtended(landmarks, FINGER_TIPS[0], FINGER_PIPS[0], FINGER_MCPS[0], FINGER_DIPS[0], true), // Thumb
    isFingerExtended(landmarks, FINGER_TIPS[1], FINGER_PIPS[1], FINGER_MCPS[1], FINGER_DIPS[1]), // Index
    isFingerExtended(landmarks, FINGER_TIPS[2], FINGER_PIPS[2], FINGER_MCPS[2], FINGER_DIPS[2]), // Middle
    isFingerExtended(landmarks, FINGER_TIPS[3], FINGER_PIPS[3], FINGER_MCPS[3], FINGER_DIPS[3]), // Ring
    isFingerExtended(landmarks, FINGER_TIPS[4], FINGER_PIPS[4], FINGER_MCPS[4], FINGER_DIPS[4]), // Pinky
  ];
}

function calculateDistance(p1: HandLandmarks, p2: HandLandmarks): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

// Calculate angle between three points
function calculateAngle(p1: HandLandmarks, p2: HandLandmarks, p3: HandLandmarks): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
}

// Check if thumb is pointing up
function isThumbsUp(landmarks: HandLandmarks[], fingerStates: boolean[]): boolean {
  const [thumbUp, indexUp, middleUp, ringUp, pinkyUp] = fingerStates;
  
  // Thumb must be extended and pointing up
  if (!thumbUp) return false;
  
  // Other fingers should be curled
  if (indexUp || middleUp || ringUp || pinkyUp) return false;
  
  // Check thumb orientation - tip should be above MCP
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const isPointingUp = thumbTip.y < thumbMcp.y - 0.05;
  
  return isPointingUp;
}

// Check if thumb is pointing down
function isThumbsDown(landmarks: HandLandmarks[], fingerStates: boolean[]): boolean {
  const [thumbUp, indexUp, middleUp, ringUp, pinkyUp] = fingerStates;
  
  // Thumb must be extended
  if (!thumbUp) return false;
  
  // Other fingers should be curled
  if (indexUp || middleUp || ringUp || pinkyUp) return false;
  
  // Check thumb orientation - tip should be below MCP
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const isPointingDown = thumbTip.y > thumbMcp.y + 0.05;
  
  return isPointingDown;
}

export function classifyGesture(landmarks: HandLandmarks[]): GestureClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: null, confidence: 0 };
  }

  const fingerStates = getFingerStates(landmarks);
  const [thumbUp, indexUp, middleUp, ringUp, pinkyUp] = fingerStates;
  const extendedCount = fingerStates.filter(Boolean).length;

  // Calculate key distances for specific gestures
  const thumbIndexDist = calculateDistance(landmarks[4], landmarks[8]);
  const isThumbIndexTouch = thumbIndexDist < 0.06;

  // Get finger curl values for more nuanced detection
  const indexCurl = getFingerCurl(landmarks, 1);
  const middleCurl = getFingerCurl(landmarks, 2);
  const ringCurl = getFingerCurl(landmarks, 3);
  const pinkyCurl = getFingerCurl(landmarks, 4);

  let gesture: GestureDefinition | null = null;
  let confidence = 0;

  // Closed Fist - all fingers curled
  if (extendedCount === 0) {
    gesture = GESTURES.find(g => g.name === 'closed_fist') || null;
    confidence = 0.92;
  }
  // Thumbs Up
  else if (isThumbsUp(landmarks, fingerStates)) {
    gesture = GESTURES.find(g => g.name === 'thumbs_up') || null;
    confidence = 0.93;
  }
  // Thumbs Down
  else if (isThumbsDown(landmarks, fingerStates)) {
    gesture = GESTURES.find(g => g.name === 'thumbs_down') || null;
    confidence = 0.93;
  }
  // One - only index finger
  else if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'one') || null;
    confidence = 0.88;
  }
  // Two/Victory - index and middle fingers
  else if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'victory') || null;
    confidence = 0.87;
  }
  // Three - index, middle, ring (no thumb)
  else if (!thumbUp && indexUp && middleUp && ringUp && !pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'three') || null;
    confidence = 0.87;
  }
  // Four - index, middle, ring, pinky (no thumb)
  else if (!thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'four') || null;
    confidence = 0.87;
  }
  // Five / Open Palm - all fingers including thumb
  else if (thumbUp && indexUp && middleUp && ringUp && pinkyUp && extendedCount === 5) {
    // Check hand orientation for Hello vs Stop
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const isWaving = Math.abs(wrist.x - middleTip.x) > 0.12;
    
    if (isWaving) {
      gesture = GESTURES.find(g => g.name === 'hello') || null;
      confidence = 0.82;
    } else {
      gesture = GESTURES.find(g => g.name === 'five') || null;
      confidence = 0.88;
    }
  }
  // I Love You - thumb, index, pinky extended
  else if (thumbUp && indexUp && !middleUp && !ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'i_love_you') || null;
    confidence = 0.90;
  }
  // Call Me - thumb and pinky only
  else if (thumbUp && !indexUp && !middleUp && !ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'call') || null;
    confidence = 0.88;
  }
  // Rock On - index and pinky only (no thumb)
  else if (!thumbUp && indexUp && !middleUp && !ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'rock') || null;
    confidence = 0.87;
  }
  // OK gesture - thumb and index touching, others extended
  else if (isThumbIndexTouch && middleUp && ringUp && pinkyUp) {
    gesture = GESTURES.find(g => g.name === 'ok') || null;
    confidence = 0.88;
  }
  // Fallback for open palm when most fingers are up
  else if (extendedCount >= 4) {
    gesture = GESTURES.find(g => g.name === 'open_palm') || null;
    confidence = 0.80;
  }

  return { gesture, confidence };
}

// Export for gesture data collection (future ML training)
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

// Helper to save gesture data for training (localStorage for now)
export function saveGestureTrainingData(data: GestureTrainingData): void {
  try {
    const existing = localStorage.getItem('gestureTrainingData');
    const allData: GestureTrainingData[] = existing ? JSON.parse(existing) : [];
    allData.push(data);
    
    // Keep last 1000 samples to avoid storage issues
    if (allData.length > 1000) {
      allData.splice(0, allData.length - 1000);
    }
    
    localStorage.setItem('gestureTrainingData', JSON.stringify(allData));
    console.log(`[Gesture] Saved training sample for: ${data.gestureName}`);
  } catch (err) {
    console.warn('[Gesture] Failed to save training data:', err);
  }
}

// Export gesture data as JSON
export function exportGestureTrainingData(): string {
  try {
    const data = localStorage.getItem('gestureTrainingData');
    return data || '[]';
  } catch {
    return '[]';
  }
}
