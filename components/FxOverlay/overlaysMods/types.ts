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

/** Knobs a mode may expose in the panel (beyond blend wash). */
export type FxModeKnob =
  | "intensity"
  | "contrast"
  | "speed"
  | "particles";

/** Attribution for ported overlays — shown as a credit link in the panel. */
export type FxModeSource = {
  href: string;
  author: string;
  title: string;
};

/** Knobs a mode may read when applying onto the screen root. */
export type FxModePaintContext = {
  /** Screen root (relative h-screen). Mods find the R3F shell / canvases from here. */
  root: HTMLElement;
  intensity: number;
  contrast: number;
  speed: number;
  particles: number;
};

/**
 * One overlay algorithm — same contract for every mode (B&W, Cartoony, …).
 *
 * - Does NOT rewrite the scene. CSS filters mutate canvas style; shader overlays
 *   paint a transparent layer inside the R3F shell (so Document PiP takes them).
 * - Register in overlaysMods/index.ts (+ FxOverlayMode union) to ship a new look.
 */
export type FxModeMod = {
  id: string;
  label: string;
  knobs: FxModeKnob[];
  defaults: {
    intensity: number;
    contrast: number;
    speed: number;
    particles: number;
    blend: FxBlendMode;
  };
  source?: FxModeSource;
  apply: (ctx: FxModePaintContext) => void;
  clear: (root: HTMLElement) => void;
};
