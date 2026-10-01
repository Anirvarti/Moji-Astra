export type AppMode = 'play' | 'explore' | 'meeting' | 'learn';

export type GameDifficulty = 'easy' | 'medium' | 'timed' | 'memory';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarks = Landmark[];

export interface RecognizedHand {
  landmarks: HandLandmarks;
  handedness: 'Left' | 'Right';
  gestureName: string;
  gestureScore: number;
  normalizedLandmarks: HandLandmarks;
  wristPos: { x: number; y: number };
  indexTip: { x: number; y: number };
  thumbTip: { x: number; y: number };
}

export interface RecognizedFace {
  blendshapes: Record<string, number>;
  expression: string | null;
  expressionScore: number;
}

export interface DetectionResult {
  hands: RecognizedHand[];
  face: RecognizedFace | null;
  activeGesture: string | null;
  activeEmoji: string | null;
  confidence: number;
  allProbabilities: { label: string; score: number; emoji: string }[];
  isTwoHandHeart: boolean;
  isClapping: boolean;
  isNamaste: boolean;
  isLotusFlower: boolean;
  isPinching: boolean;
  pinchDistance: number;
  cursorPos: { x: number; y: number } | null;
  inferenceTimeMs: number;
  timestamp: number;
}

export interface GestureDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  isCustom?: boolean;
}

export interface CustomSample {
  id: string;
  label: string;
  emoji: string;
  vector: number[]; // 63 values (21 landmarks * 3 coords)
  timestamp: number;
}

export interface GestureSequence {
  id: string;
  name: string;
  sequence: string[]; // array of emoji or gesture ids
  resultingEmoji: string;
  description: string;
}

export interface ReactionMapping {
  gestureId: string;
  gestureName: string;
  emoji: string;
  label: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  created: number;
}

export interface HighScoreEntry {
  id: string;
  name: string;
  score: number;
  difficulty: GameDifficulty;
  accuracy: number;
  date: string;
}

export interface EmojiItem {
  emoji: string;
  name: string;
  category: string;
  keywords: string[];
}
