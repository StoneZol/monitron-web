import type { FxModeMod, FxModePaintContext } from "./types";

function clearCanvasFilters(root: HTMLElement) {
  for (const c of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    c.style.filter = "";
  }
}

/** Phone-editor style grayscale + contrast on scene canvases. */
function applyBw({ root, intensity, contrast }: FxModePaintContext) {
  const g = Math.min(1, Math.max(0, intensity));
  const c = Math.min(2, Math.max(0.5, contrast));
  const parts: string[] = [];
  if (g > 0.001) parts.push(`grayscale(${g})`);
  if (Math.abs(c - 1) > 0.001) parts.push(`contrast(${c})`);
  const filter = parts.join(" ");
  for (const el of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    el.style.filter = filter;
  }
}

export const bwMod: FxModeMod = {
  id: "bw",
  label: "B&W",
  defaults: {
    intensity: 1,
    contrast: 1,
    blend: "normal",
  },
  apply: applyBw,
  clear: clearCanvasFilters,
};
