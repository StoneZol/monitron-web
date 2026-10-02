export type BlackholeProps = {
  showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot (same vocabulary as synthwave). */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

/** Live knobs read each frame — v1: defaults only, no panel wiring yet. */
export type BlackholeLive = {
  /** Accretion disk warm / inner tint */
  diskInner: string;
  /** Accretion disk cool / outer tint */
  diskOuter: string;
  /** Soft haze around the photon ring */
  hazeColor: string;
  /** Distant starfield tint */
  starTint: string;
  /** Base space-flight speed (star scroll / approach) */
  flightSpeed: number;
  /** Disc rotation rate */
  diskSpeed: number;
  /** Raymarch iterations (Gargantua ~200; lite default still readable) */
  steps: number;
  /** Multiplier on step length vs far/steps baseline */
  stepScale: number;
  /** Schwarzschild radius in ST units */
  ssRadius: number;
  /** Light-bending strength */
  warpAmount: number;
  /** Band → space flight punch */
  spaceChannel: ReactiveChannel;
  spaceDrive: number;
  /** Band → disk glow / warp punch */
  holeChannel: ReactiveChannel;
  holeDrive: number;
};

export const BLACKHOLE_DEFAULTS: BlackholeLive = {
  diskInner: "#ff9a4a",
  diskOuter: "#6a8cff",
  hazeColor: "#ffc28a",
  starTint: "#c8d6ff",
  flightSpeed: 0.35,
  diskSpeed: 0.08,
  // ~10× lighter than Gargantua 200 — 2 was unreadable (horizon ate the frame)
  steps: 24,
  stepScale: 1,
  ssRadius: 0.3,
  warpAmount: 5,
  spaceChannel: "beat",
  spaceDrive: 1.4,
  holeChannel: "bass",
  holeDrive: 1.2,
};
