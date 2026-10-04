import {
  applyCanvasFilter,
  clearCanvasFilters,
} from "./canvasFilter";
import type { FxModeMod, FxModePaintContext } from "./types";

/** Soft blur on scene canvases — intensity 0…1 → 0…12px. */
const BLUR_MAX_PX = 12;

function applyBlur({ root, intensity }: FxModePaintContext) {
  const t = Math.min(1, Math.max(0, intensity));
  const px = t * BLUR_MAX_PX;
  applyCanvasFilter(root, px > 0.05 ? `blur(${px.toFixed(2)}px)` : "");
}

export const blurMod: FxModeMod = {
  id: "blur",
  label: "Blur",
  knobs: ["intensity"],
  defaults: {
    intensity: 0.25,
    contrast: 1,
    speed: 1,
    particles: 1,
    blend: "normal",
  },
  apply: applyBlur,
  clear: clearCanvasFilters,
};
