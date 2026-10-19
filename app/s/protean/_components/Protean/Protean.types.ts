import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type ProteanProps = {
  showOverlay?: boolean;
};

/** flex = stock path look; manual = fixed X/Y (mouse-style) */
export type ProteanCameraMode = "flex" | "manual";

/**
 * Color like Coral (trimmed):
 * - original — nimitz stock, no picker
 * - paletteTwinkle — stock palette phase walk, no picker
 * - solid — one solid tint
 * - twinkle — solid HSL hue walk
 */
export type ProteanColorMode =
  | "original"
  | "paletteTwinkle"
  | "solid"
  | "twinkle";

export type ProteanLive = {
  flightSpeed: number;
  cameraMode: ProteanCameraMode;
  /** Manual look X (deg) — maps to original bsMo.x */
  yaw: number;
  /** Manual look Y (deg) — pitch + light density morph like bsMo.y */
  pitch: number;
  /** Volume morph bias (−1…1) on top of stock prm1 pulse */
  morph: number;
  colorMode: ProteanColorMode;
  /** Solid tint (solid mode) */
  color: string;
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  saturation: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
  accelChannel: ReactiveChannel;
  accelDrive: number;
};

export const PROTEAN_DRIVE_MAX = 8;
export const PROTEAN_COLOR_DRIVE_MAX = 2;

export const PROTEAN_DEFAULTS: ProteanLive = {
  flightSpeed: 1,
  cameraMode: "flex",
  yaw: 0,
  pitch: 0,
  morph: 0,
  colorMode: "original",
  color: "#7ec8c8",
  twinkleSpeed: 1,
  twinkleS: 70,
  twinkleL: 55,
  saturation: 1,
  colorChannel: "bass",
  colorDrive: 1,
  speedChannel: "mid",
  speedDrive: 1.5,
  accelChannel: "beat",
  accelDrive: 1.2,
};

export const PROTEAN_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  yaw: { min: -45, max: 45, step: 0.5 },
  pitch: { min: -45, max: 45, step: 0.5 },
  morph: { min: -1, max: 1, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: PROTEAN_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: PROTEAN_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: PROTEAN_DRIVE_MAX, step: 0.1 },
} as const;
