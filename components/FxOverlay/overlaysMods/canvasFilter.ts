import { findSceneCanvasIn } from "../FxOverlay.host";
import { getVisualPipWindow } from "@/lib/visualPip";

/** Scene canvases under screen root and/or active Document PiP. */
export function sceneCanvases(root: HTMLElement): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  const seen = new Set<HTMLCanvasElement>();
  const addFrom = (scope: ParentNode | null) => {
    if (!scope) return;
    const c = findSceneCanvasIn(scope);
    if (c && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  };
  addFrom(root);
  addFrom(getVisualPipWindow()?.document ?? null);
  addFrom(document);
  return out;
}

export function clearCanvasFilters(root: HTMLElement) {
  for (const c of sceneCanvases(root)) c.style.filter = "";
}

export function applyCanvasFilter(root: HTMLElement, filter: string) {
  for (const el of sceneCanvases(root)) el.style.filter = filter;
}
