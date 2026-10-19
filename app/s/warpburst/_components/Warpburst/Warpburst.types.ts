import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type WarpburstProps = {
  showOverlay?: boolean;
};

/** flex = stock animated bank; manual = fixed look X/Y */
export type WarpburstCameraMode = "flex" | "manual";

export type WarpburstLive = {
  /** Tunnel flight (1 ≈ Shadertoy BASE_SPEED feel) */
  flightSpeed: number;
  cameraMode: WarpburstCameraMode;
  /** Camera roll/pitch/yaw/sway amount — flex only (0 = straight, 1 = default, 2 = 2×) */
  cameraBank: number;
  /** Fixed look X in degrees — manual */
  yaw: number;
  /** Fixed look Y in degrees — manual */
  pitch: number;
  /** Base goo tint — idle */
  color: string;
  /** Neon highlight / peak tint */
  colorPeak: string;
  /** HSL hue cycle 0…360 (title "twinkle" prefs) */
  twinkle: boolean;
  twinkleSpeed: number;
  /** Saturation % for hsl(H S% L%) */
  twinkleS: number;
  /** Lightness % for hsl(H S% L%) */
  twinkleL: number;
  /** Look chroma (0 = gray, 1 = default) */
  saturation: number;
  /** Fog octave / wisp amount (0 = smooth, 1 = default, 4 = max) */
  fogDetail: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  /** Smooth cruise — lifts base flight continuously */
  speedChannel: ReactiveChannel;
  speedDrive: number;
  /** Transient kick — rising-edge accel punches */
  accelChannel: ReactiveChannel;
  accelDrive: number;
};

/** Cruise / kick drive */
export const WARPBURST_DRIVE_MAX = 8;
/** Color / twinkle punch — short 0…2 boost, no need to haul to ×8 */
export const WARPBURST_COLOR_DRIVE_MAX = 2;

/** Defaults from sealed share preset. */
export const WARPBURST_DEFAULTS: WarpburstLive = {
  flightSpeed: 1,
  cameraMode: "flex",
  cameraBank: 0.5,
  yaw: 0,
  pitch: 0,
  color: "#c200ff",
  colorPeak: "#8200ff",
  twinkle: false,
  twinkleSpeed: 1,
  twinkleS: 100,
  twinkleL: 50,
  saturation: 1,
  fogDetail: 4,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "mid",
  speedDrive: 2,
  accelChannel: "bass",
  accelDrive: 1.2,
};

export const WARPBURST_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  yaw: { min: -45, max: 45, step: 0.5 },
  pitch: { min: -45, max: 45, step: 0.5 },
  saturation: { min: 0, max: 2, step: 0.05 },
  fogDetail: { min: 0, max: 4, step: 0.1 },
  colorDrive: { min: 0, max: WARPBURST_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: WARPBURST_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: WARPBURST_DRIVE_MAX, step: 0.1 },
} as const;
