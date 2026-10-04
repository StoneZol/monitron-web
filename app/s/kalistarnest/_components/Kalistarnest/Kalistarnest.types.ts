import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type KalistarnestProps = {
  showOverlay?: boolean;
};

/** manual = yaw/pitch sliders; flex = center look + bank scatter */
export type KalistarnestCameraMode = "manual" | "flex";

/**
 * Color look:
 * - original — aladiN fixedTint stars + yellow dust (1:1 shader)
 * - custom — CPU star/fog palettes or per-layer twinkle
 */
export type KalistarnestColorMode = "original" | "custom";

export type KalistarnestLive = {
  /** Flight clock (1 ≈ Shadertoy FLY_SPEED path) */
  flightSpeed: number;
  cameraMode: KalistarnestCameraMode;
  /** Look yaw in degrees (manual mode) */
  yaw: number;
  /** Look pitch in degrees (manual mode) */
  pitch: number;
  /** Flex scatter amount (0 = locked center, 1 = default, 2 = 2×) */
  cameraBank: number;
  colorMode: KalistarnestColorMode;
  /** Stars — idle / peak (custom + palette) */
  starColor: string;
  starColorPeak: string;
  starTwinkle: boolean;
  starTwinkleSpeed: number;
  starTwinkleS: number;
  starTwinkleL: number;
  /** Fog / dust — idle / peak */
  fogColor: string;
  fogColorPeak: string;
  fogTwinkle: boolean;
  fogTwinkleSpeed: number;
  fogTwinkleS: number;
  fogTwinkleL: number;
  saturation: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
};

export const KALISTARNEST_DRIVE_MAX = 4;
export const KALISTARNEST_COLOR_DRIVE_MAX = 2;

/** Shader look defaults — yaw/pitch from aladiN; tints approximate warm/cool + dust. */
export const KALISTARNEST_DEFAULTS: KalistarnestLive = {
  flightSpeed: 1,
  cameraMode: "manual",
  yaw: 20,
  pitch: 8.6,
  cameraBank: 0.5,
  colorMode: "original",
  starColor: "#ff8a5c",
  starColorPeak: "#9ec8ff",
  starTwinkle: false,
  starTwinkleSpeed: 1,
  starTwinkleS: 100,
  starTwinkleL: 55,
  fogColor: "#665200",
  fogColorPeak: "#b89620",
  fogTwinkle: false,
  fogTwinkleSpeed: 1,
  fogTwinkleS: 90,
  fogTwinkleL: 40,
  saturation: 1,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "bass",
  speedDrive: 1,
};

export const KALISTARNEST_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  yaw: { min: -180, max: 180, step: 0.5 },
  pitch: { min: -80, max: 80, step: 0.5 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: KALISTARNEST_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: KALISTARNEST_DRIVE_MAX, step: 0.1 },
} as const;
