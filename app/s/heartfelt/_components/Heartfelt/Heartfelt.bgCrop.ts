/**
 * Which axis object-fit:cover is currently cropping.
 * Updated from the Canvas when screen/texture aspects change.
 */

export type BgCropAxis = "x" | "y" | "none";

const EPS = 0.002;

const listeners = new Set<() => void>();
let axis: BgCropAxis = "none";

function emit() {
  for (const l of listeners) l();
}

export function subscribeBgCropAxis(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBgCropAxis(): BgCropAxis {
  return axis;
}

export function setBgCropFromAspects(
  screenW: number,
  screenH: number,
  texW: number,
  texH: number,
): void {
  const sA = screenW / Math.max(screenH, 1);
  const tA = texW / Math.max(texH, 1);
  let next: BgCropAxis = "none";
  if (Math.abs(sA - tA) > EPS) {
    next = sA > tA ? "y" : "x";
  }
  if (next === axis) return;
  axis = next;
  emit();
}
