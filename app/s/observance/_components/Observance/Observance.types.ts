import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type ObservanceProps = {
  showOverlay?: boolean;
};

/** Base lamp tint: off / follow sun / solid custom / own HSL twinkle */
export type CrossBaseLightMode = "off" | "sun" | "custom" | "twinkle";

export type ObservanceLive = {
  /** Camera advance along the path (1 ≈ Shadertoy default) */
  flightSpeed: number;
  /** Lift crosses off the lower hills into the air */
  crossesAir: boolean;
  /** Slide crossbar down the stem (inverted cross, no rotate) */
  crossesFlip: boolean;
  /** Glow on ground in front of each cross */
  crossBaseLightMode: CrossBaseLightMode;
  /** Idle / peak tint when mode is custom (Color channel lerps idle→peak) */
  crossBaseColor: string;
  crossBaseColorPeak: string;
  crossBaseTwinkleSpeed: number;
  crossBaseTwinkleS: number;
  crossBaseTwinkleL: number;
  /** Scale stock path sway (1 = Shadertoy) */
  crossSway: number;
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
  /** Cross sway animation rate — smooth, not flight speed */
  camAccelChannel: ReactiveChannel;
  camAccelDrive: number;
};

/** Smooth rate drive (Speed / Accel / Cam accel) */
export const OBSERVANCE_DRIVE_MAX = 4;
/** Color / twinkle punch — short 0…2 boost */
export const OBSERVANCE_COLOR_DRIVE_MAX = 2;

export const OBSERVANCE_DEFAULTS: ObservanceLive = {
  flightSpeed: 1,
  crossesAir: false,
  crossesFlip: false,
  crossBaseLightMode: "off",
  crossBaseColor: "#ffcc88",
  crossBaseColorPeak: "#ff8844",
  crossBaseTwinkleSpeed: 1,
  crossBaseTwinkleS: 100,
  crossBaseTwinkleL: 50,
  crossSway: 1,
  sunColor: "#ffcc88",
  sunColorPeak: "#ff8844",
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

export const OBSERVANCE_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  crossSway: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: OBSERVANCE_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: OBSERVANCE_DRIVE_MAX, step: 0.1 },
  accelDrive: { min: 0, max: OBSERVANCE_DRIVE_MAX, step: 0.1 },
  camAccelDrive: { min: 0, max: OBSERVANCE_DRIVE_MAX, step: 0.1 },
} as const;
