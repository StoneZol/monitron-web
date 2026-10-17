import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type DarkterrainProps = {
  showOverlay?: boolean;
};

export type DarkterrainLive = {
  /** Camera advance along the path (1 ≈ Shadertoy default) */
  flightSpeed: number;
  /** Coral-style flex look cone */
  cameraBank: number;
  /** Soft chromatic sun tint for lightning stripes */
  sunColor: string;
  sunColorPeak: string;
  sunTwinkle: boolean;
  sunTwinkleSpeed: number;
  sunTwinkleS: number;
  sunTwinkleL: number;
  /** Draw colored stripe / flash bands (tinted by sun) */
  lightning: boolean;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
  accelChannel: ReactiveChannel;
  accelDrive: number;
  /** Camera bank animation rate */
  camAccelChannel: ReactiveChannel;
  camAccelDrive: number;
};

export const DARKTERRAIN_DRIVE_MAX = 4;
export const DARKTERRAIN_COLOR_DRIVE_MAX = 2;

export const DARKTERRAIN_DEFAULTS: DarkterrainLive = {
  flightSpeed: 1,
  cameraBank: 0.5,
  sunColor: "#f2f2f2",
  sunColorPeak: "#ffffff",
  sunTwinkle: false,
  sunTwinkleSpeed: 1,
  sunTwinkleS: 100,
  sunTwinkleL: 50,
  lightning: true,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "mid",
  speedDrive: 1.2,
  accelChannel: "bass",
  accelDrive: 1.2,
  camAccelChannel: "bass",
  camAccelDrive: 1.2,
};

export const DARKTERRAIN_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: DARKTERRAIN_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: DARKTERRAIN_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: DARKTERRAIN_DRIVE_MAX, step: 0.1 },
  camAccelDrive: { min: 0, max: DARKTERRAIN_DRIVE_MAX, step: 0.1 },
} as const;
