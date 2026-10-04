"use client";

import { useSyncExternalStore } from "react";
import { loadLocal, saveLocal } from "@/lib/localStore";

/** Global — shared across screens when we roll this out past Coral. */
export const RENDER_SCALE_KEY = "monitron:renderScale";

export const RENDER_SCALE_DEFAULT = 0.5;
export const RENDER_SCALE_MIN = 0.3;
export const RENDER_SCALE_MAX = 1;
export const RENDER_SCALE_STEP = 0.05;

type Stored = { scale: number };

const DEFAULTS: Stored = { scale: RENDER_SCALE_DEFAULT };

let cached: Stored | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function clampScale(n: number): number {
  if (!Number.isFinite(n)) return RENDER_SCALE_DEFAULT;
  const stepped =
    Math.round(n / RENDER_SCALE_STEP) * RENDER_SCALE_STEP;
  return Math.min(
    RENDER_SCALE_MAX,
    Math.max(RENDER_SCALE_MIN, stepped),
  );
}

function read(): Stored {
  if (cached) return cached;
  const raw = loadLocal(RENDER_SCALE_KEY, DEFAULTS);
  cached = { scale: clampScale(Number(raw.scale)) };
  return cached;
}

function write(scale: number) {
  cached = { scale: clampScale(scale) };
  saveLocal(RENDER_SCALE_KEY, cached);
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("resize"));
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** R3F `dpr={[min, max]}` scaled; floor matches RENDER_SCALE_MIN. */
export function scaledDpr(
  min: number,
  max: number,
  scale: number,
): [number, number] {
  const s = clampScale(scale);
  const floor = RENDER_SCALE_MIN;
  return [
    Math.max(floor, min * s),
    Math.max(floor, max * s),
  ];
}

export function useRenderScale() {
  const stored = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  return {
    scale: stored.scale,
    setScale: write,
    min: RENDER_SCALE_MIN,
    max: RENDER_SCALE_MAX,
    step: RENDER_SCALE_STEP,
  };
}
