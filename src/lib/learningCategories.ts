import { GestureDefinition } from '@/types/gesture';
import { ASL_ALPHABET, ASL_NUMBERS, COMMON_GESTURES, TWO_HAND_GESTURES, ASL_WORDS } from './gestureDatabase';

export interface LearningCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgGradient: string;
  gestures: GestureDefinition[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
}

// Beginner-friendly symbols/icons category
export const SYMBOLS_GESTURES: GestureDefinition[] = [
  { name: 'heart', englishText: 'Heart/Love', hindiText: 'दिल', emoji: '❤️', description: 'Cross hands over chest' },
  { name: 'star', englishText: 'Star', hindiText: 'तारा', emoji: '⭐', description: 'Point index fingers up, alternating' },
  { name: 'sun', englishText: 'Sun', hindiText: 'सूरज', emoji: '☀️', description: 'Circle shape above head with fingers spread' },
  { name: 'moon', englishText: 'Moon', hindiText: 'चाँद', emoji: '🌙', description: 'C shape at side of face' },
  { name: 'rain', englishText: 'Rain', hindiText: 'बारिश', emoji: '🌧️', description: 'Wiggle fingers downward' },
  { name: 'tree', englishText: 'Tree', hindiText: 'पेड़', emoji: '🌳', description: 'Arm up as trunk, fingers spread as branches' },
  { name: 'flower', englishText: 'Flower', hindiText: 'फूल', emoji: '🌸', description: 'Pinched fingers touch nose, then open' },
  { name: 'house', englishText: 'House/Home', hindiText: 'घर', emoji: '🏠', description: 'Fingertips touch to form roof shape' },
];

// Define all learning categories
export const LEARNING_CATEGORIES: LearningCategory[] = [
  {
    id: 'alphabet',
    name: 'Alphabet',
    description: 'Learn the ASL finger alphabet A-Z',
    icon: '🔤',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
    gestures: ASL_ALPHABET,
    difficulty: 'beginner',
    order: 1,
  },
  {
    id: 'numbers',
    name: 'Numbers',
    description: 'Count from 0 to 9 in sign language',
    icon: '🔢',
    color: 'text-green-400',
    bgGradient: 'from-green-500/20 to-emerald-500/20',
    gestures: ASL_NUMBERS,
    difficulty: 'beginner',
    order: 2,
  },
  {
    id: 'symbols',
    name: 'Symbols',
    description: 'Express ideas with simple symbols',
    icon: '✨',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
    gestures: SYMBOLS_GESTURES,
    difficulty: 'beginner',
    order: 3,
  },
  {
    id: 'common-words',
    name: 'Common Words',
    description: 'Essential everyday signs',
    icon: '💬',
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/20 to-yellow-500/20',
    gestures: COMMON_GESTURES,
    difficulty: 'beginner',
    order: 4,
  },
  {
    id: 'two-hand',
    name: 'Two-Hand Gestures',
    description: 'Signs that use both hands',
    icon: '🤝',
    color: 'text-pink-400',
    bgGradient: 'from-pink-500/20 to-rose-500/20',
    gestures: TWO_HAND_GESTURES,
    difficulty: 'intermediate',
    order: 5,
  },
  {
    id: 'sentences',
    name: 'Sentences & Phrases',
    description: 'Combine signs to communicate',
    icon: '📝',
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-500/20 to-teal-500/20',
    gestures: ASL_WORDS,
    difficulty: 'advanced',
    order: 6,
  },
];

// Utility functions
export function getCategoryById(id: string): LearningCategory | undefined {
  return LEARNING_CATEGORIES.find(cat => cat.id === id);
}

export function getGestureFromCategory(categoryId: string, gestureIndex: number): GestureDefinition | undefined {
  const category = getCategoryById(categoryId);
  return category?.gestures[gestureIndex];
}

export function getTotalGesturesCount(): number {
  return LEARNING_CATEGORIES.reduce((sum, cat) => sum + cat.gestures.length, 0);
}

// Friendly tips for each gesture type
export function getGestureTips(gesture: GestureDefinition): string[] {
  const baseTips = [
    gesture.description,
    'Take your time - there\'s no rush!',
    'Practice in front of a mirror for best results',
  ];
  
  // Add specific tips based on gesture type
  if (gesture.name.startsWith('asl_')) {
    baseTips.push('Keep your palm facing forward');
    baseTips.push('Hold the position steady for 2-3 seconds');
  }
  
  return baseTips;
}

// Generate friendly, encouraging feedback
export function generateEncouragement(accuracy: number): {
  title: string;
  message: string;
  emoji: string;
  suggestion: string;
} {
  if (accuracy >= 90) {
    return {
      title: 'Amazing!',
      message: 'You nailed it perfectly!',
      emoji: '🌟',
      suggestion: 'Ready for the next sign?',
    };
  } else if (accuracy >= 75) {
    return {
      title: 'Great job!',
      message: 'You\'re doing wonderfully!',
      emoji: '👏',
      suggestion: 'Just a little more practice to perfect it.',
    };
  } else if (accuracy >= 60) {
    return {
      title: 'Good effort!',
      message: 'You\'re getting the hang of it!',
      emoji: '💪',
      suggestion: 'Try holding your hand a bit steadier.',
    };
  } else if (accuracy >= 40) {
    return {
      title: 'Keep going!',
      message: 'Practice makes perfect!',
      emoji: '🌱',
      suggestion: 'Check the tips and try again slowly.',
    };
  } else {
    return {
      title: 'Nice try!',
      message: 'Every expert was once a beginner.',
      emoji: '💫',
      suggestion: 'Watch the demonstration and try once more.',
    };
  }
}
