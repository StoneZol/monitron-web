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
  /** Tint at audio peak (used when twinkle is off) */
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
  colorChannel: ReactiveChannel;
  colorDrive: number;
  speedChannel: ReactiveChannel;
  speedDrive: number;
};

/** Speed punch drive */
export const HEXACORE_DRIVE_MAX = 8;
/** Color / twinkle punch — short 0…2 boost */
export const HEXACORE_COLOR_DRIVE_MAX = 2;

export const HEXACORE_DEFAULTS: HexacoreLive = {
  flightSpeed: 1,
  color: "#c8a0ff",
  colorPeak: "#00eeff",
  twinkle: true,
  twinkleSpeed: 1,
  twinkleS: 100,
  twinkleL: 50,
  saturation: 1,
  colorChannel: "bass",
  colorDrive: 1.2,
  speedChannel: "bass",
  speedDrive: 1.2,
};

export const HEXACORE_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
  colorDrive: { min: 0, max: HEXACORE_COLOR_DRIVE_MAX, step: 0.05 },
  speedDrive: { min: 0, max: HEXACORE_DRIVE_MAX, step: 0.1 },
} as const;
