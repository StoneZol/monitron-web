import { bwMod } from "./overlaysMods";
import type { FxBlendMode } from "./overlaysMods/types";

export type { FxBlendMode };
export type FxOverlayMode = "off" | "bw";

export type FxOverlayPrefs = {
  mode: FxOverlayMode;
  /** 0…1 — mode strength (B&W = grayscale amount) */
  intensity: number;
  /** CSS contrast multiplier (1 = unchanged) */
  contrast: number;
  blend: FxBlendMode;
  /** 0…1 — optional black wash when blend ≠ normal */
  wash: number;
};

export const FX_OVERLAY_KEY = "_fx" as const;

/** Shared wash default for blend add-on (any mode). */
export const FX_WASH_DEFAULT = 0.5;

export const FX_OVERLAY_DEFAULTS: FxOverlayPrefs = {
  mode: "off",
  intensity: bwMod.defaults.intensity,
  contrast: bwMod.defaults.contrast,
  blend: bwMod.defaults.blend,
  wash: FX_WASH_DEFAULT,
};

export const FX_MODE_OPTIONS: { value: FxOverlayMode; label: string }[] = [
  { value: "off", label: "off" },
  { value: bwMod.id as FxOverlayMode, label: bwMod.label },
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
