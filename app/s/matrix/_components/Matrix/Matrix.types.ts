import type { AudioSource } from "@/hooks/useAudioReactive";
import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type MatrixControls = {
  twinkle: boolean;
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  color: string;
  fallSpeed: number;
  /** Smooth cruise lift on fall speed */
  speedChannel: ReactiveChannel;
  speedDrive: number;
  /** Rising-edge kick channel for fall accel + column dumps */
  accelChannel: ReactiveChannel;
  /** Multiplies kick punches + global fall accel on reactive */
  drive: number;
  /** Color / twinkle pulse boost 0…2 */
  colorDrive: number;
  /** Multiplies bus peak for punches / glow (quiet tab volume) */
  peakGain: number;
  /** Audio feed: off | mic | plugin */
  audioSource: AudioSource;
  /** Mic noise-gate threshold (only used when audioSource === mic) */
  micGate: number;
  /** Mic level boost before gate (only used when audioSource === mic) */
  micGain: number;
};

/** Fall punch drive */
export const MATRIX_DRIVE_MAX = 8;
/** Color / twinkle punch */
export const MATRIX_COLOR_DRIVE_MAX = 2;

export type MatrixProps = Record<string, never>;
