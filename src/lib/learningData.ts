import { LearningLevel, LessonGesture } from '@/types/learning';
import { GestureDefinition } from '@/types/gesture';
import { ASL_ALPHABET, ASL_NUMBERS, COMMON_GESTURES, TWO_HAND_GESTURES, ASL_WORDS } from './gestureDatabase';

type Difficulty = 'easy' | 'medium' | 'hard';

// Helper to create a lesson gesture
function createLesson(
  id: string,
  gesture: GestureDefinition | undefined,
  difficulty: Difficulty,
  tips: string[]
): LessonGesture | null {
  if (!gesture) return null;
  return { id, gesture, difficulty, tips };
}

// Level 1: Basics - ASL Alphabet & Basic Shapes
const level1Gestures: LessonGesture[] = [
  createLesson('l1_hello', COMMON_GESTURES.find(g => g.name === 'hello'), 'easy', 
    ['Keep your palm open and facing outward', 'Wave gently from side to side']),
  createLesson('l1_thumbs_up', COMMON_GESTURES.find(g => g.name === 'thumbs_up'), 'easy',
    ['Make a fist first', 'Extend only your thumb upward', 'Keep other fingers closed']),
  createLesson('l1_open_palm', COMMON_GESTURES.find(g => g.name === 'open_palm'), 'easy',
    ['Spread all five fingers', 'Keep your palm flat and facing forward']),
  createLesson('l1_closed_fist', COMMON_GESTURES.find(g => g.name === 'closed_fist'), 'easy',
    ['Curl all fingers into palm', 'Keep thumb wrapped around fingers']),
  createLesson('l1_victory', COMMON_GESTURES.find(g => g.name === 'victory'), 'easy',
    ['Extend index and middle fingers', 'Keep them slightly spread apart', 'Other fingers stay closed']),
  // Basic ASL letters A-J
  ...ASL_ALPHABET.slice(0, 10).map(g => 
    createLesson(`l1_${g.name}`, g, 'easy', [g.description, 'Practice in front of a mirror'])
  ),
].filter((g): g is LessonGesture => g !== null);

// Level 2: Numbers & Common Words
const level2Gestures: LessonGesture[] = [
  // Numbers 0-9
  ...ASL_NUMBERS.map(g => 
    createLesson(`l2_${g.name}`, g, 'easy', [g.description, 'Count along as you practice'])
  ),
  createLesson('l2_ok', COMMON_GESTURES.find(g => g.name === 'ok'), 'medium',
    ['Touch thumb and index fingertips together', 'Keep other three fingers extended']),
  createLesson('l2_yes', COMMON_GESTURES.find(g => g.name === 'yes'), 'easy',
    ['Same as thumbs up', 'Can also nod fist like a head nodding']),
  createLesson('l2_no', COMMON_GESTURES.find(g => g.name === 'no'), 'easy',
    ['Thumbs down gesture', 'Can also use index and middle finger snapping to thumb']),
  createLesson('l2_point', COMMON_GESTURES.find(g => g.name === 'point'), 'easy',
    ['Extend only your index finger', 'Point in a clear direction']),
  createLesson('l2_call', COMMON_GESTURES.find(g => g.name === 'call'), 'medium',
    ['Extend thumb and pinky only', 'Other fingers curl into palm', 'Hold near your ear for "call me"']),
  createLesson('l2_i_love_you', COMMON_GESTURES.find(g => g.name === 'i_love_you'), 'medium',
    ['Extend thumb, index, and pinky', 'Keep middle and ring fingers down', 'This combines I, L, Y in ASL']),
].filter((g): g is LessonGesture => g !== null);

// Level 3: Two-Hand Gestures
const level3Gestures: LessonGesture[] = [
  createLesson('l3_thank_you', TWO_HAND_GESTURES.find(g => g.name === 'thank_you'), 'medium',
    ['Press both palms together', 'Like a prayer or namaste gesture', 'Can also touch lips and move hand forward']),
  createLesson('l3_please', TWO_HAND_GESTURES.find(g => g.name === 'please'), 'medium',
    ['Place flat hand on your chest', 'Make a circular motion', 'Express sincerity with your face']),
  createLesson('l3_help', TWO_HAND_GESTURES.find(g => g.name === 'help'), 'medium',
    ['Make a fist with one hand', 'Place it on your open palm', 'Lift both hands together']),
  createLesson('l3_more', TWO_HAND_GESTURES.find(g => g.name === 'more'), 'medium',
    ['Pinch fingers together on both hands', 'Tap fingertips together', 'Like you are gathering more']),
  createLesson('l3_finish', TWO_HAND_GESTURES.find(g => g.name === 'finish'), 'medium',
    ['Hold both hands open, palms facing you', 'Twist both hands outward quickly', 'Like shaking off water']),
  createLesson('l3_sorry', TWO_HAND_GESTURES.find(g => g.name === 'sorry'), 'medium',
    ['Make a fist with one hand', 'Circle it on your chest', 'Show remorse in your expression']),
  createLesson('l3_want', TWO_HAND_GESTURES.find(g => g.name === 'want'), 'medium',
    ['Hold both hands in front, palms up', 'Pull hands toward your body', 'Like grabbing something you desire']),
  createLesson('l3_again', TWO_HAND_GESTURES.find(g => g.name === 'again'), 'hard',
    ['Bend one hand', 'Flip it onto your open palm', 'Like flipping a page again']),
].filter((g): g is LessonGesture => g !== null);

// Level 4: Sentences & Advanced Practice
const level4Gestures: LessonGesture[] = [
  createLesson('l4_eat', ASL_WORDS.find(g => g.name === 'eat'), 'medium',
    ['Bring fingertips together', 'Touch them to your mouth', 'Like putting food in mouth']),
  createLesson('l4_drink', ASL_WORDS.find(g => g.name === 'drink'), 'medium',
    ['Make C shape with hand', 'Tip it toward your mouth', 'Like drinking from a cup']),
  createLesson('l4_water', ASL_WORDS.find(g => g.name === 'water'), 'medium',
    ['Make W hand shape', 'Tap your chin twice', 'W for water at the mouth']),
  createLesson('l4_happy', ASL_WORDS.find(g => g.name === 'happy'), 'medium',
    ['Place flat hands on chest', 'Brush upward repeatedly', 'Like joy bubbling up']),
  createLesson('l4_sad', ASL_WORDS.find(g => g.name === 'sad'), 'medium',
    ['Open hands in front of face', 'Move them downward', 'Like tears falling']),
  createLesson('l4_understand', ASL_WORDS.find(g => g.name === 'understand'), 'hard',
    ['Place index finger at forehead', 'Flick it upward', 'Like a lightbulb turning on']),
  createLesson('l4_good', ASL_WORDS.find(g => g.name === 'good'), 'easy',
    ['Touch chin with flat hand', 'Move hand forward and down', 'Giving something good']),
  createLesson('l4_where', ASL_WORDS.find(g => g.name === 'where'), 'medium',
    ['Hold up index finger', 'Wave it side to side', 'Questioning gesture']),
  createLesson('l4_what', ASL_WORDS.find(g => g.name === 'what'), 'medium',
    ['Hold hands palm up', 'Move index fingers in questioning motion', 'Show curiosity on face']),
  // Remaining alphabet K-Z for mastery
  ...ASL_ALPHABET.slice(10).map(g => 
    createLesson(`l4_${g.name}`, g, 'hard', [g.description, 'These letters require precise finger positioning'])
  ),
].filter((g): g is LessonGesture => g !== null);

export const LEARNING_LEVELS: LearningLevel[] = [
  {
    id: 1,
    name: 'Basics',
    description: 'Learn basic hand shapes, simple gestures, and your first ASL letters (A-J)',
    icon: '🌱',
    color: 'from-green-500 to-emerald-600',
    gestures: level1Gestures,
    requiredAccuracy: 60,
  },
  {
    id: 2,
    name: 'Numbers & Common Words',
    description: 'Master numbers 0-9 and essential everyday signs like OK, Yes, No',
    icon: '🔢',
    color: 'from-blue-500 to-cyan-600',
    gestures: level2Gestures,
    requiredAccuracy: 65,
  },
  {
    id: 3,
    name: 'Two-Hand Gestures',
    description: 'Learn powerful two-handed signs: Thank You, Please, Help, and more',
    icon: '🤝',
    color: 'from-purple-500 to-pink-600',
    gestures: level3Gestures,
    requiredAccuracy: 70,
  },
  {
    id: 4,
    name: 'Sentences & Practice',
    description: 'Combine signs into sentences, learn question words, and master the full alphabet',
    icon: '🎓',
    color: 'from-orange-500 to-red-600',
    gestures: level4Gestures,
    requiredAccuracy: 75,
  },
];

export function getLevelById(id: number): LearningLevel | undefined {
  return LEARNING_LEVELS.find(level => level.id === id);
}

export function getGestureById(levelId: number, gestureId: string): LessonGesture | undefined {
  const level = getLevelById(levelId);
  return level?.gestures.find(g => g.id === gestureId);
}

export function generateFeedback(accuracy: number): {
  message: string;
  suggestion: string;
  encouragement: string;
} {
  if (accuracy >= 90) {
    return {
      message: 'Perfect! 🎉',
      suggestion: 'Your form is excellent!',
      encouragement: 'You\'re a natural at this!',
    };
  } else if (accuracy >= 75) {
    return {
      message: 'Great job! 👏',
      suggestion: 'Try to hold the gesture a bit steadier.',
      encouragement: 'Keep practicing to perfect it!',
    };
  } else if (accuracy >= 60) {
    return {
      message: 'Good effort! 👍',
      suggestion: 'Check your finger positioning and try again.',
      encouragement: 'You\'re making progress!',
    };
  } else if (accuracy >= 40) {
    return {
      message: 'Getting there! 💪',
      suggestion: 'Review the tips and focus on hand shape.',
      encouragement: 'Practice makes perfect!',
    };
  } else {
    return {
      message: 'Keep trying! 🌟',
      suggestion: 'Watch the demonstration again and take it slow.',
      encouragement: 'Everyone starts somewhere - you\'ve got this!',
    };
  }
}
