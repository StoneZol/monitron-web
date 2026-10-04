import {
  AUDIO_BAND_COUNT,
  AUDIO_BAND_FMAX,
  AUDIO_BAND_FMIN,
} from "./audioBus";

function clip01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export type PackedSpectrum = {
  bands: number[];
  rms: number;
  peak: number;
  sampleRate: number;
};

/**
 * Pack AnalyserNode FFT into the same log-spaced layout as the plugin.
 * Keeps mic / plugin frames interchangeable for screens.
 *
 * Each FFT bin maps to exactly one log band (by bin center Hz). Empty bands
 * (log slots thinner than one bin at the low end) are linearly interpolated
 * so bass bars don't lock to a shared bin.
 */
export function packAnalyserSpectrum(
  analyser: AnalyserNode,
  sampleRate: number,
  freq: Uint8Array<ArrayBuffer>,
  time: Uint8Array<ArrayBuffer>,
): PackedSpectrum {
  analyser.getByteFrequencyData(freq);
  analyser.getByteTimeDomainData(time);
  const bins = freq.length;
  const fftSize = bins * 2;

  let td = 0;
  let tdPeak = 0;
  for (let i = 0; i < time.length; i++) {
    const v = Math.abs((time[i]! - 128) / 128);
    td += v * v;
    if (v > tdPeak) tdPeak = v;
  }
  const rms = clip01(Math.sqrt(td / time.length));
  const peak = clip01(tdPeak);

  const logMin = Math.log(AUDIO_BAND_FMIN);
  const logSpan = Math.log(AUDIO_BAND_FMAX) - logMin;
  const sums = new Float64Array(AUDIO_BAND_COUNT);
  const counts = new Uint32Array(AUDIO_BAND_COUNT);

  // Skip DC (bin 0). Bin i center ≈ i * sampleRate / fftSize.
  for (let bin = 1; bin < bins; bin++) {
    const hz = (bin * sampleRate) / fftSize;
    if (hz < AUDIO_BAND_FMIN || hz > AUDIO_BAND_FMAX) continue;
    const t = (Math.log(hz) - logMin) / logSpan;
    const i = Math.min(
      AUDIO_BAND_COUNT - 1,
      Math.max(0, Math.floor(t * AUDIO_BAND_COUNT)),
    );
    sums[i]! += freq[bin]!;
    counts[i]! += 1;
  }

  const bands = new Array<number>(AUDIO_BAND_COUNT);
  for (let i = 0; i < AUDIO_BAND_COUNT; i++) {
    bands[i] = counts[i]! > 0 ? sums[i]! / counts[i]! / 255 : Number.NaN;
  }

  // Fill log slots that got no FFT bin (common under ~100 Hz @ fftSize 2048).
  let prev = -1;
  for (let i = 0; i < AUDIO_BAND_COUNT; i++) {
    if (!Number.isFinite(bands[i]!)) continue;
    if (prev >= 0 && i - prev > 1) {
      const a = bands[prev]!;
      const b = bands[i]!;
      const span = i - prev;
      for (let j = prev + 1; j < i; j++) {
        const u = (j - prev) / span;
        bands[j] = a + (b - a) * u;
      }
    } else if (prev < 0) {
      for (let j = 0; j < i; j++) bands[j] = bands[i]!;
    }
    prev = i;
  }
  if (prev >= 0) {
    for (let j = prev + 1; j < AUDIO_BAND_COUNT; j++) {
      bands[j] = bands[prev]!;
    }
  } else {
    bands.fill(0);
  }

  for (let i = 0; i < AUDIO_BAND_COUNT; i++) {
    bands[i] = clip01(bands[i]!);
  }

  return { bands, rms, peak, sampleRate };
}
