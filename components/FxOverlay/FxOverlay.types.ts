export type FxOverlayMode = "off" | "bw";

/** CSS mix-blend-mode values we expose in the panel. */
export type FxBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "soft-light"
  | "hard-light"
  | "difference"
  | "saturation"
  | "color"
  | "luminosity";

export type FxOverlayPrefs = {
  mode: FxOverlayMode;
  /** 0…1 — B&W grayscale amount */
  intensity: number;
  /** CSS contrast multiplier (1 = unchanged) */
  contrast: number;
  blend: FxBlendMode;
  /** 0…1 — optional black wash strength when blend ≠ normal */
  wash: number;
};

export const FX_OVERLAY_KEY = "_fx" as const;

export const FX_OVERLAY_DEFAULTS: FxOverlayPrefs = {
  mode: "off",
  intensity: 1,
  contrast: 1,
  blend: "normal",
  wash: 0.25,
};

export const FX_MODE_OPTIONS: { value: FxOverlayMode; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bw", label: "B&W" },
];

export const FX_BLEND_OPTIONS: { value: FxBlendMode; label: string }[] = [
  { value: "normal", label: "normal" },
  { value: "multiply", label: "multiply" },
  { value: "screen", label: "screen" },
  { value: "overlay", label: "overlay" },
  { value: "darken", label: "darken" },
  { value: "lighten", label: "lighten" },
  { value: "soft-light", label: "soft-light" },
  { value: "hard-light", label: "hard-light" },
  { value: "difference", label: "difference" },
  { value: "saturation", label: "saturation" },
  { value: "color", label: "color" },
  { value: "luminosity", label: "luminosity" },
];

export const FX_RANGES = {
  intensity: { min: 0, max: 1, step: 0.01 },
  contrast: { min: 0.5, max: 2, step: 0.05 },
  wash: { min: 0, max: 1, step: 0.01 },
} as const;
