"use client";

import { useSyncExternalStore } from "react";
import {
  readScreenPrefsRaw,
  saveScreenPrefs,
} from "@/lib/screenPrefs";

/** Per-screen chrome key inside `monitron:<screenId>:controls`. */
export const RENDER_SCALE_PREF_KEY = "_renderScale" as const;

export const RENDER_SCALE_DEFAULT = 0.5;
export const RENDER_SCALE_MIN = 0.3;
export const RENDER_SCALE_MAX = 1;
export const RENDER_SCALE_STEP = 0.05;

const cache = new Map<string, number>();
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

export function getRenderScale(screenId: string): number {
  const hit = cache.get(screenId);
  if (hit != null) return hit;

  const raw = readScreenPrefsRaw(screenId)[RENDER_SCALE_PREF_KEY];
  const v =
    raw != null && Number.isFinite(Number(raw))
      ? clampScale(Number(raw))
      : RENDER_SCALE_DEFAULT;
  cache.set(screenId, v);
  return v;
}

export function setRenderScale(screenId: string, scale: number) {
  const v = clampScale(scale);
  cache.set(screenId, v);
  saveScreenPrefs(screenId, {
    ...readScreenPrefsRaw(screenId),
    [RENDER_SCALE_PREF_KEY]: v,
  });
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

export function useRenderScale(screenId: string | null | undefined) {
  const id = screenId ?? "";
  const scale = useSyncExternalStore(
    subscribe,
    () => (id ? getRenderScale(id) : RENDER_SCALE_DEFAULT),
    () => RENDER_SCALE_DEFAULT,
  );
  return {
    scale,
    setScale: (next: number) => {
      if (!id) return;
      setRenderScale(id, next);
    },
    min: RENDER_SCALE_MIN,
    max: RENDER_SCALE_MAX,
    step: RENDER_SCALE_STEP,
  };
}

/** R3F Canvas: `dpr={useRenderDpr("coralreef", 1, 1.25)}` */
export function useRenderDpr(
  screenId: string,
  min = 1,
  max = 1.25,
): [number, number] {
  const { scale } = useRenderScale(screenId);
  return scaledDpr(min, max, scale);
}

/**
 * 2D canvas buffer multiplier (devicePixelRatio × this screen's scale, capped).
 */
export function scaledPixelRatio(cap: number, screenId: string): number {
  const viewDpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.max(
    RENDER_SCALE_MIN,
    Math.min(cap, viewDpr) * getRenderScale(screenId),
  );
}
