import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type MusicVisualBarProps = {
  showOverlay?: boolean;
};

export type MusicVisualBarLive = {
  /** Base spin rate (1 ≈ calm neon crawl) */
  flightSpeed: number;
  /** Bloom disk gain (0 = off) */
  bloomGain: number;
  /** Lateral streak gain (0 = off) */
  streakGain: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  /** Non-linear spectrum spin acceleration */
  spinChannel: ReactiveChannel;
  spinDrive: number;
  /** Keep ring locked at screen center (no drift glide) */
  fixedCenter: boolean;
  /** Smooth drift — mild accel on channel peaks (when not fixed) */
  driftChannel: ReactiveChannel;
  driftDrive: number;
};

export const MUSIC_VISUAL_BAR_DRIVE_MAX = 8;
export const MUSIC_VISUAL_BAR_COLOR_DRIVE_MAX = 2;

export const MUSIC_VISUAL_BAR_DEFAULTS: MusicVisualBarLive = {
  flightSpeed: 1,
  bloomGain: 0.9,
  streakGain: 0.32,
  colorChannel: "bass",
  colorDrive: 1.2,
  spinChannel: "mid",
  spinDrive: 2,
  fixedCenter: true,
  driftChannel: "beat",
  driftDrive: 1.2,
};

export const MUSIC_VISUAL_BAR_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  bloomGain: { min: 0, max: 1.5, step: 0.05 },
  streakGain: { min: 0, max: 1, step: 0.05 },
  colorDrive: { min: 0, max: MUSIC_VISUAL_BAR_COLOR_DRIVE_MAX, step: 0.05 },
  spinDrive: { min: 0, max: MUSIC_VISUAL_BAR_DRIVE_MAX, step: 0.1 },
  driftDrive: { min: 0, max: MUSIC_VISUAL_BAR_DRIVE_MAX, step: 0.1 },
} as const;
