import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type CoralreefProps = {
  showOverlay?: boolean;
};

/**
 * Color look:
 * - original — Yusef28 stock cos palette
 * - paletteTwinkle — same palette, phase walks over time
 * - twinkle — solid HSL fill + light pulse
 * - palette — solid idle→peak
 */
export type CoralreefColorMode =
  | "original"
  | "paletteTwinkle"
  | "twinkle"
  | "palette";

export type CoralreefLive = {
  /** Flight / tunnel clock (1 ≈ Shadertoy iTime) */
  flightSpeed: number;
  colorMode: CoralreefColorMode;
  /** Idle / peak (palette mode) */
  color: string;
  colorPeak: string;
  /** HSL walk (twinkle + paletteTwinkle speed) */
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  saturation: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
};

export const CORALREEF_DRIVE_MAX = 4;
export const CORALREEF_COLOR_DRIVE_MAX = 2;

export const CORALREEF_DEFAULTS: CoralreefLive = {
  flightSpeed: 1,
  colorMode: "original",
  color: "#ff6b4a",
  colorPeak: "#4ad4ff",
  twinkleSpeed: 1,
  twinkleS: 100,
  twinkleL: 55,
  saturation: 1,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "bass",
  speedDrive: 1,
};

export const CORALREEF_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: CORALREEF_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: CORALREEF_DRIVE_MAX, step: 0.1 },
} as const;
