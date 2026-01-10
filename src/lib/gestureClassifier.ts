import { HandLandmarks, GestureClassificationResult, GestureDefinition } from '@/types/gesture';
import { GESTURE_MAP, ALL_GESTURES } from './gestureDatabase';

// Finger landmark indices for MediaPipe Hands (21 landmarks)
const FINGER_TIPS = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
const FINGER_PIPS = [3, 6, 10, 14, 18]; // PIP joints
const FINGER_MCPS = [2, 5, 9, 13, 17]; // MCP joints
const FINGER_DIPS = [3, 7, 11, 15, 19]; // DIP joints

// Configuration for gesture detection
const CONFIG = {
  // Confidence thresholds
  MIN_CONFIDENCE: 0.65,
  HIGH_CONFIDENCE: 0.85,
  
  // Touch detection threshold (normalized distance)
  TOUCH_THRESHOLD: 0.08,
  CLOSE_THRESHOLD: 0.12,
  
  // Finger extension thresholds
  THUMB_EXTENSION_THRESHOLD: 0.04,
  FINGER_CURL_THRESHOLD: 0.4,
  
  // Angle thresholds (radians)
  STRAIGHT_ANGLE: 2.8, // ~160 degrees
  BENT_ANGLE: 2.0, // ~115 degrees
};

// ============ UTILITY FUNCTIONS ============

function calculateDistance(p1: HandLandmarks, p2: HandLandmarks): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

function calculate2DDistance(p1: HandLandmarks, p2: HandLandmarks): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateAngle(p1: HandLandmarks, p2: HandLandmarks, p3: HandLandmarks): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
  
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
}

function getPalmSize(landmarks: HandLandmarks[]): number {
  // Distance from wrist to middle finger MCP as reference
  return calculateDistance(landmarks[0], landmarks[9]);
}

function normalizeDistance(distance: number, palmSize: number): number {
  return distance / (palmSize + 0.001);
}

// ============ FINGER STATE DETECTION ============

interface FingerState {
  extended: boolean;
  curled: boolean;
  curl: number; // 0 = straight, 1 = fully curled
  angle: number; // Total finger angle
}

function getFingerAngle(landmarks: HandLandmarks[], fingerIdx: number): number {
  if (fingerIdx === 0) {
    // Thumb uses different joints
    const cmc = landmarks[1];
    const mcp = landmarks[2];
    const ip = landmarks[3];
    const tip = landmarks[4];
    return calculateAngle(cmc, mcp, ip) + calculateAngle(mcp, ip, tip);
  }
  
  const mcp = landmarks[FINGER_MCPS[fingerIdx]];
  const pip = landmarks[FINGER_PIPS[fingerIdx]];
  const dip = landmarks[FINGER_DIPS[fingerIdx]];
  const tip = landmarks[FINGER_TIPS[fingerIdx]];
  
  return calculateAngle(mcp, pip, dip) + calculateAngle(pip, dip, tip);
}

function getThumbState(landmarks: HandLandmarks[]): FingerState {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const thumbCmc = landmarks[1];
  const indexMcp = landmarks[5];
  const wrist = landmarks[0];
  
  // Check if thumb is away from palm
  const tipToIndex = calculate2DDistance(thumbTip, indexMcp);
  const mcpToIndex = calculate2DDistance(thumbMcp, indexMcp);
  const palmSize = getPalmSize(landmarks);
  
  // Thumb extension - check multiple criteria
  const isAwayFromPalm = tipToIndex > mcpToIndex * 0.8;
  const isVerticallyExtended = Math.abs(thumbTip.y - thumbMcp.y) > palmSize * 0.15;
  const isHorizontallyExtended = Math.abs(thumbTip.x - thumbMcp.x) > palmSize * 0.15;
  
  const angle = getFingerAngle(landmarks, 0);
  const extended = isAwayFromPalm && (isVerticallyExtended || isHorizontallyExtended);
  const curl = Math.max(0, Math.min(1, 1 - (angle / Math.PI)));
  
  return {
    extended,
    curled: !extended && curl > 0.5,
    curl,
    angle,
  };
}

function getFingerState(landmarks: HandLandmarks[], fingerIdx: number): FingerState {
  if (fingerIdx === 0) return getThumbState(landmarks);
  
  const tipIdx = FINGER_TIPS[fingerIdx];
  const pipIdx = FINGER_PIPS[fingerIdx];
  const mcpIdx = FINGER_MCPS[fingerIdx];
  const dipIdx = FINGER_DIPS[fingerIdx];
  
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];
  const dip = landmarks[dipIdx];
  
  // Check if finger is extended: tip above PIP and relatively straight
  const tipAbovePip = tip.y < pip.y - 0.01;
  const pipAboveMcp = pip.y < mcp.y - 0.01;
  
  const angle = getFingerAngle(landmarks, fingerIdx);
  const isRelativelyStraight = angle > CONFIG.STRAIGHT_ANGLE;
  
  const extended = tipAbovePip && pipAboveMcp && isRelativelyStraight;
  
  // Calculate curl amount
  const mcpToPipDist = calculate2DDistance(mcp, pip);
  const tipToPipDist = tip.y - pip.y; // Positive = below pip (curled)
  const curl = Math.max(0, Math.min(1, (tipToPipDist / (mcpToPipDist + 0.001)) + 0.3));
  
  return {
    extended,
    curled: !extended && curl > CONFIG.FINGER_CURL_THRESHOLD,
    curl,
    angle,
  };
}

function getAllFingerStates(landmarks: HandLandmarks[]): FingerState[] {
  return [0, 1, 2, 3, 4].map(i => getFingerState(landmarks, i));
}

function getExtendedFingers(states: FingerState[]): boolean[] {
  return states.map(s => s.extended);
}

function countExtended(states: FingerState[]): number {
  return states.filter(s => s.extended).length;
}

// ============ SPECIFIC GESTURE DETECTORS ============

function detectThumbsUp(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Thumb must be extended and pointing up
  if (!thumb.extended) return 0;
  if (index.extended || middle.extended || ring.extended || pinky.extended) return 0;
  
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  
  // Thumb tip should be significantly above MCP (pointing up)
  if (thumbTip.y >= thumbMcp.y - 0.05) return 0;
  
  // Higher confidence if more vertical
  const verticalness = Math.abs(thumbTip.x - thumbMcp.x) < 0.1 ? 0.1 : 0;
  
  return 0.88 + verticalness;
}

function detectThumbsDown(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  if (!thumb.extended) return 0;
  if (index.extended || middle.extended || ring.extended || pinky.extended) return 0;
  
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  
  // Thumb tip should be below MCP (pointing down)
  if (thumbTip.y <= thumbMcp.y + 0.05) return 0;
  
  return 0.88;
}

function detectClosedFist(states: FingerState[]): number {
  const extendedCount = countExtended(states);
  if (extendedCount > 0) return 0;
  
  // All fingers should have high curl
  const avgCurl = states.reduce((sum, s) => sum + s.curl, 0) / 5;
  return avgCurl > 0.5 ? 0.85 + avgCurl * 0.1 : 0;
}

function detectOpenPalm(states: FingerState[]): number {
  const extendedCount = countExtended(states);
  if (extendedCount < 5) return 0;
  
  return 0.90;
}

function detectVictory(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and middle extended, others not
  if (!index.extended || !middle.extended) return 0;
  if (ring.extended || pinky.extended) return 0;
  
  // Check spread between index and middle
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const spread = calculate2DDistance(indexTip, middleTip);
  const palmSize = getPalmSize(landmarks);
  
  // Victory sign has spread fingers
  if (normalizeDistance(spread, palmSize) > 0.15) {
    return 0.88;
  }
  
  // U sign (ASL) has fingers together
  return 0.75; // Lower confidence for ambiguous case
}

function detectILoveYou(states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Thumb, index, and pinky extended; middle and ring curled
  if (!thumb.extended || !index.extended || !pinky.extended) return 0;
  if (middle.extended || ring.extended) return 0;
  
  return 0.92;
}

function detectOK(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Thumb and index should be touching
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const palmSize = getPalmSize(landmarks);
  const touchDist = normalizeDistance(calculateDistance(thumbTip, indexTip), palmSize);
  
  if (touchDist > CONFIG.TOUCH_THRESHOLD) return 0;
  
  // Other fingers should be extended or partially extended
  if (!middle.extended && !ring.extended && !pinky.extended) return 0;
  
  return 0.88;
}

function detectCallMe(states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Only thumb and pinky extended
  if (!thumb.extended || !pinky.extended) return 0;
  if (index.extended || middle.extended || ring.extended) return 0;
  
  return 0.88;
}

function detectRock(states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and pinky extended, no thumb, others curled
  if (!index.extended || !pinky.extended) return 0;
  if (thumb.extended || middle.extended || ring.extended) return 0;
  
  return 0.87;
}

function detectPoint(states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Only index extended
  if (!index.extended) return 0;
  if (middle.extended || ring.extended || pinky.extended) return 0;
  
  return 0.86;
}

// ============ ASL LETTER DETECTORS ============

function detectASL_A(states: FingerState[]): number {
  // Fist with thumb beside (not over) fingers
  const [thumb, index, middle, ring, pinky] = states;
  
  if (index.extended || middle.extended || ring.extended || pinky.extended) return 0;
  if (!thumb.extended && thumb.curl < 0.6) return 0.80;
  
  return 0;
}

function detectASL_B(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Four fingers up, thumb tucked across palm
  if (!index.extended || !middle.extended || !ring.extended || !pinky.extended) return 0;
  if (thumb.extended) return 0;
  
  // Fingers should be together (not spread)
  const indexTip = landmarks[8];
  const pinkyTip = landmarks[20];
  const spread = calculate2DDistance(indexTip, pinkyTip);
  const palmSize = getPalmSize(landmarks);
  
  if (normalizeDistance(spread, palmSize) < 0.35) {
    return 0.82;
  }
  
  return 0;
}

function detectASL_C(landmarks: HandLandmarks[], states: FingerState[]): number {
  // All fingers curved forming C shape
  const [thumb, index, middle, ring, pinky] = states;
  
  // All fingers should be partially curled (not fully extended or fully curled)
  const allPartiallyCurled = states.every(s => s.curl > 0.2 && s.curl < 0.8);
  if (!allPartiallyCurled) return 0;
  
  // Check C shape - thumb and index should have gap
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const palmSize = getPalmSize(landmarks);
  const gap = normalizeDistance(calculateDistance(thumbTip, indexTip), palmSize);
  
  if (gap > 0.2 && gap < 0.6) {
    return 0.78;
  }
  
  return 0;
}

function detectASL_D(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index up, others touch thumb
  if (!index.extended) return 0;
  if (middle.extended || ring.extended || pinky.extended) return 0;
  
  // Thumb should be touching middle finger
  const thumbTip = landmarks[4];
  const middleTip = landmarks[12];
  const palmSize = getPalmSize(landmarks);
  const touchDist = normalizeDistance(calculateDistance(thumbTip, middleTip), palmSize);
  
  if (touchDist < CONFIG.TOUCH_THRESHOLD) {
    return 0.80;
  }
  
  return 0;
}

function detectASL_E(landmarks: HandLandmarks[], states: FingerState[]): number {
  // All fingertips touch thumb tip
  const [thumb, index, middle, ring, pinky] = states;
  
  // All fingers should be curled
  if (index.extended || middle.extended || ring.extended || pinky.extended) return 0;
  
  const thumbTip = landmarks[4];
  const palmSize = getPalmSize(landmarks);
  
  // Check if fingertips are close to thumb tip
  const distances = [8, 12, 16, 20].map(i => 
    normalizeDistance(calculateDistance(thumbTip, landmarks[i]), palmSize)
  );
  
  const allClose = distances.every(d => d < CONFIG.CLOSE_THRESHOLD);
  if (allClose) {
    return 0.78;
  }
  
  return 0;
}

function detectASL_F(landmarks: HandLandmarks[], states: FingerState[]): number {
  // Same as OK but specifically with 3 fingers up
  const [thumb, index, middle, ring, pinky] = states;
  
  // Thumb and index touching
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const palmSize = getPalmSize(landmarks);
  const touchDist = normalizeDistance(calculateDistance(thumbTip, indexTip), palmSize);
  
  if (touchDist > CONFIG.TOUCH_THRESHOLD) return 0;
  
  // Middle, ring, pinky should be extended
  if (!middle.extended || !ring.extended || !pinky.extended) return 0;
  
  return 0.85;
}

function detectASL_G(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and thumb pointing sideways, parallel
  if (!thumb.extended || !index.extended) return 0;
  if (middle.extended || ring.extended || pinky.extended) return 0;
  
  // Check horizontal orientation
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  
  const thumbHorizontal = Math.abs(thumbTip.y - thumbMcp.y) < 0.1;
  const indexHorizontal = Math.abs(indexTip.y - indexMcp.y) < 0.15;
  
  if (thumbHorizontal && indexHorizontal) {
    return 0.80;
  }
  
  return 0;
}

function detectASL_H(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and middle extended horizontally
  if (!index.extended || !middle.extended) return 0;
  if (ring.extended || pinky.extended) return 0;
  
  // Check horizontal orientation
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const isHorizontal = Math.abs(indexTip.y - indexMcp.y) < 0.1;
  
  if (isHorizontal) {
    return 0.80;
  }
  
  return 0;
}

function detectASL_I(states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Only pinky up
  if (!pinky.extended) return 0;
  if (thumb.extended || index.extended || middle.extended || ring.extended) return 0;
  
  return 0.85;
}

function detectASL_K(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and middle up in V, thumb between them
  if (!index.extended || !middle.extended) return 0;
  if (ring.extended || pinky.extended) return 0;
  
  // Thumb should be extended and pointing upward between fingers
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  
  const thumbBetween = thumbTip.x > Math.min(indexMcp.x, middleMcp.x) - 0.05 &&
                       thumbTip.x < Math.max(indexMcp.x, middleMcp.x) + 0.05;
  
  if (thumb.extended && thumbBetween) {
    return 0.78;
  }
  
  return 0;
}

function detectASL_L(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // L shape: thumb and index extended at 90 degrees
  if (!thumb.extended || !index.extended) return 0;
  if (middle.extended || ring.extended || pinky.extended) return 0;
  
  // Check perpendicular orientation
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  
  // Thumb should be roughly horizontal, index roughly vertical
  const thumbAngle = Math.atan2(thumbTip.y - thumbMcp.y, thumbTip.x - thumbMcp.x);
  const indexAngle = Math.atan2(indexTip.y - indexMcp.y, indexTip.x - indexMcp.x);
  
  const angleDiff = Math.abs(Math.abs(thumbAngle - indexAngle) - Math.PI / 2);
  
  if (angleDiff < 0.5) { // ~30 degrees tolerance
    return 0.85;
  }
  
  return 0;
}

function detectASL_O(landmarks: HandLandmarks[], states: FingerState[]): number {
  // All fingers touch thumb forming O
  const thumbTip = landmarks[4];
  const palmSize = getPalmSize(landmarks);
  
  // All fingertips should be close to thumb tip
  const allFingerTips = [8, 12, 16, 20];
  const distances = allFingerTips.map(i => 
    normalizeDistance(calculateDistance(thumbTip, landmarks[i]), palmSize)
  );
  
  const allTouching = distances.every(d => d < CONFIG.TOUCH_THRESHOLD * 1.5);
  
  if (allTouching) {
    return 0.82;
  }
  
  return 0;
}

function detectASL_R(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and middle crossed
  if (!index.extended || !middle.extended) return 0;
  if (ring.extended || pinky.extended) return 0;
  
  // Check if fingers are crossed (index tip x crosses middle tip x)
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  
  // At MCP level, index should be more to one side
  // At tip level, they should cross
  const mcpDiff = indexMcp.x - middleMcp.x;
  const tipDiff = indexTip.x - middleTip.x;
  
  // If signs differ, they crossed
  if ((mcpDiff > 0 && tipDiff < 0) || (mcpDiff < 0 && tipDiff > 0)) {
    return 0.80;
  }
  
  return 0;
}

function detectASL_S(landmarks: HandLandmarks[], states: FingerState[]): number {
  // Fist with thumb over fingers
  const [thumb, index, middle, ring, pinky] = states;
  
  // All fingers curled
  if (index.extended || middle.extended || ring.extended || pinky.extended) return 0;
  
  // Thumb should be in front of fingers (z-axis)
  const thumbTip = landmarks[4];
  const indexPip = landmarks[6];
  
  if (thumbTip.z < indexPip.z) { // Thumb in front
    return 0.80;
  }
  
  return 0;
}

function detectASL_T(landmarks: HandLandmarks[], states: FingerState[]): number {
  // Thumb between index and middle in fist
  const [thumb, index, middle, ring, pinky] = states;
  
  // All fingers curled
  if (index.extended || middle.extended || ring.extended || pinky.extended) return 0;
  
  // Thumb tip should be between index and middle
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  
  const thumbBetween = thumbTip.x >= Math.min(indexMcp.x, middleMcp.x) &&
                       thumbTip.x <= Math.max(indexMcp.x, middleMcp.x);
  
  if (thumbBetween) {
    return 0.78;
  }
  
  return 0;
}

function detectASL_U(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index and middle together pointing up
  if (!index.extended || !middle.extended) return 0;
  if (ring.extended || pinky.extended) return 0;
  
  // Fingers should be together
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const palmSize = getPalmSize(landmarks);
  const spread = normalizeDistance(calculate2DDistance(indexTip, middleTip), palmSize);
  
  if (spread < 0.15) {
    return 0.82;
  }
  
  return 0;
}

function detectASL_V(landmarks: HandLandmarks[], states: FingerState[]): number {
  // Same as victory but ensure spread
  return detectVictory(landmarks, states) > 0 ? 0.85 : 0;
}

function detectASL_W(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index, middle, ring spread apart
  if (!index.extended || !middle.extended || !ring.extended) return 0;
  if (pinky.extended || thumb.extended) return 0;
  
  // Check spread between fingers
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const palmSize = getPalmSize(landmarks);
  
  const spread1 = normalizeDistance(calculate2DDistance(indexTip, middleTip), palmSize);
  const spread2 = normalizeDistance(calculate2DDistance(middleTip, ringTip), palmSize);
  
  if (spread1 > 0.1 && spread2 > 0.1) {
    return 0.82;
  }
  
  return 0;
}

function detectASL_X(landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  
  // Index bent like hook, others curled
  if (middle.extended || ring.extended || pinky.extended) return 0;
  
  // Index should be partially curled (hook shape)
  if (index.curl < 0.3 || index.curl > 0.8) return 0;
  
  return 0.78;
}

function detectASL_Y(states: FingerState[]): number {
  // Same as call me
  return detectCallMe(states) > 0 ? 0.85 : 0;
}

// ============ ASL NUMBER DETECTORS ============

function detectNumber(num: number, landmarks: HandLandmarks[], states: FingerState[]): number {
  const [thumb, index, middle, ring, pinky] = states;
  const palmSize = getPalmSize(landmarks);
  
  switch (num) {
    case 0:
      return detectASL_O(landmarks, states);
    
    case 1:
      if (index.extended && !middle.extended && !ring.extended && !pinky.extended && !thumb.extended) {
        return 0.88;
      }
      return 0;
    
    case 2:
      if (index.extended && middle.extended && !ring.extended && !pinky.extended && !thumb.extended) {
        // Check spread
        const spread = normalizeDistance(
          calculate2DDistance(landmarks[8], landmarks[12]),
          palmSize
        );
        if (spread > 0.15) return 0.85;
      }
      return 0;
    
    case 3:
      if (thumb.extended && index.extended && middle.extended && !ring.extended && !pinky.extended) {
        return 0.85;
      }
      return 0;
    
    case 4:
      if (index.extended && middle.extended && ring.extended && pinky.extended && !thumb.extended) {
        return 0.87;
      }
      return 0;
    
    case 5:
      if (countExtended(states) === 5) {
        return 0.90;
      }
      return 0;
    
    case 6:
      // Pinky touches thumb
      if (!index.extended || !middle.extended || !ring.extended) return 0;
      const pinkyThumbDist6 = normalizeDistance(
        calculateDistance(landmarks[20], landmarks[4]),
        palmSize
      );
      if (pinkyThumbDist6 < CONFIG.TOUCH_THRESHOLD) return 0.82;
      return 0;
    
    case 7:
      // Ring touches thumb
      if (!index.extended || !middle.extended || !pinky.extended) return 0;
      const ringThumbDist = normalizeDistance(
        calculateDistance(landmarks[16], landmarks[4]),
        palmSize
      );
      if (ringThumbDist < CONFIG.TOUCH_THRESHOLD) return 0.82;
      return 0;
    
    case 8:
      // Middle touches thumb
      if (!index.extended || !ring.extended || !pinky.extended) return 0;
      const middleThumbDist = normalizeDistance(
        calculateDistance(landmarks[12], landmarks[4]),
        palmSize
      );
      if (middleThumbDist < CONFIG.TOUCH_THRESHOLD) return 0.82;
      return 0;
    
    case 9:
      // Index touches thumb
      if (!middle.extended || !ring.extended || !pinky.extended) return 0;
      const indexThumbDist = normalizeDistance(
        calculateDistance(landmarks[8], landmarks[4]),
        palmSize
      );
      if (indexThumbDist < CONFIG.TOUCH_THRESHOLD) return 0.82;
      return 0;
    
    default:
      return 0;
  }
}

// ============ MAIN CLASSIFIER ============

interface ClassificationCandidate {
  gestureName: string;
  confidence: number;
}

export function classifyGesture(landmarks: HandLandmarks[]): GestureClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: null, confidence: 0 };
  }

  const states = getAllFingerStates(landmarks);
  const candidates: ClassificationCandidate[] = [];

  // Common gestures (priority order)
  const thumbsUp = detectThumbsUp(landmarks, states);
  if (thumbsUp > 0) candidates.push({ gestureName: 'thumbs_up', confidence: thumbsUp });
  
  const thumbsDown = detectThumbsDown(landmarks, states);
  if (thumbsDown > 0) candidates.push({ gestureName: 'thumbs_down', confidence: thumbsDown });
  
  const fist = detectClosedFist(states);
  if (fist > 0) candidates.push({ gestureName: 'closed_fist', confidence: fist });
  
  const openPalm = detectOpenPalm(states);
  if (openPalm > 0) candidates.push({ gestureName: 'open_palm', confidence: openPalm });
  
  const victory = detectVictory(landmarks, states);
  if (victory > 0) candidates.push({ gestureName: 'victory', confidence: victory });
  
  const iLoveYou = detectILoveYou(states);
  if (iLoveYou > 0) candidates.push({ gestureName: 'i_love_you', confidence: iLoveYou });
  
  const ok = detectOK(landmarks, states);
  if (ok > 0) candidates.push({ gestureName: 'ok', confidence: ok });
  
  const callMe = detectCallMe(states);
  if (callMe > 0) candidates.push({ gestureName: 'call', confidence: callMe });
  
  const rock = detectRock(states);
  if (rock > 0) candidates.push({ gestureName: 'rock', confidence: rock });
  
  const point = detectPoint(states);
  if (point > 0) candidates.push({ gestureName: 'point', confidence: point });

  // ASL Letters
  const aslA = detectASL_A(states);
  if (aslA > 0) candidates.push({ gestureName: 'asl_a', confidence: aslA });
  
  const aslB = detectASL_B(landmarks, states);
  if (aslB > 0) candidates.push({ gestureName: 'asl_b', confidence: aslB });
  
  const aslC = detectASL_C(landmarks, states);
  if (aslC > 0) candidates.push({ gestureName: 'asl_c', confidence: aslC });
  
  const aslD = detectASL_D(landmarks, states);
  if (aslD > 0) candidates.push({ gestureName: 'asl_d', confidence: aslD });
  
  const aslE = detectASL_E(landmarks, states);
  if (aslE > 0) candidates.push({ gestureName: 'asl_e', confidence: aslE });
  
  const aslF = detectASL_F(landmarks, states);
  if (aslF > 0) candidates.push({ gestureName: 'asl_f', confidence: aslF });
  
  const aslG = detectASL_G(landmarks, states);
  if (aslG > 0) candidates.push({ gestureName: 'asl_g', confidence: aslG });
  
  const aslH = detectASL_H(landmarks, states);
  if (aslH > 0) candidates.push({ gestureName: 'asl_h', confidence: aslH });
  
  const aslI = detectASL_I(states);
  if (aslI > 0) candidates.push({ gestureName: 'asl_i', confidence: aslI });
  
  const aslK = detectASL_K(landmarks, states);
  if (aslK > 0) candidates.push({ gestureName: 'asl_k', confidence: aslK });
  
  const aslL = detectASL_L(landmarks, states);
  if (aslL > 0) candidates.push({ gestureName: 'asl_l', confidence: aslL });
  
  const aslO = detectASL_O(landmarks, states);
  if (aslO > 0) candidates.push({ gestureName: 'asl_o', confidence: aslO });
  
  const aslR = detectASL_R(landmarks, states);
  if (aslR > 0) candidates.push({ gestureName: 'asl_r', confidence: aslR });
  
  const aslS = detectASL_S(landmarks, states);
  if (aslS > 0) candidates.push({ gestureName: 'asl_s', confidence: aslS });
  
  const aslT = detectASL_T(landmarks, states);
  if (aslT > 0) candidates.push({ gestureName: 'asl_t', confidence: aslT });
  
  const aslU = detectASL_U(landmarks, states);
  if (aslU > 0) candidates.push({ gestureName: 'asl_u', confidence: aslU });
  
  const aslV = detectASL_V(landmarks, states);
  if (aslV > 0) candidates.push({ gestureName: 'asl_v', confidence: aslV });
  
  const aslW = detectASL_W(landmarks, states);
  if (aslW > 0) candidates.push({ gestureName: 'asl_w', confidence: aslW });
  
  const aslX = detectASL_X(landmarks, states);
  if (aslX > 0) candidates.push({ gestureName: 'asl_x', confidence: aslX });
  
  const aslY = detectASL_Y(states);
  if (aslY > 0) candidates.push({ gestureName: 'asl_y', confidence: aslY });

  // ASL Numbers
  for (let i = 0; i <= 9; i++) {
    const numConf = detectNumber(i, landmarks, states);
    if (numConf > 0) {
      candidates.push({ gestureName: `asl_${i}`, confidence: numConf });
    }
  }

  // Sort by confidence and get best match
  if (candidates.length === 0) {
    return { gesture: null, confidence: 0 };
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];

  // Apply minimum confidence threshold
  if (best.confidence < CONFIG.MIN_CONFIDENCE) {
    return { gesture: null, confidence: 0 };
  }

  const gesture = GESTURE_MAP.get(best.gestureName) || null;
  return { gesture, confidence: best.confidence };
}

// Export for two-hand detection
export interface TwoHandClassificationResult {
  leftHand: GestureClassificationResult;
  rightHand: GestureClassificationResult;
  combined: GestureClassificationResult | null;
}

export function classifyTwoHands(
  leftLandmarks: HandLandmarks[] | null,
  rightLandmarks: HandLandmarks[] | null
): TwoHandClassificationResult {
  const leftResult = leftLandmarks ? classifyGesture(leftLandmarks) : { gesture: null, confidence: 0 };
  const rightResult = rightLandmarks ? classifyGesture(rightLandmarks) : { gesture: null, confidence: 0 };

  // Check for two-hand gestures
  let combined: GestureClassificationResult | null = null;

  if (leftLandmarks && rightLandmarks) {
    // Check for "Thank You" / Namaste (both hands together)
    const leftPalm = leftLandmarks[9]; // Middle MCP
    const rightPalm = rightLandmarks[9];
    
    const palmDistance = calculateDistance(leftPalm, rightPalm);
    const palmSize = (getPalmSize(leftLandmarks) + getPalmSize(rightLandmarks)) / 2;
    
    if (normalizeDistance(palmDistance, palmSize) < 0.3) {
      // Hands are close together
      const leftStates = getAllFingerStates(leftLandmarks);
      const rightStates = getAllFingerStates(rightLandmarks);
      
      const leftAllExtended = countExtended(leftStates) >= 4;
      const rightAllExtended = countExtended(rightStates) >= 4;
      
      if (leftAllExtended && rightAllExtended) {
        combined = {
          gesture: GESTURE_MAP.get('thank_you') || null,
          confidence: 0.90,
        };
      }
    }
  }

  return { leftHand: leftResult, rightHand: rightResult, combined };
}
