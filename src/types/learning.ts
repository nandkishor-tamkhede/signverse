import { GestureDefinition } from './gesture';

export interface LearningLevel {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  gestures: LessonGesture[];
  requiredAccuracy: number;
}

export interface LessonGesture {
  id: string;
  gesture: GestureDefinition;
  difficulty: 'easy' | 'medium' | 'hard';
  tips: string[];
  commonMistakes?: string[];
}

export interface UserGestureProgress {
  id: string;
  userId: string;
  levelId: number;
  gestureId: string;
  completed: boolean;
  accuracyScore: number;
  attempts: number;
  bestAccuracy: number;
  lastPracticedAt: Date | null;
}

export interface UserLevelProgress {
  id: string;
  userId: string;
  levelId: number;
  gesturesCompleted: number;
  totalGestures: number;
  isUnlocked: boolean;
  completedAt: Date | null;
}

export interface PracticeFeedback {
  isCorrect: boolean;
  accuracy: number;
  message: string;
  suggestion?: string;
  encouragement: string;
}

export type PracticeState = 
  | 'idle'
  | 'countdown'
  | 'detecting'
  | 'success'
  | 'retry'
  | 'complete';
