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
  /** Shader / piece author */
  author: string;
  /** Full original title */
  title: string;
};

/** Knobs a mode may read when painting onto the scene root. */
export type FxModePaintContext = {
  root: HTMLElement;
  intensity: number;
  contrast: number;
  speed: number;
  particles: number;
};

/**
 * One overlay algorithm — keep apply/clear / shader here; Layer orchestrates.
 *
 * - css: mutates scene canvas style filters (B&W)
 * - shader: fullscreen WebGL pass sampling the scene canvas (Cartoony, …)
 */
export type FxModeMod = {
  id: string;
  label: string;
  kind: "css" | "shader";
  /** Which sliders to show when this mode is active */
  knobs: FxModeKnob[];
  /** Defaults when this mode is the active look */
  defaults: {
    intensity: number;
    contrast: number;
    speed: number;
    particles: number;
    blend: FxBlendMode;
  };
  /** Optional original — credit link under Overlay select when this mode is on */
  source?: FxModeSource;
  /** css mods */
  apply?: (ctx: FxModePaintContext) => void;
  clear?: (root: HTMLElement) => void;
  /**
   * shader mods — GLSL ES fragment body.
   * Uniforms: iChannel0, iResolution, iTime, uIntensity, uSpeed, uParticles.
   * Varying: vUv (0…1).
   */
  fragmentShader?: string;
};
