import {
  applyCanvasFilter,
  clearCanvasFilters,
} from "./canvasFilter";
import type { FxModeMod, FxModePaintContext } from "./types";

/** Phone-editor style invert + contrast on scene canvases. */
function applyNegative({ root, intensity, contrast }: FxModePaintContext) {
  const inv = Math.min(1, Math.max(0, intensity));
  const c = Math.min(2, Math.max(0.5, contrast));
  const parts: string[] = [];
  if (inv > 0.001) parts.push(`invert(${inv})`);
  if (Math.abs(c - 1) > 0.001) parts.push(`contrast(${c})`);
  applyCanvasFilter(root, parts.join(" "));
}

export const negativeMod: FxModeMod = {
  id: "negative",
  label: "Negative",
  knobs: ["intensity", "contrast"],
  defaults: {
    intensity: 1,
    contrast: 1,
    speed: 1,
    particles: 1,
    blend: "normal",
  },
  apply: applyNegative,
  clear: clearCanvasFilters,
};
