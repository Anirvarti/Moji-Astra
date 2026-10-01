import {
  FilesetResolver,
  GestureRecognizer,
  FaceLandmarker,
} from '@mediapipe/tasks-vision';
import { DetectionResult, Landmark, RecognizedHand, RecognizedFace } from '../types';
import { GESTURE_TO_EMOJI } from './emojiData';
import { knnClassifier } from './knnClassifier';

// Configuration thresholds as named constants
export const HOLD_CONFIRM_MS = 500;
export const PINCH_THRESHOLD_NORM = 0.08;
export const TWO_HAND_HEART_THRESHOLD_NORM = 0.18;
export const SMOOTHING_FRAME_WINDOW = 10;

// Landmark connections for rendering
export const HAND_CONNECTIONS: [number, number][] = [
  // Palm base
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

export const FINGER_COLORS = {
  thumb: '#F59E0B',  // Amber
  index: '#3B82F6',  // Blue
  middle: '#10B981', // Emerald
  ring: '#8B5CF6',   // Violet
  pinky: '#EC4899',  // Pink
  palm: '#06B6D4',   // Cyan
};

class MediaPipeService {
  private gestureRecognizer: GestureRecognizer | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private initError: string | null = null;

  // Smoothing buffer
  private gestureHistory: { gesture: string; emoji: string; confidence: number; timestamp: number }[] = [];

  // Hold-to-confirm state tracking
  private candidateGesture: string | null = null;
  private candidateStartTime: number = 0;
  private confirmedGesture: string | null = null;
  private holdProgress: number = 0;
  private lastVideoTimestamp: number = -1;

  public async initialize(onProgress?: (msg: string) => void): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      onProgress?.('Loading MediaPipe Vision WASM...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Check WebGL availability
      let preferredDelegate: 'GPU' | 'CPU' = 'GPU';
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        if (!gl) {
          preferredDelegate = 'CPU';
        }
      } catch {
        preferredDelegate = 'CPU';
      }

      onProgress?.('Loading Hand Gesture Neural Network...');
      try {
        this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: preferredDelegate,
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
      } catch (gpuErr) {
        console.info('Retrying GestureRecognizer with CPU delegate...', gpuErr);
        this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
      }

      onProgress?.('Loading Face Landmarker & Blendshapes...');
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: preferredDelegate,
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      } catch {
        try {
          this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
          });
        } catch (faceErr) {
          console.info('FaceLandmarker load skipped, hand tracking will continue', faceErr);
        }
      }

      this.isReady = true;
      this.isInitializing = false;
      onProgress?.('Ready!');
      return true;
    } catch (err: unknown) {
      console.error('Failed to initialize MediaPipe:', err);
      this.initError = err instanceof Error ? err.message : 'Failed to load MediaPipe AI models.';
      this.isInitializing = false;
      return false;
    }
  }

  public getStatus() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      error: this.initError,
    };
  }

  /**
   * Distance between two 2D/3D points
   */
  private dist(p1: Landmark, p2: Landmark): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if a finger is extended relative to hand scale
   */
  private isFingerExtended(landmarks: Landmark[], tipIdx: number, mcpIdx: number, wristIdx: number = 0): boolean {
    const wrist = landmarks[wristIdx];
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    return this.dist(tip, wrist) > this.dist(mcp, wrist) * 1.25;
  }

  /**
   * Check custom geometric rules
   */
  private detectCustomHandGesture(landmarks: Landmark[]): { gesture: string; emoji: string; confidence: number } | null {
    if (!landmarks || landmarks.length !== 21) return null;

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const middleMcp = landmarks[9];
    const handScale = this.dist(wrist, middleMcp) || 0.1;

    // Distances normalized by hand size
    const thumbIndexDist = this.dist(thumbTip, indexTip) / handScale;
    const indexMiddleDist = this.dist(indexTip, middleTip) / handScale;

    const indexExtended = this.isFingerExtended(landmarks, 8, 5);
    const middleExtended = this.isFingerExtended(landmarks, 12, 9);
    const ringExtended = this.isFingerExtended(landmarks, 16, 13);
    const pinkyExtended = this.isFingerExtended(landmarks, 20, 17);
    const thumbExtended = this.dist(thumbTip, wrist) > handScale * 0.9;

    // 1. OK Sign 👌: Thumb tip touches index tip (< 0.22 handScale), while middle, ring, pinky extended
    if (thumbIndexDist < 0.28 && middleExtended && ringExtended && pinkyExtended) {
      return { gesture: 'OK_Sign', emoji: '👌', confidence: 0.92 };
    }

    // 2. Love-You 🤟: Thumb, Index, Pinky extended; Middle and Ring folded
    if (thumbExtended && indexExtended && pinkyExtended && !middleExtended && !ringExtended) {
      return { gesture: 'Love_You', emoji: '🤟', confidence: 0.93 };
    }

    // 3. Crossed Fingers 🤞: Index and Middle extended and touching/crossing; Ring and Pinky folded
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && indexMiddleDist < 0.22) {
      return { gesture: 'Crossed_Fingers', emoji: '🤞', confidence: 0.89 };
    }

    // 4. Finger Heart 🫰 (Korean K-Pop Snap Heart):
    // Thumb and index tips crossed together in a mini-heart pinch, others folded
    if (thumbIndexDist < 0.24 && !middleExtended && !ringExtended && !pinkyExtended) {
      // Index tip and thumb tip close, index PIP bent
      return { gesture: 'Finger_Heart', emoji: '🫰', confidence: 0.88 };
    }

    // 5. Rose / Flower Bud 🌸 (Mukul Mudra): All five fingertips gathered closely together
    const avgTipSpread =
      (this.dist(thumbTip, indexTip) +
        this.dist(thumbTip, middleTip) +
        this.dist(thumbTip, ringTip) +
        this.dist(thumbTip, pinkyTip)) /
      (4 * handScale);
    if (avgTipSpread < 0.28 && this.dist(middleTip, wrist) > handScale * 0.8) {
      return { gesture: 'Rose_Flower', emoji: '🌸', confidence: 0.90 };
    }

    return null;
  }

  /**
   * Namaste / Pranam 🙏 (Folded Hands / Anjali Mudra) check
   */
  private checkNamaste(hands: RecognizedHand[]): boolean {
    if (hands.length < 2) return false;
    const [h1, h2] = hands;

    const h1Wrist = h1.landmarks[0];
    const h2Wrist = h2.landmarks[0];
    const h1MiddleTip = h1.landmarks[12];
    const h2MiddleTip = h2.landmarks[12];
    const h1IndexTip = h1.landmarks[8];
    const h2IndexTip = h2.landmarks[8];
    const h1MiddleMcp = h1.landmarks[9];
    const h2MiddleMcp = h2.landmarks[9];

    // Tips must point upward (y coordinates of tips are lower in canvas space than wrists)
    const pointingUp = h1MiddleTip.y < h1Wrist.y && h2MiddleTip.y < h2Wrist.y;
    if (!pointingUp) return false;

    const middleDistance = Math.hypot(h1MiddleTip.x - h2MiddleTip.x, h1MiddleTip.y - h2MiddleTip.y);
    const indexDistance = Math.hypot(h1IndexTip.x - h2IndexTip.x, h1IndexTip.y - h2IndexTip.y);
    const palmDistance = Math.hypot(h1MiddleMcp.x - h2MiddleMcp.x, h1MiddleMcp.y - h2MiddleMcp.y);
    const wristDistance = Math.hypot(h1Wrist.x - h2Wrist.x, h1Wrist.y - h2Wrist.y);

    return (
      middleDistance < 0.16 &&
      indexDistance < 0.16 &&
      palmDistance < 0.16 &&
      wristDistance < 0.22
    );
  }

  /**
   * Lotus Flower / Kamal 🪷 (Padmakosha Mudra) check
   */
  private checkLotusFlower(hands: RecognizedHand[]): boolean {
    if (hands.length < 2) return false;
    const [h1, h2] = hands;

    const h1Wrist = h1.landmarks[0];
    const h2Wrist = h2.landmarks[0];
    const h1Thumb = h1.landmarks[4];
    const h2Thumb = h2.landmarks[4];
    const h1Pinky = h1.landmarks[20];
    const h2Pinky = h2.landmarks[20];
    const h1MiddleTip = h1.landmarks[12];
    const h2MiddleTip = h2.landmarks[12];

    const wristDist = Math.hypot(h1Wrist.x - h2Wrist.x, h1Wrist.y - h2Wrist.y);
    const thumbDist = Math.hypot(h1Thumb.x - h2Thumb.x, h1Thumb.y - h2Thumb.y);
    const pinkyDist = Math.hypot(h1Pinky.x - h2Pinky.x, h1Pinky.y - h2Pinky.y);
    const middleDist = Math.hypot(h1MiddleTip.x - h2MiddleTip.x, h1MiddleTip.y - h2MiddleTip.y);

    return wristDist < 0.22 && (thumbDist < 0.20 || pinkyDist < 0.22) && middleDist > 0.12;
  }

  /**
   * Two-hand heart ❤️ geometry check
   */
  private checkTwoHandHeart(hands: RecognizedHand[]): boolean {
    if (hands.length < 2) return false;
    const [h1, h2] = hands;

    const h1Thumb = h1.landmarks[4];
    const h2Thumb = h2.landmarks[4];
    const h1Index = h1.landmarks[8];
    const h2Index = h2.landmarks[8];

    const thumbDistance = Math.hypot(h1Thumb.x - h2Thumb.x, h1Thumb.y - h2Thumb.y);
    const indexDistance = Math.hypot(h1Index.x - h2Index.x, h1Index.y - h2Index.y);

    // Both thumb tips close together AND both index tips close together
    return thumbDistance < TWO_HAND_HEART_THRESHOLD_NORM && indexDistance < TWO_HAND_HEART_THRESHOLD_NORM;
  }

  /**
   * Two-hand clapping 👏 check
   */
  private checkClapping(hands: RecognizedHand[]): boolean {
    if (hands.length < 2) return false;
    const [h1, h2] = hands;
    const p1 = h1.landmarks[9];
    const p2 = h2.landmarks[9];
    const palmDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    return palmDist < 0.15;
  }

  /**
   * Detect facial expression via FaceLandmarker blendshapes
   */
  private detectFaceExpression(faceResult: unknown): RecognizedFace | null {
    if (!faceResult) return null;
    const fr = faceResult as { faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }> };
    if (!fr.faceBlendshapes || fr.faceBlendshapes.length === 0) return null;

    const categories = fr.faceBlendshapes[0].categories;
    const blendshapes: Record<string, number> = {};
    for (const cat of categories) {
      blendshapes[cat.categoryName] = cat.score;
    }

    const smileLeft = blendshapes['mouthSmileLeft'] || 0;
    const smileRight = blendshapes['mouthSmileRight'] || 0;
    const jawOpen = blendshapes['jawOpen'] || 0;
    const eyeWideLeft = blendshapes['eyeWideLeft'] || 0;
    const eyeWideRight = blendshapes['eyeWideRight'] || 0;
    const eyeBlinkLeft = blendshapes['eyeBlinkLeft'] || 0;
    const eyeBlinkRight = blendshapes['eyeBlinkRight'] || 0;
    const eyeSquintLeft = blendshapes['eyeSquintLeft'] || 0;
    const eyeSquintRight = blendshapes['eyeSquintRight'] || 0;
    const tongueOut = blendshapes['tongueOut'] || 0;
    const frownLeft = blendshapes['mouthFrownLeft'] || 0;
    const frownRight = blendshapes['mouthFrownRight'] || 0;
    const browDownLeft = blendshapes['browDownLeft'] || 0;
    const browDownRight = blendshapes['browDownRight'] || 0;
    const browOuterUpLeft = blendshapes['browOuterUpLeft'] || 0;
    const browOuterUpRight = blendshapes['browOuterUpRight'] || 0;
    const mouthPucker = blendshapes['mouthPucker'] || 0;
    const mouthClose = blendshapes['mouthClose'] || 0;
    const eyeLookUpLeft = blendshapes['eyeLookUpLeft'] || 0;
    const eyeLookUpRight = blendshapes['eyeLookUpRight'] || 0;

    let expression: string | null = null;
    let score = 0;

    // Check expression priority heuristics
    if (tongueOut > 0.25 && (eyeBlinkLeft > 0.5 || eyeBlinkRight > 0.5)) {
      expression = 'Wink_Tongue';
      score = tongueOut;
    } else if (tongueOut > 0.25) {
      expression = 'Tongue';
      score = tongueOut;
    } else if (jawOpen > 0.65 && (eyeWideLeft > 0.3 || eyeWideRight > 0.3)) {
      expression = 'Scream';
      score = (jawOpen + eyeWideLeft + eyeWideRight) / 3;
    } else if (jawOpen > 0.65 && (eyeBlinkLeft > 0.35 || eyeBlinkRight > 0.35)) {
      expression = 'Yawn';
      score = jawOpen;
    } else if (jawOpen > 0.42 && (eyeWideLeft > 0.22 || eyeWideRight > 0.22)) {
      expression = 'Surprise';
      score = (jawOpen + eyeWideLeft + eyeWideRight) / 3;
    } else if (smileLeft > 0.6 && smileRight > 0.6 && (eyeSquintLeft > 0.3 || eyeSquintRight > 0.3)) {
      expression = 'Laugh';
      score = (smileLeft + smileRight) / 2;
    } else if (smileLeft > 0.38 && smileRight > 0.38) {
      expression = 'Smile';
      score = (smileLeft + smileRight) / 2;
    } else if (
      (eyeBlinkLeft > 0.65 && eyeBlinkRight < 0.25) ||
      (eyeBlinkRight > 0.65 && eyeBlinkLeft < 0.25)
    ) {
      expression = 'Wink';
      score = Math.max(eyeBlinkLeft, eyeBlinkRight);
    } else if (eyeBlinkLeft > 0.72 && eyeBlinkRight > 0.72) {
      expression = 'Sleepy';
      score = (eyeBlinkLeft + eyeBlinkRight) / 2;
    } else if (mouthPucker > 0.45) {
      expression = 'Kiss';
      score = mouthPucker;
    } else if (browDownLeft > 0.45 && browDownRight > 0.45) {
      expression = 'Angry';
      score = (browDownLeft + browDownRight) / 2;
    } else if (
      (browOuterUpLeft > 0.48 && browOuterUpRight < 0.25) ||
      (browOuterUpRight > 0.48 && browOuterUpLeft < 0.25)
    ) {
      expression = 'Skeptical';
      score = Math.max(browOuterUpLeft, browOuterUpRight);
    } else if (eyeLookUpLeft > 0.45 && eyeLookUpRight > 0.45) {
      expression = 'Eye_Roll';
      score = (eyeLookUpLeft + eyeLookUpRight) / 2;
    } else if (eyeWideLeft > 0.55 && eyeWideRight > 0.55 && jawOpen < 0.3) {
      expression = 'Wide_Eyes';
      score = (eyeWideLeft + eyeWideRight) / 2;
    } else if (mouthClose > 0.55 && jawOpen < 0.08) {
      expression = 'Shush';
      score = mouthClose;
    } else if (frownLeft > 0.35 && frownRight > 0.35) {
      expression = 'Sad';
      score = (frownLeft + frownRight) / 2;
    }

    return {
      blendshapes,
      expression,
      expressionScore: score,
    };
  }

  /**
   * Main frame analysis function called from requestAnimationFrame
   */
  public processVideoFrame(video: HTMLVideoElement, timestamp: number): DetectionResult {
    const startTime = performance.now();

    if (!this.isReady || !this.gestureRecognizer) {
      return {
        hands: [],
        face: null,
        activeGesture: null,
        activeEmoji: null,
        confidence: 0,
        allProbabilities: [],
        isTwoHandHeart: false,
        isClapping: false,
        isNamaste: false,
        isLotusFlower: false,
        isPinching: false,
        pinchDistance: 1,
        cursorPos: null,
        inferenceTimeMs: 0,
        timestamp,
      };
    }

    // MediaPipe requires strictly monotonically increasing timestamps
    let safeTimestamp = timestamp;
    if (safeTimestamp <= this.lastVideoTimestamp) {
      safeTimestamp = this.lastVideoTimestamp + 0.001;
    }
    this.lastVideoTimestamp = safeTimestamp;

    // 1. Gesture Recognizer Inference
    let gestureResult: { landmarks?: any[]; gestures?: any[]; handednesses?: any[] } = {
      landmarks: [],
      gestures: [],
      handednesses: [],
    };
    try {
      gestureResult = this.gestureRecognizer.recognizeForVideo(video, safeTimestamp) || gestureResult;
    } catch {
      // Safe pass on transient frame drops
    }

    // 2. Face Landmarker Inference (if enabled)
    let faceData: RecognizedFace | null = null;
    if (this.faceLandmarker) {
      try {
        const faceResult = this.faceLandmarker.detectForVideo(video, safeTimestamp);
        faceData = this.detectFaceExpression(faceResult);
      } catch {
        // Face detection error safe pass
      }
    }

    // Format recognized hands
    const hands: RecognizedHand[] = [];
    const allProbabilities: { label: string; score: number; emoji: string }[] = [];

    if (gestureResult.landmarks && gestureResult.landmarks.length > 0) {
      for (let i = 0; i < gestureResult.landmarks.length; i++) {
        const landmarks = gestureResult.landmarks[i];
        const handedness =
          gestureResult.handednesses && gestureResult.handednesses[i] && gestureResult.handednesses[i][0]
            ? (gestureResult.handednesses[i][0].categoryName as 'Left' | 'Right')
            : 'Right';

        let gestureName = 'None';
        let gestureScore = 0;

        if (gestureResult.gestures && gestureResult.gestures[i] && gestureResult.gestures[i][0]) {
          gestureName = gestureResult.gestures[i][0].categoryName;
          gestureScore = gestureResult.gestures[i][0].score;

          // Record top probabilities
          gestureResult.gestures[i].forEach((g: { categoryName: string; score: number }) => {
            const emoji = GESTURE_TO_EMOJI[g.categoryName] || '❓';
            if (!allProbabilities.some((p) => p.label === g.categoryName)) {
              allProbabilities.push({ label: g.categoryName, score: g.score, emoji });
            }
          });
        }

        // Check custom geometric rules first
        const customRule = this.detectCustomHandGesture(landmarks);
        if (customRule) {
          gestureName = customRule.gesture;
          gestureScore = customRule.confidence;
          allProbabilities.unshift({
            label: customRule.gesture,
            score: customRule.confidence,
            emoji: customRule.emoji,
          });
        } else {
          // Check kNN user-trained custom gesture
          const knnMatch = knnClassifier.classify(landmarks);
          if (knnMatch && knnMatch.confidence > 0.75) {
            gestureName = knnMatch.label;
            gestureScore = knnMatch.confidence;
            allProbabilities.unshift({
              label: knnMatch.label,
              score: knnMatch.confidence,
              emoji: knnMatch.emoji,
            });
          }
        }

        // Mirror coordinates horizontally for intuitive preview
        hands.push({
          landmarks,
          handedness,
          gestureName,
          gestureScore,
          normalizedLandmarks: landmarks,
          wristPos: { x: landmarks[0].x, y: landmarks[0].y },
          indexTip: { x: landmarks[8].x, y: landmarks[8].y },
          thumbTip: { x: landmarks[4].x, y: landmarks[4].y },
        });
      }
    }

    // 3. Multi-hand gestures
    const isNamaste = this.checkNamaste(hands);
    const isLotusFlower = this.checkLotusFlower(hands);
    const isTwoHandHeart = this.checkTwoHandHeart(hands);
    const isClapping = this.checkClapping(hands);

    // 4. Cursor position & Pinching (thumb tip to index tip)
    let isPinching = false;
    let pinchDistance = 1;
    let cursorPos: { x: number; y: number } | null = null;

    if (hands.length > 0) {
      const primaryHand = hands[0];
      // Mirrored X for natural mouse-pointer interaction
      cursorPos = {
        x: 1 - primaryHand.indexTip.x,
        y: primaryHand.indexTip.y,
      };

      const rawDist = Math.hypot(
        primaryHand.indexTip.x - primaryHand.thumbTip.x,
        primaryHand.indexTip.y - primaryHand.thumbTip.y
      );
      pinchDistance = rawDist;
      if (rawDist < PINCH_THRESHOLD_NORM) {
        isPinching = true;
      }
    }

    // 5. Determine raw active gesture
    let rawGesture: string | null = null;
    let rawEmoji: string | null = null;
    let rawConfidence = 0;

    if (isNamaste) {
      rawGesture = 'Namaste';
      rawEmoji = '🙏';
      rawConfidence = 0.97;
    } else if (isLotusFlower) {
      rawGesture = 'Lotus_Flower';
      rawEmoji = '🪷';
      rawConfidence = 0.94;
    } else if (isTwoHandHeart) {
      rawGesture = 'Two_Hand_Heart';
      rawEmoji = '❤️';
      rawConfidence = 0.96;
    } else if (isClapping) {
      rawGesture = 'Clapping';
      rawEmoji = '👏';
      rawConfidence = 0.90;
    } else if (hands.length > 0 && hands[0].gestureName !== 'None') {
      rawGesture = hands[0].gestureName;
      rawEmoji = GESTURE_TO_EMOJI[rawGesture] || (allProbabilities[0]?.emoji ?? null);
      rawConfidence = hands[0].gestureScore;
    } else if (faceData && faceData.expression) {
      rawGesture = faceData.expression;
      rawEmoji = GESTURE_TO_EMOJI[faceData.expression] || '😀';
      rawConfidence = faceData.expressionScore;
    }

    // 6. Temporal smoothing over last 10 frames
    if (rawGesture && rawEmoji && rawConfidence > 0.5) {
      this.gestureHistory.push({
        gesture: rawGesture,
        emoji: rawEmoji,
        confidence: rawConfidence,
        timestamp,
      });
    }

    // Retain only last N frames
    if (this.gestureHistory.length > SMOOTHING_FRAME_WINDOW) {
      this.gestureHistory.shift();
    }

    // Vote on dominant smoothed gesture in the recent window
    let smoothedGesture: string | null = null;
    let smoothedEmoji: string | null = null;
    let smoothedConfidence = 0;

    if (this.gestureHistory.length > 0) {
      const counts: Record<string, { count: number; emoji: string; sumConf: number }> = {};
      for (const item of this.gestureHistory) {
        if (!counts[item.gesture]) {
          counts[item.gesture] = { count: 0, emoji: item.emoji, sumConf: 0 };
        }
        counts[item.gesture].count += 1;
        counts[item.gesture].sumConf += item.confidence;
      }

      let maxCount = 0;
      for (const [gest, data] of Object.entries(counts)) {
        if (data.count > maxCount) {
          maxCount = data.count;
          smoothedGesture = gest;
          smoothedEmoji = data.emoji;
          smoothedConfidence = data.sumConf / data.count;
        }
      }

      // Must be present in at least 4 of the last window frames
      if (maxCount < 3) {
        smoothedGesture = null;
        smoothedEmoji = null;
      }
    }

    // 7. Hold-to-confirm progress
    const now = performance.now();
    if (smoothedGesture && smoothedGesture === this.candidateGesture) {
      const elapsed = now - this.candidateStartTime;
      this.holdProgress = Math.min(1.0, elapsed / HOLD_CONFIRM_MS);
      if (this.holdProgress >= 1.0) {
        this.confirmedGesture = smoothedGesture;
      }
    } else {
      this.candidateGesture = smoothedGesture;
      this.candidateStartTime = now;
      this.holdProgress = 0;
      this.confirmedGesture = null;
    }

    const inferenceTimeMs = performance.now() - startTime;

    return {
      hands,
      face: faceData,
      activeGesture: smoothedGesture,
      activeEmoji: smoothedEmoji,
      confidence: smoothedConfidence,
      allProbabilities: allProbabilities.slice(0, 5),
      isTwoHandHeart,
      isClapping,
      isNamaste,
      isLotusFlower,
      isPinching,
      pinchDistance,
      cursorPos,
      inferenceTimeMs,
      timestamp,
    };
  }

  public getHoldProgress(): { progress: number; candidate: string | null; confirmed: string | null } {
    return {
      progress: this.holdProgress,
      candidate: this.candidateGesture,
      confirmed: this.confirmedGesture,
    };
  }

  public resetHoldState() {
    this.candidateGesture = null;
    this.confirmedGesture = null;
    this.holdProgress = 0;
    this.gestureHistory = [];
  }

  /**
   * Draw the 21 landmarks and skeleton on a canvas
   */
  public drawHandLandmarks(
    ctx: CanvasRenderingContext2D,
    hands: RecognizedHand[],
    width: number,
    height: number,
    showJointLabels: boolean = false,
    privacyMode: boolean = false
  ) {
    ctx.save();

    if (privacyMode) {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, width, height);

      // Subtle cyber grid
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Mirror horizontally so drawn landmarks match mirrored preview
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    for (const hand of hands) {
      const lm = hand.landmarks;

      // 1. Draw connection bones with glowing neon lines
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const p1 = lm[startIdx];
        const p2 = lm[endIdx];

        // Determine finger color
        let color = FINGER_COLORS.palm;
        if (startIdx >= 1 && endIdx <= 4) color = FINGER_COLORS.thumb;
        else if (startIdx >= 5 && endIdx <= 8) color = FINGER_COLORS.index;
        else if (startIdx >= 9 && endIdx <= 12) color = FINGER_COLORS.middle;
        else if (startIdx >= 13 && endIdx <= 16) color = FINGER_COLORS.ring;
        else if (startIdx >= 17 && endIdx <= 20) color = FINGER_COLORS.pinky;

        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }

      ctx.shadowBlur = 0; // reset glow

      // 2. Draw 21 joints
      for (let i = 0; i < lm.length; i++) {
        const pt = lm[i];
        const x = pt.x * width;
        const y = pt.y * height;

        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 6 : i === 0 ? 7 : 4;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isTip ? '#FFFFFF' : '#38BDF8';
        ctx.fill();

        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Optional joint indices for Learn Mode
        if (showJointLabels) {
          ctx.save();
          // Un-mirror text so it's readable
          ctx.translate(x, y);
          ctx.scale(-1, 1);
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.fillText(String(i), 6, -6);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }
}

export const mediaPipeService = new MediaPipeService();
