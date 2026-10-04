export type SpectrumProps = {
  showOverlay?: boolean;
};

export type SpectrumLive = {
  /** Bass / low-band tint (also twinkle hue seed) */
  colorLow: string;
  /** Treble / high-band tint (also twinkle hue seed) */
  colorHigh: string;
  /** Hue-walk both ends from their seed hues */
  twinkle: boolean;
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  /** Reflect bars from center */
  mirror: boolean;
  /** Peak-cap hold (higher = stickier; 0.85…0.98) */
  peakDecay: number;
  /** Bottom rms / peak rail */
  showRail: boolean;
};

export const SPECTRUM_DEFAULTS: SpectrumLive = {
  colorLow: "#00f0ff",
  colorHigh: "#c6ff4a",
  twinkle: false,
  twinkleSpeed: 1,
  twinkleS: 100,
  twinkleL: 50,
  mirror: false,
  peakDecay: 0.92,
  showRail: true,
};

export const SPECTRUM_RANGES = {
  peakDecay: { min: 0.8, max: 0.98, step: 0.01 },
} as const;
