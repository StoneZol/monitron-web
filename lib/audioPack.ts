import {
  AUDIO_BAND_COUNT,
  AUDIO_BAND_FMAX,
  AUDIO_BAND_FMIN,
  bandHzRange,
} from "./audioBus";

function clip01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hzToBin(hz: number, sampleRate: number, binCount: number) {
  return Math.round((hz / sampleRate) * binCount);
}

/** Mean energy 0..1 across FFT bins [from, to). */
function bandMean(data: Uint8Array, from: number, to: number) {
  const start = Math.max(0, Math.min(data.length - 1, from));
  const end = Math.max(start + 1, Math.min(data.length, to));
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i]!;
  return sum / (end - start) / 255;
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

  let td = 0;
  let tdPeak = 0;
  for (let i = 0; i < time.length; i++) {
    const v = Math.abs((time[i]! - 128) / 128);
    td += v * v;
    if (v > tdPeak) tdPeak = v;
  }
  const rms = clip01(Math.sqrt(td / time.length));
  const peak = clip01(tdPeak);

  const bands = new Array<number>(AUDIO_BAND_COUNT);
  for (let i = 0; i < AUDIO_BAND_COUNT; i++) {
    const { lo, hi } = bandHzRange(
      i,
      AUDIO_BAND_COUNT,
      AUDIO_BAND_FMIN,
      AUDIO_BAND_FMAX,
    );
    const from = hzToBin(lo, sampleRate, bins);
    const to = hzToBin(hi, sampleRate, bins);
    bands[i] = bandMean(freq, from, Math.max(from + 1, to));
  }

  return { bands, rms, peak, sampleRate };
}
