import type { ReactiveChannel } from "@/lib/visualAudio";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type Blue002Props = {
  showOverlay?: boolean;
};

/**
 * Color look:
 * - original — stock blue idle → white-blue peak
 * - twinkle — solid HSL hue walk
 */
export type Blue002ColorMode = "original" | "twinkle";

/**
 * Camera:
 * - flex — coral-style center + bank wander (default)
 * - manual — freelook X/Y ±180°
 */
export type Blue002CameraMode = "flex" | "manual";

export type Blue002Live = {
  /** Flight clock (1 ≈ Shadertoy iTime) */
  flightSpeed: number;
  cameraMode: Blue002CameraMode;
  /** Manual look X degrees ±180 */
  yaw: number;
  /** Manual look Y degrees ±180 */
  pitch: number;
  /** Flex scatter (0 = locked, 1 = default) */
  cameraBank: number;
  colorMode: Blue002ColorMode;
  /** Idle tint (original ≈ stock blue) */
  color: string;
  /** Peak tint (original ≈ white-blue) */
  colorPeak: string;
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  saturation: number;
  /** Light — idle→peak + glow punch */
  colorChannel: ReactiveChannel;
  colorDrive: number;
  /** Cruise — lifts flight */
  speedChannel: ReactiveChannel;
  speedDrive: number;
  /** Kick — flight accel */
  accelChannel: ReactiveChannel;
  accelDrive: number;
  /** Flex look clock — only when cameraMode = flex; default off */
  camAccelChannel: ReactiveChannel;
  camAccelDrive: number;
};

export const BLUE002_DRIVE_MAX = 8;
export const BLUE002_COLOR_DRIVE_MAX = 4;

/** Stock `vec3(0.0, 0.3, 0.7)` */
export const BLUE002_STOCK = "#004db3";
/** White-blue peak */
export const BLUE002_PEAK = "#c8e8ff";

export const BLUE002_DEFAULTS: Blue002Live = {
  flightSpeed: 1,
  cameraMode: "flex",
  yaw: 0,
  pitch: 0,
  cameraBank: 0.5,
  colorMode: "original",
  color: BLUE002_STOCK,
  colorPeak: BLUE002_PEAK,
  twinkleSpeed: TWINKLE_DEFAULT_SPEED,
  twinkleS: TWINKLE_DEFAULT_S,
  twinkleL: TWINKLE_DEFAULT_L,
  saturation: 1,
  colorChannel: "mid",
  colorDrive: 1.3,
  speedChannel: "bass",
  speedDrive: 1.2,
  accelChannel: "beat",
  accelDrive: 1.3,
  camAccelChannel: "off",
  camAccelDrive: 1.4,
};

export const BLUE002_RANGES = {
  flightSpeed: { min: 0.05, max: 4, step: 0.05 },
  yaw: { min: -180, max: 180, step: 1 },
  pitch: { min: -180, max: 180, step: 1 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: BLUE002_COLOR_DRIVE_MAX, step: 0.1 },
  speedDrive: { min: 0, max: BLUE002_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: BLUE002_DRIVE_MAX, step: 0.1 },
  camAccelDrive: { min: 0, max: BLUE002_DRIVE_MAX, step: 0.1 },
} as const;
