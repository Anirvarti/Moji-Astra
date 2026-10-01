import { CustomSample, Landmark } from '../types';

const STORAGE_KEY = 'gesturemoji_custom_samples';

export class KNNClassifier {
  private samples: CustomSample[] = [];

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.samples = JSON.parse(data);
      }
    } catch {
      this.samples = [];
    }
  }

  public saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.samples));
    } catch (e) {
      console.warn('Could not save custom gesture samples to localStorage', e);
    }
  }

  public getSamples(): CustomSample[] {
    return this.samples;
  }

  public getGesturesList(): { label: string; emoji: string; count: number }[] {
    const map = new Map<string, { label: string; emoji: string; count: number }>();
    for (const s of this.samples) {
      if (!map.has(s.label)) {
        map.set(s.label, { label: s.label, emoji: s.emoji, count: 0 });
      }
      map.get(s.label)!.count++;
    }
    return Array.from(map.values());
  }

  public addSample(label: string, emoji: string, landmarks: Landmark[]): boolean {
    if (!landmarks || landmarks.length !== 21) return false;
    const vector = this.normalizeLandmarksToVector(landmarks);
    if (!vector) return false;

    this.samples.push({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label,
      emoji,
      vector,
      timestamp: Date.now(),
    });

    this.saveToStorage();
    return true;
  }

  public deleteLabel(label: string) {
    this.samples = this.samples.filter((s) => s.label !== label);
    this.saveToStorage();
  }

  public clearAll() {
    this.samples = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Normalizes 21 landmarks:
   * 1. Shift wrist (landmark 0) to (0, 0, 0)
   * 2. Scale by Euclidean distance from wrist (0) to middle MCP (9)
   * 3. Flatten to 63 floats (x, y, z for all 21 points)
   */
  public normalizeLandmarksToVector(landmarks: Landmark[]): number[] | null {
    if (!landmarks || landmarks.length !== 21) return null;
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];

    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;
    const dz = middleMcp.z - wrist.z;
    const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

    const vector: number[] = [];
    for (let i = 0; i < 21; i++) {
      const pt = landmarks[i];
      vector.push(
        (pt.x - wrist.x) / scale,
        (pt.y - wrist.y) / scale,
        (pt.z - wrist.z) / scale
      );
    }
    return vector;
  }

  /**
   * k-Nearest Neighbors classification
   */
  public classify(
    landmarks: Landmark[],
    k: number = 3,
    maxDistanceThreshold: number = 2.4
  ): { label: string; emoji: string; confidence: number; distance: number } | null {
    if (this.samples.length === 0) return null;
    const liveVector = this.normalizeLandmarksToVector(landmarks);
    if (!liveVector) return null;

    // Calculate Euclidean distance to all recorded samples
    const distances = this.samples.map((sample) => {
      let sumSq = 0;
      for (let i = 0; i < 63; i++) {
        const diff = liveVector[i] - sample.vector[i];
        sumSq += diff * diff;
      }
      return {
        sample,
        dist: Math.sqrt(sumSq),
      };
    });

    distances.sort((a, b) => a.dist - b.dist);
    const topK = distances.slice(0, Math.min(k, distances.length));

    // Nearest sample distance check
    const nearest = topK[0];
    if (nearest.dist > maxDistanceThreshold) {
      return null;
    }

    // Vote among top K
    const votes: Record<string, { count: number; emoji: string; sumWeight: number }> = {};
    topK.forEach(({ sample, dist }) => {
      const weight = 1 / (dist + 0.0001);
      if (!votes[sample.label]) {
        votes[sample.label] = { count: 0, emoji: sample.emoji, sumWeight: 0 };
      }
      votes[sample.label].count += 1;
      votes[sample.label].sumWeight += weight;
    });

    let bestLabel = '';
    let bestWeight = -1;
    let bestEmoji = '';

    for (const [lbl, data] of Object.entries(votes)) {
      if (data.sumWeight > bestWeight) {
        bestWeight = data.sumWeight;
        bestLabel = lbl;
        bestEmoji = data.emoji;
      }
    }

    // Confidence estimation
    const confidence = Math.max(0.2, Math.min(0.99, 1 - nearest.dist / maxDistanceThreshold));

    return {
      label: bestLabel,
      emoji: bestEmoji,
      confidence,
      distance: nearest.dist,
    };
  }
}

export const knnClassifier = new KNNClassifier();
