"use client";

import { useSyncExternalStore } from "react";
import {
  readScreenPrefsRaw,
  saveScreenPrefs,
} from "@/lib/screenPrefs";
import {
  FX_OVERLAY_DEFAULTS,
  FX_OVERLAY_KEY,
  type FxBlendMode,
  type FxOverlayMode,
  type FxOverlayPrefs,
} from "./FxOverlay.types";

const BLENDS = new Set<FxBlendMode>([
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "soft-light",
  "hard-light",
  "difference",
  "saturation",
  "color",
  "luminosity",
]);

const MODES = new Set<FxOverlayMode>(["off", "bw"]);

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, FxOverlayPrefs>();

function emit(screenId: string) {
  const set = listeners.get(screenId);
  if (!set) return;
  for (const listener of set) listener();
}

function subscribe(screenId: string, listener: () => void) {
  let set = listeners.get(screenId);
  if (!set) {
    set = new Set();
    listeners.set(screenId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(screenId);
  };
}

function clamp01(n: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function migrateFxPrefs(raw: unknown): FxOverlayPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...FX_OVERLAY_DEFAULTS };
  }
  const o = raw as Record<string, unknown>;
  const mode =
    typeof o.mode === "string" && MODES.has(o.mode as FxOverlayMode)
      ? (o.mode as FxOverlayMode)
      : FX_OVERLAY_DEFAULTS.mode;
  const blend =
    typeof o.blend === "string" && BLENDS.has(o.blend as FxBlendMode)
      ? (o.blend as FxBlendMode)
      : FX_OVERLAY_DEFAULTS.blend;
  return {
    mode,
    intensity: clamp01(Number(o.intensity), FX_OVERLAY_DEFAULTS.intensity),
    blend,
  };
}

function readFx(screenId: string): FxOverlayPrefs {
  const cached = cache.get(screenId);
  if (cached) return cached;
  const next = migrateFxPrefs(readScreenPrefsRaw(screenId)[FX_OVERLAY_KEY]);
  cache.set(screenId, next);
  return next;
}

function writeFx(screenId: string, next: FxOverlayPrefs) {
  cache.set(screenId, next);
  saveScreenPrefs(screenId, {
    ...readScreenPrefsRaw(screenId),
    [FX_OVERLAY_KEY]: next,
  });
  emit(screenId);
}

export function useFxOverlay(screenId: string) {
  const prefs = useSyncExternalStore(
    (listener) => subscribe(screenId, listener),
    () => readFx(screenId),
    () => FX_OVERLAY_DEFAULTS,
  );

  const commit = (patch: Partial<FxOverlayPrefs>) => {
    writeFx(screenId, { ...readFx(screenId), ...patch });
  };

  return {
    ...prefs,
    setMode: (mode: FxOverlayMode) => commit({ mode }),
    setIntensity: (intensity: number) =>
      commit({ intensity: clamp01(intensity, prefs.intensity) }),
    setBlend: (blend: FxBlendMode) => commit({ blend }),
  };
}

/** Drop in-memory cache after external prefs apply (share paste / tab sync). */
export function invalidateFxOverlayCache(screenId?: string) {
  if (screenId) {
    cache.delete(screenId);
    emit(screenId);
    return;
  }
  for (const id of cache.keys()) {
    cache.delete(id);
    emit(id);
  }
}
