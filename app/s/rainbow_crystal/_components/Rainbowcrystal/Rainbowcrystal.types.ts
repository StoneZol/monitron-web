import type { ReactiveChannel } from "@/lib/visualAudio";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type RainbowcrystalProps = {
  showOverlay?: boolean;
};

/**
 * Color look:
 * - original - OldEclipse exp(sin) phase (locked source palette)
 * - flow     - same original palette, continuous phase shift
 * - twinkle  - solid HSL hue walk + audio light pulse
 * - palette  - solid idle->peak (one color pair)
 */
export type RainbowcrystalColorMode =
  | "original"
  | "flow"
  | "twinkle"
  | "palette";

export type RainbowcrystalLive = {
  /** Crystal march clock (1 ~= Shadertoy iTime) */
  crystalSpeed: number;
  colorMode: RainbowcrystalColorMode;
  /** Shell tint - idle (palette mode) */
  color: string;
  /** Tint at audio peak (palette mode) */
  colorPeak: string;
  /**
   * Twinkle: HSL walk speed. Flow: rainbow phase shift speed.
   * (1 ~= full lap / ~6s)
   */
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  /** Look chroma (0 = gray, 1 = default) */
  saturation: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  /** Smooth cruise - lifts base crystal clock */
  speedChannel: ReactiveChannel;
  speedDrive: number;
  /** Transient kick - rising-edge accel punches */
  accelChannel: ReactiveChannel;
  accelDrive: number;
};

export const RAINBOWCRYSTAL_DRIVE_MAX = 8;
export const RAINBOWCRYSTAL_COLOR_DRIVE_MAX = 2;

export const RAINBOWCRYSTAL_DEFAULTS: RainbowcrystalLive = {
  crystalSpeed: 1,
  colorMode: "original",
  color: "#7af0ff",
  colorPeak: "#ff7ad9",
  twinkleSpeed: TWINKLE_DEFAULT_SPEED,
  twinkleS: TWINKLE_DEFAULT_S,
  twinkleL: TWINKLE_DEFAULT_L,
  saturation: 1,
  colorChannel: "bass",
  colorDrive: 1.45,
  speedChannel: "mid",
  speedDrive: 1.65,
  accelChannel: "bass",
  accelDrive: 1.55,
};

export const RAINBOWCRYSTAL_RANGES = {
  crystalSpeed: { min: 0.1, max: 3, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: RAINBOWCRYSTAL_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: RAINBOWCRYSTAL_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: RAINBOWCRYSTAL_DRIVE_MAX, step: 0.1 },
} as const;
