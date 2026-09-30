import { AUDIO_BAND_COUNT } from "@/lib/audioBus";

export type SpectrumSnap = {
  bands: number[];
  rms: number;
  peak: number;
  sampleRate: number;
  t: number;
  /** performance.now() of last frame */
  at: number;
};

export function emptySpectrumSnap(): SpectrumSnap {
  return {
    bands: new Array(AUDIO_BAND_COUNT).fill(0),
    rms: 0,
    peak: 0,
    sampleRate: 0,
    t: 0,
    at: 0,
  };
}

export { AUDIO_BAND_COUNT };
