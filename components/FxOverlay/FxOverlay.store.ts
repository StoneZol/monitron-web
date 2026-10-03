"use client";

import { useSyncExternalStore } from "react";
import {
  readScreenPrefsRaw,
  saveScreenPrefs,
} from "@/lib/screenPrefs";
import { getFxModeMod } from "./overlaysMods";
import {
  FX_OVERLAY_DEFAULTS,
  FX_OVERLAY_KEY,
  FX_WASH_DEFAULT,
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

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
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
    intensity: clamp(Number(o.intensity), 0, 1, FX_OVERLAY_DEFAULTS.intensity),
    contrast: clamp(Number(o.contrast), 0.5, 2, FX_OVERLAY_DEFAULTS.contrast),
    blend,
    wash: clamp(Number(o.wash), 0, 1, FX_OVERLAY_DEFAULTS.wash),
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
    setMode: (mode: FxOverlayMode) => {
      const mod = getFxModeMod(mode);
      if (!mod) {
        commit({ mode });
        return;
      }
      commit({
        mode,
        intensity: mod.defaults.intensity,
        contrast: mod.defaults.contrast,
        blend: mod.defaults.blend,
        wash: FX_WASH_DEFAULT,
      });
    },
    setIntensity: (intensity: number) =>
      commit({ intensity: clamp(intensity, 0, 1, prefs.intensity) }),
    setContrast: (contrast: number) =>
      commit({ contrast: clamp(contrast, 0.5, 2, prefs.contrast) }),
    setBlend: (blend: FxBlendMode) => commit({ blend }),
    setWash: (wash: number) =>
      commit({ wash: clamp(wash, 0, 1, prefs.wash) }),
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
