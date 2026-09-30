import type { AudioSource } from "@/hooks/useAudioReactive";

export type HslColor = {
  h: number;
  s: number;
  l: number;
};

export type MatrixControls = {
  twinkle: boolean;
  color: string;
  fallSpeed: number;
  colorSpeed: number;
  /** Multiplies low-slice punches + global fall on reactive */
  drive: number;
  /** Audio feed: off | mic | plugin */
  audioSource: AudioSource;
  /** Mic noise-gate threshold (only used when audioSource === mic) */
  micGate: number;
};

export type MatrixProps = Record<string, never>;
