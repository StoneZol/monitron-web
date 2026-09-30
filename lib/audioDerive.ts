import {
  AUDIO_BAND_COUNT,
  AUDIO_BAND_FMAX,
  AUDIO_BAND_FMIN,
  bandHzRange,
} from "./audioBus";

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
