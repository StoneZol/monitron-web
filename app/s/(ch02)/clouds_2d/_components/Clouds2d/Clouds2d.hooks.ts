"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toggleFullscreen } from "@/lib/fullscreen";
import { resetFxOverlay } from "@/components/FxOverlay";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import { registerScreenLivePrefs } from "@/lib/screenLivePrefs";
import { onTabSyncApply } from "@/lib/tabSyncHotApply";
import {
  CLOUDS2D_DEFAULTS,
  CLOUDS2D_RANGES,
  deviceHourFloat,
  type Clouds2dLive,
} from "./Clouds2d.types";

const SCREEN_ID = "clouds_2d";

type Stored = Clouds2dLive;

const STORED_DEFAULTS: Stored = { ...CLOUDS2D_DEFAULTS };

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function migrateHour(raw: Stored & Record<string, unknown>): number {
  // Allow fractional hours while device-sync is on (e.g. 14.5).
  const hi = 23.999;
  if (Number.isFinite(Number(raw.hour))) {
    return clamp(Number(raw.hour), 0, hi, STORED_DEFAULTS.hour);
  }
  // legacy dayPhase 0–1 → hours
  if (Number.isFinite(Number(raw.dayPhase))) {
    return clamp(Number(raw.dayPhase) * 24, 0, hi, STORED_DEFAULTS.hour);
  }
  return STORED_DEFAULTS.hour;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  return {
    flightSpeed: clamp(
      Number(raw.flightSpeed),
      CLOUDS2D_RANGES.flightSpeed.min,
      CLOUDS2D_RANGES.flightSpeed.max,
      STORED_DEFAULTS.flightSpeed,
    ),
    cover: clamp(
      Number(raw.cover),
      CLOUDS2D_RANGES.cover.min,
      CLOUDS2D_RANGES.cover.max,
      STORED_DEFAULTS.cover,
    ),
    overcast: clamp(
      Number(raw.overcast),
      CLOUDS2D_RANGES.overcast.min,
      CLOUDS2D_RANGES.overcast.max,
      STORED_DEFAULTS.overcast,
    ),
    hour: migrateHour(raw),
    syncDeviceTime:
      typeof raw.syncDeviceTime === "boolean"
        ? raw.syncDeviceTime
        : STORED_DEFAULTS.syncDeviceTime,
  };
}

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cached: Stored | null = null;
const liveRef: { current: Clouds2dLive } = {
  current: CLOUDS2D_DEFAULTS,
};

function readPrefs(): Stored {
  if (cached) return cached;
  cached = migratePrefs(
    loadScreenPrefs(SCREEN_ID, { ...STORED_DEFAULTS }) as Stored &
      Record<string, unknown>,
  );
  liveRef.current = cached;
  return cached;
}

function writePrefs(next: Stored) {
  cached = next;
  liveRef.current = cached;
  saveScreenPrefs(SCREEN_ID, cached);
  emit();
}

/** Soft hour tick for UI while device-sync is on (canvas uses live clock). */
function patchHourLive(hour: number) {
  const cur = readPrefs();
  if (!cur.syncDeviceTime) return;
  const next = { ...cur, hour };
  cached = next;
  liveRef.current = next;
  emit();
}

function rehydrateFromStorage() {
  cached = null;
  readPrefs();
  emit();
}

export default function useClouds2dHook() {
  const live = useSyncExternalStore(
    subscribe,
    readPrefs,
    () => STORED_DEFAULTS,
  );

  useEffect(() => onTabSyncApply(SCREEN_ID, rehydrateFromStorage), []);

  useEffect(
    () =>
      registerScreenLivePrefs(SCREEN_ID, () => ({
        ...readPrefs(),
      })),
    [],
  );

  // Keep the hour slider label honest while synced
  useEffect(() => {
    if (!live.syncDeviceTime) return;
    const tick = () => patchHourLive(deviceHourFloat());
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [live.syncDeviceTime]);

  const commit = (patch: Partial<Stored>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  return {
    liveRef,
    controls: {
      flightSpeed: live.flightSpeed,
      cover: live.cover,
      overcast: live.overcast,
      hour: live.hour,
      syncDeviceTime: live.syncDeviceTime,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCover: (cover: number) => commit({ cover }),
      setOvercast: (overcast: number) => commit({ overcast }),
      setHour: (hour: number) => commit({ hour, syncDeviceTime: false }),
      setSyncDeviceTime: (syncDeviceTime: boolean) => {
        if (syncDeviceTime) {
          commit({ syncDeviceTime: true, hour: deviceHourFloat() });
        } else {
          commit({
            syncDeviceTime: false,
            hour: Math.round(deviceHourFloat()) % 24,
          });
        }
      },
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
