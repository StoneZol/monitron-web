import { findMoveRoot } from "@/lib/visualPip";

/** Scene canvas under a root (skips fx pass canvases). */
export function findSceneCanvas(root: HTMLElement): HTMLCanvasElement | null {
  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;
  for (const c of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    if (c.dataset.fxPass != null) continue;
    const area =
      (c.clientWidth || c.offsetWidth || c.width) *
      (c.clientHeight || c.offsetHeight || c.height);
    if (area > bestArea) {
      best = c;
      bestArea = area;
    }
  }
  return best;
}

/**
 * Host where transparent fx canvases must live: the R3F shell that Document PiP
 * moves. Falls back to any live scene canvas (e.g. already in the PiP window).
 */
export function findFxHost(screenRoot: HTMLElement): HTMLElement | null {
  const local = findSceneCanvas(screenRoot);
  if (local) return findMoveRoot(local);

  // Canvas may already sit in the PiP document
  for (const c of document.querySelectorAll<HTMLCanvasElement>("canvas")) {
    if (c.dataset.fxPass != null) continue;
    const area =
      (c.clientWidth || c.offsetWidth || c.width) *
      (c.clientHeight || c.offsetHeight || c.height);
    if (area > 4) return findMoveRoot(c);
  }
  return null;
}
