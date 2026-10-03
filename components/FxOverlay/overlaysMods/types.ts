/** CSS mix-blend-mode values shared by mods + panel. */
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

/** Knobs a mode may read when painting onto the scene root. */
export type FxModePaintContext = {
  root: HTMLElement;
  intensity: number;
  contrast: number;
};

/**
 * One overlay algorithm — keep apply/clear here; Layer only orchestrates.
 */
export type FxModeMod = {
  id: string;
  label: string;
  /** Defaults when this mode is the active look */
  defaults: {
    intensity: number;
    contrast: number;
    blend: FxBlendMode;
  };
  apply: (ctx: FxModePaintContext) => void;
  clear: (root: HTMLElement) => void;
};
