import { AUDIO_BAND_COUNT } from "@/lib/audioBus";

export type AudioBusSnap = {
  bands: number[];
  rms: number;
  peak: number;
  sampleRate: number;
  t: number;
  fps: number;
};

export function emptyAudioBusSnap(): AudioBusSnap {
  return {
    bands: new Array(AUDIO_BAND_COUNT).fill(0),
    rms: 0,
    peak: 0,
    sampleRate: 0,
    t: 0,
    fps: 0,
  };
}

export { AUDIO_BAND_COUNT };
