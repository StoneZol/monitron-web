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
  /** 0…1 — overlay opacity / strength */
  intensity: number;
  blend: FxBlendMode;
};

export const FX_OVERLAY_KEY = "_fx" as const;

export const FX_OVERLAY_DEFAULTS: FxOverlayPrefs = {
  mode: "off",
  intensity: 0.35,
  blend: "normal",
};

export const FX_MODE_OPTIONS: { value: FxOverlayMode; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bw", label: "B&W (black wash)" },
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
