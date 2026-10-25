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
  snapHourQuarter,
  type Clouds2dLive,
} from "./Clouds2d.types";

const SCREEN_ID = "clouds_2d";

type Stored = Clouds2dLive;

const STORED_DEFAULTS: Stored = { ...CLOUDS2D_DEFAULTS };

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const syncDeviceTime =
    typeof raw.syncDeviceTime === "boolean"
      ? raw.syncDeviceTime
      : STORED_DEFAULTS.syncDeviceTime;

  let hour = STORED_DEFAULTS.hour;
  if (Number.isFinite(Number(raw.hour))) {
    hour = Number(raw.hour);
  } else if (Number.isFinite(Number(raw.dayPhase))) {
    hour = Number(raw.dayPhase) * 24;
  }
  // Manual mode snaps to 15 min; device-sync keeps fractional civil time
  hour = syncDeviceTime
    ? clamp(hour, 0, 23.999, STORED_DEFAULTS.hour)
    : snapHourQuarter(hour);

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
    hour,
    syncDeviceTime,
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
      hour: live.hour,
      syncDeviceTime: live.syncDeviceTime,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCover: (cover: number) => commit({ cover }),
      setHour: (hour: number) =>
        commit({ hour: snapHourQuarter(hour), syncDeviceTime: false }),
      setSyncDeviceTime: (syncDeviceTime: boolean) => {
        if (syncDeviceTime) {
          commit({ syncDeviceTime: true, hour: deviceHourFloat() });
        } else {
          commit({
            syncDeviceTime: false,
            hour: snapHourQuarter(deviceHourFloat()),
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
