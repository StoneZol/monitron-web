"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toggleFullscreen } from "@/lib/fullscreen";
import { resetFxOverlay } from "@/components/FxOverlay";
import type { MediaSelection } from "@/components/ControlPanel";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import { registerScreenLivePrefs } from "@/lib/screenLivePrefs";
import { onTabSyncApply } from "@/lib/tabSyncHotApply";
import {
  getMediaLibraryEntry,
  getSessionMediaEntry,
  invalidateUserMediaCache,
} from "@/lib/userMedia";
import {
  DEFAULT_FLAG_ID,
  isOldGuardFlagId,
  type OldGuardFlagId,
} from "./Oldguard.flags";
import {
  OLDGUARD_DEFAULTS,
  OLDGUARD_RANGES,
  type OldguardFlagSource,
  type OldguardLive,
} from "./Oldguard.types";

const SCREEN_ID = "old_guard";

type Stored = OldguardLive;

const STORED_DEFAULTS: Stored = { ...OLDGUARD_DEFAULTS };

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function asFlagId(v: unknown): OldGuardFlagId {
  return isOldGuardFlagId(v) ? v : DEFAULT_FLAG_ID;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const flagSource = (["stock", "library", "session"] as const).includes(
    raw.flagSource as OldguardFlagSource,
  )
    ? (raw.flagSource as OldguardFlagSource)
    : STORED_DEFAULTS.flagSource;

  return {
    waveSpeed: clamp(
      Number(raw.waveSpeed),
      OLDGUARD_RANGES.waveSpeed.min,
      OLDGUARD_RANGES.waveSpeed.max,
      STORED_DEFAULTS.waveSpeed,
    ),
    waveAmount: clamp(
      Number(raw.waveAmount),
      OLDGUARD_RANGES.waveAmount.min,
      OLDGUARD_RANGES.waveAmount.max,
      STORED_DEFAULTS.waveAmount,
    ),
    saturation: clamp(
      Number(raw.saturation),
      OLDGUARD_RANGES.saturation.min,
      OLDGUARD_RANGES.saturation.max,
      STORED_DEFAULTS.saturation,
    ),
    flagSource,
    stockId: asFlagId(raw.stockId),
    libraryId: typeof raw.libraryId === "string" ? raw.libraryId : null,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : null,
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
const liveRef: { current: OldguardLive } = {
  current: OLDGUARD_DEFAULTS,
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

function rehydrateFromStorage() {
  invalidateUserMediaCache();
  cached = null;
  readPrefs();
  emit();
}

function applyMediaSelection(sel: MediaSelection): void {
  const cur = readPrefs();
  if (sel.kind === "stock") {
    writePrefs({
      ...cur,
      flagSource: "stock",
      stockId: asFlagId(sel.id),
      sessionId: null,
    });
    return;
  }
  if (sel.kind === "session") {
    if (!getSessionMediaEntry(sel.id)) {
      writePrefs({
        ...cur,
        flagSource: "stock",
        sessionId: null,
      });
      return;
    }
    writePrefs({
      ...cur,
      flagSource: "session",
      sessionId: sel.id,
    });
    return;
  }
  if (sel.kind === "library") {
    if (!getMediaLibraryEntry(sel.id)) {
      writePrefs({
        ...cur,
        flagSource: "stock",
        sessionId: null,
      });
      return;
    }
    writePrefs({
      ...cur,
      flagSource: "library",
      libraryId: sel.id,
      sessionId: null,
    });
    return;
  }
  // video not used — fall back to stock
  writePrefs({
    ...cur,
    flagSource: "stock",
    sessionId: null,
  });
}

export default function useOldguardHook() {
  const live = useSyncExternalStore(
    subscribe,
    readPrefs,
    () => STORED_DEFAULTS,
  );

  useEffect(() => onTabSyncApply(SCREEN_ID, rehydrateFromStorage), []);

  useEffect(
    () => registerScreenLivePrefs(SCREEN_ID, () => ({ ...readPrefs() })),
    [],
  );

  const commit = (patch: Partial<Stored>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  const mediaValue: MediaSelection =
    live.flagSource === "library" && live.libraryId
      ? { kind: "library", id: live.libraryId }
      : live.flagSource === "session" && live.sessionId
        ? { kind: "session", id: live.sessionId }
        : { kind: "stock", id: live.stockId };

  return {
    liveRef,
    controls: {
      waveSpeed: live.waveSpeed,
      waveAmount: live.waveAmount,
      saturation: live.saturation,
      mediaValue,
      setWaveSpeed: (waveSpeed: number) => commit({ waveSpeed }),
      setWaveAmount: (waveAmount: number) => commit({ waveAmount }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setMedia: applyMediaSelection,
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
