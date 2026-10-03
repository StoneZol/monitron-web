import type { AudioSource } from "@/hooks/useAudioReactive";

export type MatrixControls = {
  twinkle: boolean;
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  color: string;
  fallSpeed: number;
  /** Multiplies low-slice punches + global fall on reactive */
  drive: number;
  /** Color / twinkle pulse boost 0…2 */
  colorDrive: number;
  /** Multiplies bus peak for punches / glow (quiet tab volume) */
  peakGain: number;
  /** Audio feed: off | mic | plugin */
  audioSource: AudioSource;
  /** Mic noise-gate threshold (only used when audioSource === mic) */
  micGate: number;
};

/** Fall punch drive */
export const MATRIX_DRIVE_MAX = 8;
/** Color / twinkle punch */
export const MATRIX_COLOR_DRIVE_MAX = 2;

export type MatrixProps = Record<string, never>;
