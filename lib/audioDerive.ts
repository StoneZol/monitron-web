import {
  AUDIO_BAND_COUNT,
  AUDIO_BAND_FMAX,
  AUDIO_BAND_FMIN,
  bandHzRange,
  type AudioFrame,
} from "./audioBus";

function clip01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * Mean energy over bands whose center frequency sits in [hzLo, hzHi).
 * Layout must match the plugin's log pack (AUDIO_BAND_*).
 */
export function sliceBands(
  bands: ArrayLike<number>,
  hzLo: number,
  hzHi: number,
  count = bands.length || AUDIO_BAND_COUNT,
): number {
  if (!bands.length || hzHi <= hzLo) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < count; i++) {
    const { lo, hi } = bandHzRange(
      i,
      count,
      AUDIO_BAND_FMIN,
      AUDIO_BAND_FMAX,
    );
    const mid = (lo + hi) * 0.5;
    if (mid >= hzLo && mid < hzHi) {
      sum += bands[i] ?? 0;
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** Map column index 0..cols-1 → spectrum bin */
export function bandAtColumn(
  bands: ArrayLike<number>,
  column: number,
  columns: number,
): number {
  const n = bands.length;
  if (n <= 0 || columns <= 0) return 0;
  const bi = Math.min(n - 1, Math.max(0, Math.floor((column / columns) * n)));
  return Math.max(0, bands[bi] ?? 0);
}

/** Simple rising-edge gate on a 0..1 signal */
export function risingEdge(
  level: number,
  prev: number,
  edge = 0.05,
  min = 0.06,
): boolean {
  return level > prev + edge && level >= min;
}

export type DerivedAudio = {
  bands: number[];
  bass: number;
  mid: number;
  high: number;
  beat: number;
  rms: number;
  peak: number;
};

/**
 * Stateful page-side EQ / onset from raw plugin frames.
 * Plugin stays dumb — all musical meaning lives here.
 */
export class AudioDeriver {
  private bassFloor = 0.25;
  private prevKick = 0;
  private prevBeat = 0;

  reset() {
    this.bassFloor = 0.25;
    this.prevKick = 0;
    this.prevBeat = 0;
  }

  push(frame: AudioFrame): DerivedAudio {
    const bands = new Array<number>(AUDIO_BAND_COUNT);
    for (let i = 0; i < AUDIO_BAND_COUNT; i++) {
      bands[i] = frame.bands[i] ?? 0;
    }

    let bassRaw = sliceBands(bands, 30, 180);
    let mid = sliceBands(bands, 200, 2000);
    let high = sliceBands(bands, 2000, 10000);
    const kick = sliceBands(bands, 50, 120);

    const rms = clip01(frame.rms);
    const peak = clip01(frame.peak);

    // Near-silence FFT but audible waveform — lift from time domain
    if (bassRaw + mid + high < 0.015 && rms > 0.01) {
      const lift = clip01(rms * 3);
      bassRaw = lift;
      mid = clip01(lift * 0.7);
      high = clip01(lift * 0.45);
    }

    // Adaptive floor: sustained loud bass becomes baseline, punch = above it
    this.bassFloor = this.bassFloor * 0.98 + bassRaw * 0.02;
    const headroom = Math.max(0.12, 1 - this.bassFloor);
    const bass = clip01((bassRaw - this.bassFloor * 0.85) / headroom);

    const kickRise = Math.max(0, kick - this.prevKick);
    const transient = Math.max(0, peak - rms * 1.4);
    const onset = kickRise * 18 + transient * 2.8;
    const beat = clip01(Math.max(onset, this.prevBeat * 0.84));
    this.prevKick = kick;
    this.prevBeat = beat;

    return {
      bands,
      bass,
      mid: clip01(mid * 1.15),
      high: clip01(high * 1.25),
      beat,
      rms,
      peak,
    };
  }
}
