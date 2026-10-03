export type HexacoreProps = {
  showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot. */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

export type HexacoreLive = {
  /** Camera advance along the tunnel (1 ≈ Shadertoy default) */
  flightSpeed: number;
  /** Crystal / energy tint — idle */
  color: string;
  /** Tint at audio peak (used when garland is off) */
  colorPeak: string;
  /** Realtime iridescent emit on hex circuitry */
  garland: boolean;
  /** Iridescence / twinkle rate (1 ≈ default) */
  garlandSpeed: number;
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
};

export const HEXACORE_DRIVE_MAX = 8;

export const HEXACORE_DEFAULTS: HexacoreLive = {
  flightSpeed: 1,
  color: "#c8a0ff",
  colorPeak: "#00eeff",
  garland: true,
  garlandSpeed: 1,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "bass",
  speedDrive: 1.2,
};

export const HEXACORE_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  garlandSpeed: { min: 0, max: 4, step: 0.05 },
  drive: { min: 0, max: HEXACORE_DRIVE_MAX, step: 0.1 },
} as const;
