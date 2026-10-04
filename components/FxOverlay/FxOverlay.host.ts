import {
  findMoveRoot,
  getVisualPipMoveRoot,
  getVisualPipWindow,
} from "@/lib/visualPip";

/** Largest scene canvas under a root (skips fx pass canvases). */
export function findSceneCanvasIn(
  root: ParentNode,
): HTMLCanvasElement | null {
  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;
  let fallback: HTMLCanvasElement | null = null;
  for (const c of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    if (c.dataset.fxPass != null) continue;
    if (!fallback) fallback = c;
    const area =
      (c.clientWidth || c.offsetWidth || c.width) *
      (c.clientHeight || c.offsetHeight || c.height);
    if (area > bestArea) {
      best = c;
      bestArea = area;
    }
  }
  // After Document PiP adopt, layout can briefly report 0×0 — still use the canvas.
  return best ?? fallback;
}

/**
 * Host where transparent fx canvases must live: the R3F shell Document PiP moves.
 * Prefer the known moved root, then PiP document, then opener screen root.
 */
export function findFxHost(screenRoot: HTMLElement): HTMLElement | null {
  const moved = getVisualPipMoveRoot();
  if (moved) return moved;

  const pip = getVisualPipWindow();
  if (pip && !pip.closed) {
    const inPip = findSceneCanvasIn(pip.document);
    if (inPip) return findMoveRoot(inPip);
  }

  const local = findSceneCanvasIn(screenRoot);
  if (local) return findMoveRoot(local);

  const fallback = findSceneCanvasIn(document);
  return fallback ? findMoveRoot(fallback) : null;
}
