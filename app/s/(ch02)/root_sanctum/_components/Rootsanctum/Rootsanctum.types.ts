import type { ReactiveChannel } from "@/lib/visualAudio";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type RootsanctumProps = {
  showOverlay?: boolean;
};

/** flex = coral wander on path (default). manual = freelook X/Y ±180°. */
export type RootsanctumCameraMode = "flex" | "manual";

export type RootsanctumLive = {
  flightSpeed: number;
  cameraMode: RootsanctumCameraMode;
  yaw: number;
  pitch: number;
  cameraBank: number;
  /** Wall / structure glow — idle ≈ stock vec3(6,9,1) */
  wallColor: string;
  wallColorPeak: string;
  wallTwinkle: boolean;
  wallTwinkleSpeed: number;
  wallTwinkleS: number;
  wallTwinkleL: number;
  /** Inner light orb / falloff tint */
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

export const ROOTSANCTUM_DRIVE_MAX = 8;
export const ROOTSANCTUM_COLOR_DRIVE_MAX = 4;

/** Stock march glow ≈ vec3(6,9,1) */
export const ROOTSANCTUM_WALL = "#99e619";
export const ROOTSANCTUM_WALL_PEAK = "#ffe6a0";
/** Soft lamp — warm idle, ice punch */
export const ROOTSANCTUM_LIGHT = "#fff2d6";
export const ROOTSANCTUM_LIGHT_PEAK = "#9bfff0";

/** Shadertoy channel0 — Organic 3 (stassets) */
export const ROOTSANCTUM_TEX = "/stassets/img/Organic%203.jpg";

export const ROOTSANCTUM_DEFAULTS: RootsanctumLive = {
  flightSpeed: 1,
  cameraMode: "flex",
  yaw: 0,
  pitch: 0,
  cameraBank: 0.5,
  wallColor: ROOTSANCTUM_WALL,
  wallColorPeak: ROOTSANCTUM_WALL_PEAK,
  wallTwinkle: false,
  wallTwinkleSpeed: TWINKLE_DEFAULT_SPEED,
  wallTwinkleS: TWINKLE_DEFAULT_S,
  wallTwinkleL: 70,
  lightColor: ROOTSANCTUM_LIGHT,
  lightColorPeak: ROOTSANCTUM_LIGHT_PEAK,
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

export const ROOTSANCTUM_RANGES = {
  flightSpeed: { min: 0.05, max: 4, step: 0.05 },
  yaw: { min: -180, max: 180, step: 1 },
  pitch: { min: -180, max: 180, step: 1 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  wallDrive: { min: 0, max: ROOTSANCTUM_COLOR_DRIVE_MAX, step: 0.1 },
  lightDrive: { min: 0, max: ROOTSANCTUM_COLOR_DRIVE_MAX, step: 0.1 },
  speedDrive: { min: 0, max: ROOTSANCTUM_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: ROOTSANCTUM_DRIVE_MAX, step: 0.1 },
  camAccelDrive: { min: 0, max: ROOTSANCTUM_DRIVE_MAX, step: 0.1 },
} as const;
