import type { ReactiveChannel } from "@/lib/visualAudio";

export type { ReactiveChannel };

export type BlackholeProps = {
  showOverlay?: boolean;
};

/**
 * Live knobs.
 * Pitch in degrees; yaw/disk spin are unitless speed coeffs (like Shadertoy).
 */
export type BlackholeLive = {
  /** Horizon / disk tint — idle */
  holeColor: string;
  /** Horizon / disk tint — audio peak target */
  holeColorPeak: string;
  /** HSL twinkle on hole (title "hole twinkle") */
  holeTwinkle: boolean;
  holeTwinkleSpeed: number;
  holeTwinkleS: number;
  holeTwinkleL: number;
  /** Seamless background nebula wash */
  nebulaEnabled: boolean;
  /** HSL twinkle on nebula (title "nebula twinkle") */
  nebulaTwinkle: boolean;
  nebulaTwinkleSpeed: number;
  nebulaTwinkleS: number;
  nebulaTwinkleL: number;
  /** Nebula tint — idle */
  nebulaColor: string;
  /** Nebula tint — audio peak target */
  nebulaColorPeak: string;
  /** Base nebula strength (1 ≈ current subtle wash) */
  nebulaIntensity: number;
  /** Advances disk swirl / star drift */
  flightSpeed: number;
  exposure: number;
  /** Outer march steps (×6 inner) — Shadertoy default ~20 */
  nbDisks: number;
  /** Accretion disk / horizon swirl (_Speed) */
  diskRotationSpeed: number;
  diskTextureLayers: number;
  /** Horizon / disk radius (_Size in shader) */
  blackHoleSize: number;
  /** Pulse / shake scale to the hole channel */
  scalePunch: boolean;
  /** How hard scale punches when scalePunch is on */
  scaleDrive: number;
  /** Camera yaw orbit rate — `angle.x += t * yawSpeed` (Shadertoy used 0.1) */
  yawSpeed: number;
  /** Camera pitch in degrees → angle.y */
  pitch: number;
  /** Central belt angle — rolls only the hole/disk, space stays */
  beltAngle: number;
  holeChannel: ReactiveChannel;
  holeDrive: number;
  yawChannel: ReactiveChannel;
  yawDrive: number;
  nebulaChannel: ReactiveChannel;
  nebulaDrive: number;
};

export const BLACKHOLE_DEFAULTS: BlackholeLive = {
  holeColor: "#ffcc00",
  holeColorPeak: "#ff6600",
  holeTwinkle: false,
  holeTwinkleSpeed: 1,
  holeTwinkleS: 100,
  holeTwinkleL: 50,
  nebulaEnabled: true,
  nebulaTwinkle: false,
  nebulaTwinkleSpeed: 1,
  nebulaTwinkleS: 100,
  nebulaTwinkleL: 50,
  nebulaColor: "#4a2a6e",
  nebulaColorPeak: "#7a48a8",
  nebulaIntensity: 1,
  flightSpeed: 1,
  exposure: 1,
  nbDisks: 20,
  diskRotationSpeed: 0.2,
  diskTextureLayers: 12,
  blackHoleSize: 0.2,
  scalePunch: false,
  /** UI 1…2 — internal punch uses ×0.01 (so 1 ≡ old 0.01) */
  scaleDrive: 1,
  yawSpeed: 0.1,
  /** Avoid 0°/180° — edge-on disk plane glitches */
  pitch: 5,
  /** 0° = horizontal belt */
  beltAngle: 10,
  holeChannel: "bass",
  holeDrive: 1.2,
  yawChannel: "beat",
  yawDrive: 1.4,
  nebulaChannel: "bass",
  nebulaDrive: 1.2,
};

export const BLACKHOLE_DRIVE_MAX = 8;
/** Hole / nebula color punch — short 0…2 boost */
export const BLACKHOLE_COLOR_DRIVE_MAX = 2;
/** scaleDrive UI → drivenLevel multiplier */
export const SCALE_DRIVE_UNIT = 0.01;

/** Temporary wide ranges — replace once dialed in. */
export const BLACKHOLE_RANGES = {
  yawSpeed: { min: 0.01, max: 1, step: 0.01 },
  pitch: { min: 1, max: 179, step: 1 },
  beltAngle: { min: -180, max: 180, step: 1 },
  blackHoleSize: { min: 0.05, max: 2, step: 0.01 },
  diskRotationSpeed: { min: 0.05, max: 5, step: 0.05 },
  nebulaIntensity: { min: 0, max: 3, step: 0.05 },
  colorDrive: { min: 0, max: BLACKHOLE_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: BLACKHOLE_DRIVE_MAX, step: 0.1 },
  scaleDrive: { min: 1, max: 16, step: 1 },
} as const;
