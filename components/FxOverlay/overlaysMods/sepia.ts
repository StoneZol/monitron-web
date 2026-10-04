import {
  applyCanvasFilter,
  clearCanvasFilters,
} from "./canvasFilter";
import type { FxModeMod, FxModePaintContext } from "./types";

/** Phone-editor style sepia + contrast on scene canvases. */
function applySepia({ root, intensity, contrast }: FxModePaintContext) {
  const s = Math.min(1, Math.max(0, intensity));
  const c = Math.min(2, Math.max(0.5, contrast));
  const parts: string[] = [];
  if (s > 0.001) parts.push(`sepia(${s})`);
  if (Math.abs(c - 1) > 0.001) parts.push(`contrast(${c})`);
  applyCanvasFilter(root, parts.join(" "));
}

export const sepiaMod: FxModeMod = {
  id: "sepia",
  label: "Sepia",
  knobs: ["intensity", "contrast"],
  defaults: {
    intensity: 1,
    contrast: 1,
    speed: 1,
    particles: 1,
    blend: "normal",
  },
  apply: applySepia,
  clear: clearCanvasFilters,
};
