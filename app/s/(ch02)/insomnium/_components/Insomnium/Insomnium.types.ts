import type { ReactiveChannel } from "@/lib/visualAudio";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type InsomniumProps = {
  showOverlay?: boolean;
};

/** flex = coral wander on path (default). manual = freelook X/Y ±180°. */
export type InsomniumCameraMode = "flex" | "manual";

export type InsomniumLive = {
  flightSpeed: number;
  cameraMode: InsomniumCameraMode;
  yaw: number;
  pitch: number;
  cameraBank: number;
  /** March glow — idle ≈ stock vec3(9,2,1) */
  wallColor: string;
  wallColorPeak: string;
  wallTwinkle: boolean;
  wallTwinkleSpeed: number;
  wallTwinkleS: number;
  wallTwinkleL: number;
  /** Near-surface falloff tint — idle ≈ stock vec3(1,2,6) */
  lightColor: string;
  lightColorPeak: string;
  lightTwinkle: boolean;
  lightTwinkleSpeed: number;
  lightTwinkleS: number;
  lightTwinkleL: number;
  saturation: number;
  wallChannel: ReactiveChannel;
  wallDrive: number;
  lightChannel: ReactiveChannel;
  lightDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
  accelChannel: ReactiveChannel;
  accelDrive: number;
  /** Flex look clock — only in flex; default off */
  camAccelChannel: ReactiveChannel;
  camAccelDrive: number;
};

export const INSOMNIUM_DRIVE_MAX = 8;
export const INSOMNIUM_COLOR_DRIVE_MAX = 4;

/** Stock march glow ≈ vec3(9,2,1) */
export const INSOMNIUM_WALL = "#ff391c";
export const INSOMNIUM_WALL_PEAK = "#ffc878";
/** Near-surface cool tint ≈ vec3(1,2,6) */
export const INSOMNIUM_LIGHT = "#2a55ff";
export const INSOMNIUM_LIGHT_PEAK = "#9bfff0";

/** Shadertoy channel0 — Organic 4 (stassets) */
export const INSOMNIUM_TEX = "/stassets/img/Organic%204.jpg";

export const INSOMNIUM_DEFAULTS: InsomniumLive = {
  flightSpeed: 1,
  cameraMode: "flex",
  yaw: 0,
  pitch: 0,
  cameraBank: 0.5,
  wallColor: INSOMNIUM_WALL,
  wallColorPeak: INSOMNIUM_WALL_PEAK,
  wallTwinkle: false,
  wallTwinkleSpeed: TWINKLE_DEFAULT_SPEED,
  wallTwinkleS: TWINKLE_DEFAULT_S,
  wallTwinkleL: 70,
  lightColor: INSOMNIUM_LIGHT,
  lightColorPeak: INSOMNIUM_LIGHT_PEAK,
  lightTwinkle: false,
  lightTwinkleSpeed: TWINKLE_DEFAULT_SPEED,
  lightTwinkleS: TWINKLE_DEFAULT_S,
  lightTwinkleL: TWINKLE_DEFAULT_L,
  saturation: 1,
  wallChannel: "mid",
  wallDrive: 1.2,
  lightChannel: "high",
  lightDrive: 1.3,
  speedChannel: "beat",
  speedDrive: 1.2,
  accelChannel: "bass",
  accelDrive: 1.3,
  camAccelChannel: "off",
  camAccelDrive: 1.4,
};

export const INSOMNIUM_RANGES = {
  flightSpeed: { min: 0.05, max: 4, step: 0.05 },
  yaw: { min: -180, max: 180, step: 1 },
  pitch: { min: -180, max: 180, step: 1 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  wallDrive: { min: 0, max: INSOMNIUM_COLOR_DRIVE_MAX, step: 0.1 },
  lightDrive: { min: 0, max: INSOMNIUM_COLOR_DRIVE_MAX, step: 0.1 },
  speedDrive: { min: 0, max: INSOMNIUM_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: INSOMNIUM_DRIVE_MAX, step: 0.1 },
  camAccelDrive: { min: 0, max: INSOMNIUM_DRIVE_MAX, step: 0.1 },
} as const;
