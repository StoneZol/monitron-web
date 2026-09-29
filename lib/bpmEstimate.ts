/**
 * Approximate BPM from beat (preferred) / bass onset gaps.
 *
 * Fast tracks used to read LOW (every 2nd hit skipped by a fixed refractory →
 * double IOI → half BPM). Slow tracks read HIGH (extra onsets). Fix:
 * adaptive refractory + octave folding toward the running estimate.
 */

const LEVEL_MIN = 0.07;
const RISE = 0.045;
const IOI_MIN_MS = 280;
const IOI_MAX_MS = 1300;
const WINDOW = 5;
const STALE_MS = 2800;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Fold 2× / ½× mistakes into the current tempo hypothesis */
function foldOctave(instant: number, current: number): number {
  if (current <= 0) return instant;
  let x = instant;
  for (let i = 0; i < 2; i++) {
    const r = x / current;
    if (r > 1.85 && r < 2.2) x *= 0.5;
    else if (r > 0.45 && r < 0.54) x *= 2;
    else break;
  }
  return x;
}

export class BpmEstimator {
  private prev = 0;
  private lastOnset = 0;
  private intervals: number[] = [];
  private bpm = 0;
  private peak = 0;

  reset() {
    this.prev = 0;
    this.lastOnset = 0;
    this.intervals = [];
    this.bpm = 0;
    this.peak = 0;
  }

  /**
   * @param beat 0..1 beat / onset band
   * @param bass 0..1 — fallback when beat is weak
   */
  push(beat: number, bass: number, nowMs: number): number {
    const b = Math.max(0, Math.min(1, beat));
    const a = Math.max(0, Math.min(1, bass));
    const x = b >= 0.05 ? b : Math.max(b, a * 0.85);

    this.peak = Math.max(x, this.peak * 0.99);
    const thresh = Math.max(LEVEL_MIN, this.peak * 0.4);

    const crossed = this.prev < thresh && x >= thresh;
    const rising = x >= thresh && x > this.prev + RISE;
    const candidate = crossed || rising;
    this.prev = x;

    if (!candidate) {
      if (this.bpm > 0 && this.lastOnset > 0 && nowMs - this.lastOnset > STALE_MS) {
        this.bpm *= 0.97;
        if (this.bpm < 45) this.reset();
      }
      return this.bpm;
    }

    // Refractory tracks expected beat period so fast tempos aren't halved
    const expectedMs = this.bpm > 0 ? 60000 / this.bpm : 500;
    const refractory = clamp(expectedMs * 0.52, 180, 420);
    if (this.lastOnset > 0 && nowMs - this.lastOnset < refractory) {
      return this.bpm;
    }

    if (this.lastOnset > 0) {
      const ioi = nowMs - this.lastOnset;
      if (ioi >= IOI_MIN_MS && ioi <= IOI_MAX_MS) {
        let instant = foldOctave(60000 / ioi, this.bpm);
        // Also fold against median of recent raw IOIs if we already have a cluster
        if (this.intervals.length >= 2) {
          const sorted = [...this.intervals].sort((p, q) => p - q);
          const med = sorted[sorted.length >> 1]!;
          instant = foldOctave(instant, 60000 / med);
        }

        this.intervals.push(60000 / instant);
        if (this.intervals.length > WINDOW) this.intervals.shift();

        const sorted = [...this.intervals].sort((p, q) => p - q);
        const medianIoi = sorted[sorted.length >> 1]!;
        const target = 60000 / medianIoi;

        if (this.bpm <= 0) {
          this.bpm = target;
        } else {
          const ratio = target / this.bpm;
          const jumped = ratio > 1.1 || ratio < 0.91;
          const alpha = jumped ? 0.5 : 0.25;
          this.bpm = this.bpm * (1 - alpha) + target * alpha;
        }
      }
    }

    this.lastOnset = nowMs;
    return this.bpm;
  }
}
