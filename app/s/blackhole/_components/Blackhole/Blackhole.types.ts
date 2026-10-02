export type BlackholeProps = {
  showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot (same vocabulary as synthwave). */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

/**
 * Live knobs.
 * Pitch in degrees; yaw/disk spin are unitless speed coeffs (like Shadertoy).
 */
export type BlackholeLive = {
  diskInner: string;
  diskOuter: string;
  starTint: string;
  /** Advances disk swirl / star drift */
  flightSpeed: number;
  exposure: number;
  /** Outer march steps (×6 inner) — Shadertoy/Brayns default ~20 */
  nbDisks: number;
  /** Accretion disk / horizon swirl (_Speed) */
  diskRotationSpeed: number;
  diskTextureLayers: number;
  /** Horizon / disk radius (_Size in shader) */
  blackHoleSize: number;
  /** Camera yaw orbit rate — `angle.x += t * yawSpeed` (Shadertoy used 0.1) */
  yawSpeed: number;
  /** Camera pitch in degrees → angle.y */
  pitch: number;
  spaceChannel: ReactiveChannel;
  spaceDrive: number;
  holeChannel: ReactiveChannel;
  holeDrive: number;
};

export const BLACKHOLE_DEFAULTS: BlackholeLive = {
  diskInner: "#ffcc00",
  diskOuter: "#802108",
  starTint: "#c8d6ff",
  flightSpeed: 1,
  exposure: 1,
  nbDisks: 20,
  diskRotationSpeed: 0.2,
  diskTextureLayers: 12,
  blackHoleSize: 0.2,
  yawSpeed: 0.1,
  /** Was mouseY 0.49 → angle.y ≈ 2° (mod 360) */
  pitch: 2,
  spaceChannel: "beat",
  spaceDrive: 1.4,
  holeChannel: "bass",
  holeDrive: 1.2,
};

/** Temporary wide ranges — replace once dialed in. */
export const BLACKHOLE_RANGES = {
  yawSpeed: { min: 0, max: 2, step: 0.05 },
  pitch: { min: -180, max: 180, step: 1 },
  blackHoleSize: { min: 0.05, max: 2, step: 0.01 },
  diskRotationSpeed: { min: 0.05, max: 5, step: 0.05 },
} as const;
