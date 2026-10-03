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
    /** Realtime iridescent fog crawl */
    garland: boolean;
    /** Iridescence rate (1 ≈ default) */
    garlandSpeed: number;
    /** Look chroma (0 = gray, 1 = default) */
    saturation: number;
  /** Fog octave / wisp amount (0 = smooth, 1 = default, 4 = max) */
  fogDetail: number;
    colorChannel: ReactiveChannel;
    colorDrive: number;
    speedChannel: ReactiveChannel;
    speedDrive: number;
};

export const WARPBURST_DRIVE_MAX = 8;

export const WARPBURST_DEFAULTS: WarpburstLive = {
  flightSpeed: 1,
  cameraBank: 1,
  color: "#4d0099",
  colorPeak: "#00ffb3",
  garland: true,
  garlandSpeed: 1,
  saturation: 1,
  fogDetail: 1,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "bass",
  speedDrive: 1.2,
};

export const WARPBURST_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  cameraBank: { min: 0, max: 2, step: 0.05 },
  garlandSpeed: { min: 0, max: 4, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  fogDetail: { min: 0, max: 4, step: 0.1 },
  drive: { min: 0, max: WARPBURST_DRIVE_MAX, step: 0.1 },
} as const;
