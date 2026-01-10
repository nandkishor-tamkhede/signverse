export interface GestureDefinition {
  name: string;
  englishText: string;
  hindiText: string;
  emoji: string;
  description: string;
}

export interface DetectedGesture {
  id: string;
  gesture: GestureDefinition;
  confidence: number;
  timestamp: Date;
}

export interface HandLandmarks {
  x: number;
  y: number;
  z: number;
}

export interface GestureClassificationResult {
  gesture: GestureDefinition | null;
  confidence: number;
}

export type Language = 'en' | 'hi';

export interface AppSettings {
  language: Language;
  speechRate: number;
  isMuted: boolean;
  isDarkMode: boolean;
}
