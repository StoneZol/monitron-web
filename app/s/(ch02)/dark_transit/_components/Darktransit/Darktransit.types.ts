import type { ReactiveChannel } from "@/lib/visualAudio";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type DarktransitProps = {
  showOverlay?: boolean;
};

export type DarktransitLive = {
  /** Flight clock (1 ≈ Shadertoy iTime) — stock camera path */
  flightSpeed: number;
  /** Letterbox cinema bars */
  cinemaBars: boolean;
  /** Wall glow idle (stock ≈ soft white from 1/s) */
  wallColor: string;
  wallColorPeak: string;
  wallTwinkle: boolean;
  wallTwinkleSpeed: number;
  wallTwinkleS: number;
  wallTwinkleL: number;
  /** Orb idle ≈ stock vec3(1,2,5) blue */
  orbColor: string;
  orbColorPeak: string;
  orbTwinkle: boolean;
  orbTwinkleSpeed: number;
  orbTwinkleS: number;
  orbTwinkleL: number;
  saturation: number;
  /** Wall palette punch */
  wallChannel: ReactiveChannel;
  wallDrive: number;
  /** Orb palette punch */
  orbChannel: ReactiveChannel;
  orbDrive: number;
  /** Flight cruise */
  speedChannel: ReactiveChannel;
  speedDrive: number;
  /** Flight kick */
  accelChannel: ReactiveChannel;
  accelDrive: number;
};

export const DARKTRANSIT_DRIVE_MAX = 8;
export const DARKTRANSIT_COLOR_DRIVE_MAX = 4;

/** Soft wall glow (stock 1/s is white) */
export const DARKTRANSIT_WALL = "#d8dde8";
export const DARKTRANSIT_WALL_PEAK = "#ffe0b8";
/** Stock orb ≈ vec3(1,2,5) */
export const DARKTRANSIT_ORB = "#3366ff";
export const DARKTRANSIT_ORB_PEAK = "#c8f0ff";

export const DARKTRANSIT_DEFAULTS: DarktransitLive = {
  flightSpeed: 1,
  cinemaBars: false,
  wallColor: DARKTRANSIT_WALL,
  wallColorPeak: DARKTRANSIT_WALL_PEAK,
  wallTwinkle: false,
  wallTwinkleSpeed: TWINKLE_DEFAULT_SPEED,
  wallTwinkleS: TWINKLE_DEFAULT_S,
  wallTwinkleL: 70,
  orbColor: DARKTRANSIT_ORB,
  orbColorPeak: DARKTRANSIT_ORB_PEAK,
  orbTwinkle: false,
  orbTwinkleSpeed: TWINKLE_DEFAULT_SPEED,
  orbTwinkleS: TWINKLE_DEFAULT_S,
  orbTwinkleL: TWINKLE_DEFAULT_L,
  saturation: 1,
  wallChannel: "off",
  wallDrive: 1.2,
  orbChannel: "high",
  orbDrive: 1.3,
  speedChannel: "beat",
  speedDrive: 0.5,
  accelChannel: "bass",
  accelDrive: 1.3,
};

export const DARKTRANSIT_RANGES = {
  flightSpeed: { min: 0.05, max: 4, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  wallDrive: { min: 0, max: DARKTRANSIT_COLOR_DRIVE_MAX, step: 0.1 },
  orbDrive: { min: 0, max: DARKTRANSIT_COLOR_DRIVE_MAX, step: 0.1 },
  speedDrive: { min: 0, max: DARKTRANSIT_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: DARKTRANSIT_DRIVE_MAX, step: 0.1 },
} as const;
