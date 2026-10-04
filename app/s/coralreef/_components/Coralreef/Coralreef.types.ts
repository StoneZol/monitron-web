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

/**
 * Tunnel-end sun:
 * - original — stock bloom from the reef palette (1:1 Yusef28)
 * - custom — idle→peak or HSL twinkle on the bright core only
 */
export type CoralreefLightMode = "original" | "custom";

/** manual = X/Y freelook; flex = center + bank wander */
export type CoralreefCameraMode = "manual" | "flex";

export type CoralreefLive = {
  /** Flight / tunnel clock (1 ≈ Shadertoy iTime) */
  flightSpeed: number;
  cameraMode: CoralreefCameraMode;
  /** Look X in degrees — 0 = along tunnel (manual) */
  yaw: number;
  /** Look Y in degrees — 0 = along tunnel (manual) */
  pitch: number;
  /** Flex scatter (0 = locked center, 1 = default, 2 = 2×) */
  cameraBank: number;
  colorMode: CoralreefColorMode;
  /** Idle / peak (palette mode) */
  color: string;
  colorPeak: string;
  /** HSL walk (twinkle + paletteTwinkle speed) */
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  lightMode: CoralreefLightMode;
  /** Tunnel sun — idle / peak (custom + palette) */
  lightColor: string;
  lightColorPeak: string;
  lightTwinkle: boolean;
  lightTwinkleSpeed: number;
  lightTwinkleS: number;
  lightTwinkleL: number;
  /** Shadow / edge smooth (0 = stock Yusef28, 1 = default soft, 2 = 2× softer) */
  shadowSmooth: number;
  saturation: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
};

export const CORALREEF_DRIVE_MAX = 4;
export const CORALREEF_COLOR_DRIVE_MAX = 2;

/**
 * Warm white matching the stock +Z bloom after tanh (blown-out cos palette core).
 * Used when lightMode = custom; original mode ignores these and keeps Yusef28 1:1.
 */
export const CORALREEF_LIGHT_DEFAULT = "#fff0d6";
export const CORALREEF_LIGHT_PEAK_DEFAULT = "#ffffff";

export const CORALREEF_DEFAULTS: CoralreefLive = {
  flightSpeed: 1,
  cameraMode: "manual",
  yaw: 0,
  pitch: 0,
  cameraBank: 0.5,
  colorMode: "original",
  color: "#ff8e4a",
  colorPeak: "#ffd100",
  twinkleSpeed: 1,
  twinkleS: 100,
  twinkleL: 55,
  lightMode: "original",
  lightColor: CORALREEF_LIGHT_DEFAULT,
  lightColorPeak: CORALREEF_LIGHT_PEAK_DEFAULT,
  lightTwinkle: false,
  lightTwinkleSpeed: 1,
  lightTwinkleS: 100,
  lightTwinkleL: 70,
  shadowSmooth: 1,
  saturation: 1,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "bass",
  speedDrive: 1,
};

export const CORALREEF_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  yaw: { min: -180, max: 180, step: 0.5 },
  pitch: { min: -80, max: 80, step: 0.5 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  shadowSmooth: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: CORALREEF_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: CORALREEF_DRIVE_MAX, step: 0.1 },
} as const;
