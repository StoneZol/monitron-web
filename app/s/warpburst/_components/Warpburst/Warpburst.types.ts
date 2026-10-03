export type WarpburstProps = {
  showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot. */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

export type WarpburstLive = {
  /** Tunnel flight (1 ≈ Shadertoy BASE_SPEED feel) */
  flightSpeed: number;
  /** Camera roll/pitch/yaw/sway amount (0 = straight, 1 = default, 2 = 2×) */
  cameraBank: number;
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
  speedChannel: ReactiveChannel;
  speedDrive: number;
};

/** Speed punch drive */
export const WARPBURST_DRIVE_MAX = 8;
/** Color / twinkle punch — short 0…2 boost, no need to haul to ×8 */
export const WARPBURST_COLOR_DRIVE_MAX = 2;

/** Defaults from sealed share preset. */
export const WARPBURST_DEFAULTS: WarpburstLive = {
  flightSpeed: 1,
  cameraBank: 0.5,
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
  speedChannel: "bass",
  speedDrive: 2,
};

export const WARPBURST_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  fogDetail: { min: 0, max: 4, step: 0.1 },
  colorDrive: { min: 0, max: WARPBURST_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: WARPBURST_DRIVE_MAX, step: 0.1 },
} as const;
