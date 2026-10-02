export type BlackholeProps = {
  showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot (same vocabulary as synthwave). */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

/**
 * Live knobs.
 * Camera yaw/pitch + BH scale — ranges are temporary wide; tune after dial-in.
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
  diskRotationSpeed: number;
  diskTextureLayers: number;
  /** Horizon / disk radius (_Size in shader) */
  blackHoleSize: number;
  /** Camera yaw in degrees → angle.x */
  yaw: number;
  /** Shadertoy mouseY (0..1) → pitch */
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
  diskRotationSpeed: 3,
  diskTextureLayers: 12,
  blackHoleSize: 0.3,
  yaw: 0,
  pitch: 0.36,
  spaceChannel: "beat",
  spaceDrive: 1.4,
  holeChannel: "bass",
  holeDrive: 1.2,
};

/** Temporary wide ranges — replace once dialed in. */
export const BLACKHOLE_RANGES = {
  yaw: { min: -180, max: 180, step: 1 },
  pitch: { min: 0, max: 1, step: 0.01 },
  blackHoleSize: { min: 0.05, max: 2, step: 0.01 },
} as const;
