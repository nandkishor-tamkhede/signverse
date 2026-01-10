import { GestureClassificationResult, GestureDefinition } from '@/types/gesture';

/**
 * Temporal Smoothing for Gesture Recognition
 * 
 * Uses a sliding window of recent predictions to:
 * 1. Reduce flickering between similar gestures
 * 2. Apply hysteresis to prevent rapid switching
 * 3. Require consistent detection before confirming a gesture
 */

interface GestureVote {
  gestureName: string | null;
  confidence: number;
  timestamp: number;
}

interface SmoothingConfig {
  windowSize: number; // Number of frames to consider
  minConsensus: number; // Minimum ratio of votes needed (0-1)
  hysteresisThreshold: number; // Confidence needed to switch from current gesture
  maxAge: number; // Maximum age of votes in ms
  cooldownMs: number; // Minimum time between gesture changes
}

const DEFAULT_CONFIG: SmoothingConfig = {
  windowSize: 8,
  minConsensus: 0.5, // 50% of frames must agree
  hysteresisThreshold: 0.75, // Need 75% confidence to switch gestures
  maxAge: 500, // 500ms window
  cooldownMs: 150, // 150ms cooldown between changes
};

export class GestureTemporalSmoother {
  private votes: GestureVote[] = [];
  private currentGesture: GestureDefinition | null = null;
  private currentConfidence: number = 0;
  private lastChangeTime: number = 0;
  private config: SmoothingConfig;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a new gesture prediction and get the smoothed result
   */
  addPrediction(result: GestureClassificationResult): GestureClassificationResult {
    const now = Date.now();
    
    // Add new vote
    this.votes.push({
      gestureName: result.gesture?.name || null,
      confidence: result.confidence,
      timestamp: now,
    });

    // Remove old votes
    this.pruneOldVotes(now);

    // Get consensus
    const consensus = this.getConsensus();

    // Apply hysteresis
    return this.applyHysteresis(consensus, now);
  }

  private pruneOldVotes(now: number): void {
    // Remove votes older than maxAge
    const cutoff = now - this.config.maxAge;
    this.votes = this.votes.filter(v => v.timestamp >= cutoff);

    // Keep only last windowSize votes
    if (this.votes.length > this.config.windowSize) {
      this.votes = this.votes.slice(-this.config.windowSize);
    }
  }

  private getConsensus(): { gestureName: string | null; confidence: number } {
    if (this.votes.length === 0) {
      return { gestureName: null, confidence: 0 };
    }

    // Count votes for each gesture (weighted by confidence)
    const voteCounts = new Map<string | null, { count: number; totalConfidence: number }>();

    for (const vote of this.votes) {
      const key = vote.gestureName;
      const existing = voteCounts.get(key) || { count: 0, totalConfidence: 0 };
      voteCounts.set(key, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + vote.confidence,
      });
    }

    // Find the gesture with most votes
    let bestGesture: string | null = null;
    let bestScore = 0;
    let bestConfidence = 0;

    for (const [gestureName, stats] of voteCounts) {
      // Score = vote ratio * average confidence
      const voteRatio = stats.count / this.votes.length;
      const avgConfidence = stats.totalConfidence / stats.count;
      const score = voteRatio * avgConfidence;

      if (score > bestScore) {
        bestScore = score;
        bestGesture = gestureName;
        bestConfidence = avgConfidence;
      }
    }

    // Check if consensus meets minimum threshold
    const winnerVotes = voteCounts.get(bestGesture);
    if (!winnerVotes || (winnerVotes.count / this.votes.length) < this.config.minConsensus) {
      // Not enough consensus - keep current gesture or return null
      return { gestureName: this.currentGesture?.name || null, confidence: this.currentConfidence * 0.9 };
    }

    return { gestureName: bestGesture, confidence: bestConfidence };
  }

  private applyHysteresis(
    consensus: { gestureName: string | null; confidence: number },
    now: number
  ): GestureClassificationResult {
    const { gestureName, confidence } = consensus;

    // If no current gesture, accept any valid consensus
    if (!this.currentGesture) {
      if (gestureName && confidence >= DEFAULT_CONFIG.hysteresisThreshold * 0.8) {
        this.setCurrentGesture(gestureName, confidence, now);
      }
      return { gesture: this.currentGesture, confidence: this.currentConfidence };
    }

    // If same gesture, update confidence
    if (gestureName === this.currentGesture.name) {
      this.currentConfidence = confidence;
      return { gesture: this.currentGesture, confidence: this.currentConfidence };
    }

    // Cooldown check
    if (now - this.lastChangeTime < this.config.cooldownMs) {
      return { gesture: this.currentGesture, confidence: this.currentConfidence };
    }

    // Different gesture - apply hysteresis
    if (gestureName === null) {
      // Gesture lost - decay current confidence
      this.currentConfidence *= 0.85;
      if (this.currentConfidence < 0.3) {
        this.currentGesture = null;
        this.currentConfidence = 0;
      }
      return { gesture: this.currentGesture, confidence: this.currentConfidence };
    }

    // New gesture detected - need higher confidence to switch
    if (confidence >= this.config.hysteresisThreshold) {
      this.setCurrentGesture(gestureName, confidence, now);
    }

    return { gesture: this.currentGesture, confidence: this.currentConfidence };
  }

  private setCurrentGesture(gestureName: string, confidence: number, now: number): void {
    // Import dynamically to avoid circular dependency
    import('./gestureDatabase').then(({ GESTURE_MAP }) => {
      const gesture = GESTURE_MAP.get(gestureName);
      if (gesture) {
        this.currentGesture = gesture;
        this.currentConfidence = confidence;
        this.lastChangeTime = now;
      }
    });
    
    // Immediate sync fallback
    this.currentConfidence = confidence;
    this.lastChangeTime = now;
  }

  /**
   * Reset the smoother state
   */
  reset(): void {
    this.votes = [];
    this.currentGesture = null;
    this.currentConfidence = 0;
    this.lastChangeTime = 0;
  }

  /**
   * Get current state for debugging
   */
  getState(): { voteCount: number; currentGesture: string | null; confidence: number } {
    return {
      voteCount: this.votes.length,
      currentGesture: this.currentGesture?.name || null,
      confidence: this.currentConfidence,
    };
  }
}

// Global instance for convenience
let globalSmoother: GestureTemporalSmoother | null = null;

export function getGlobalSmoother(): GestureTemporalSmoother {
  if (!globalSmoother) {
    globalSmoother = new GestureTemporalSmoother();
  }
  return globalSmoother;
}

export function smoothGesture(result: GestureClassificationResult): GestureClassificationResult {
  return getGlobalSmoother().addPrediction(result);
}

export function resetSmoothing(): void {
  globalSmoother?.reset();
}
