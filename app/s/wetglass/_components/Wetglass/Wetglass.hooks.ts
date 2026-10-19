"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toggleFullscreen } from "@/lib/fullscreen";
import { resetFxOverlay } from "@/components/FxOverlay";
import {
  readScreenPrefsRaw,
  saveScreenPrefs,
  screenPrefsKey,
} from "@/lib/screenPrefs";
import { onTabSyncApply } from "@/lib/tabSyncHotApply";
import {
  DEFAULT_STOCK_ID,
  isStockPlaceholderId,
  type StockPlaceholderId,
} from "@/lib/stockPlaceholders";
import {
  getMediaLibraryEntry,
  getSessionMediaEntry,
  invalidateUserMediaCache,
  subscribeUserMedia,
} from "@/lib/userMedia";
import type { MediaSelection } from "@/components/ControlPanel";
import { nextSlideshowSelection } from "./Wetglass.slideshow";
import {
  WETGLASS_DEFAULTS,
  WETGLASS_RANGES,
  type WetglassBgSource,
  type WetglassLive,
} from "./Wetglass.types";

const SCREEN_ID = "wetglass";
const LEGACY_SCREEN_ID = "heartfelt";

type Stored = WetglassLive;

const STORED_DEFAULTS: Stored = { ...WETGLASS_DEFAULTS };

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function asStockId(v: unknown): StockPlaceholderId {
  return isStockPlaceholderId(v) ? v : DEFAULT_STOCK_ID;
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  return fallback;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const stockId = asStockId(raw.stockId ?? DEFAULT_STOCK_ID);
  let libraryId =
    typeof raw.libraryId === "string" && raw.libraryId
      ? raw.libraryId
      : null;

  const rawSource = String(raw.bgSource ?? "");

  // Legacy "user" single-slot → stock
  if (rawSource === "user") {
    libraryId = null;
  }

  const sessionId =
    typeof raw.sessionId === "string" && raw.sessionId
      ? raw.sessionId
      : null;

  // Session files are RAM-only — restore only if still in this tab (or after Sync)
  let bgSource: WetglassBgSource = "stock";
  if (
    rawSource === "session" &&
    sessionId &&
    getSessionMediaEntry(sessionId)
  ) {
    bgSource = "session";
  } else if (
    rawSource === "library" &&
    libraryId &&
    getMediaLibraryEntry(libraryId)
  ) {
    bgSource = "library";
  }

  return {
    rainAmount: clamp(
      Number(raw.rainAmount),
      0,
      1,
      STORED_DEFAULTS.rainAmount,
    ),
    dropSpeed: clamp(
      Number(raw.dropSpeed),
      0.05,
      3,
      STORED_DEFAULTS.dropSpeed,
    ),
    glass: clamp(Number(raw.glass), 0, 1, STORED_DEFAULTS.glass),
    lightning: clamp(
      Number(raw.lightning),
      0,
      1,
      STORED_DEFAULTS.lightning,
    ),
    bgAlignX: clamp(
      Number(raw.bgAlignX),
      0,
      1,
      STORED_DEFAULTS.bgAlignX,
    ),
    bgAlignY: clamp(
      Number(raw.bgAlignY),
      0,
      1,
      STORED_DEFAULTS.bgAlignY,
    ),
    slideshow: asBool(raw.slideshow, STORED_DEFAULTS.slideshow),
    slideshowStock: asBool(raw.slideshowStock, STORED_DEFAULTS.slideshowStock),
    slideshowLibrary: asBool(
      raw.slideshowLibrary,
      STORED_DEFAULTS.slideshowLibrary,
    ),
    slideshowSession: asBool(
      raw.slideshowSession,
      STORED_DEFAULTS.slideshowSession,
    ),
    slideshowIntervalSec: clamp(
      Number(raw.slideshowIntervalSec),
      WETGLASS_RANGES.slideshowIntervalSec.min,
      WETGLASS_RANGES.slideshowIntervalSec.max,
      STORED_DEFAULTS.slideshowIntervalSec,
    ),
    bgSource,
    stockId,
    libraryId,
    sessionId: bgSource === "session" ? sessionId : null,
  };
}

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cached: Stored | null = null;
const liveRef: { current: WetglassLive } = { current: WETGLASS_DEFAULTS };

function readPrefs(): Stored {
  if (cached) return cached;
  let raw = readScreenPrefsRaw(SCREEN_ID);
  // One-shot migrate old /s/heartfelt prefs → wetglass
  if (Object.keys(raw).length === 0) {
    const legacy = readScreenPrefsRaw(LEGACY_SCREEN_ID);
    if (Object.keys(legacy).length > 0) {
      raw = legacy;
      saveScreenPrefs(SCREEN_ID, legacy);
      try {
        window.localStorage.removeItem(screenPrefsKey(LEGACY_SCREEN_ID));
      } catch {
        /* private mode */
      }
    }
  }
  cached = migratePrefs(
    (Object.keys(raw).length > 0
      ? { ...STORED_DEFAULTS, ...raw }
      : { ...STORED_DEFAULTS }) as Stored & Record<string, unknown>,
  );
  liveRef.current = cached;
  return cached;
}

function writePrefs(next: Stored) {
  // Persist sessionId so Sync can push selection; migrate drops it if files gone
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
      bgSource: "stock",
      stockId: asStockId(sel.id),
      sessionId: null,
    });
    return;
  }
  if (sel.kind === "session") {
    if (!getSessionMediaEntry(sel.id)) {
      writePrefs({ ...cur, bgSource: "stock", sessionId: null });
      return;
    }
    writePrefs({ ...cur, bgSource: "session", sessionId: sel.id });
    return;
  }
  if (!getMediaLibraryEntry(sel.id)) {
    writePrefs({ ...cur, bgSource: "stock", sessionId: null });
    return;
  }
  writePrefs({
    ...cur,
    bgSource: "library",
    libraryId: sel.id,
    sessionId: null,
  });
}

function advanceSlideshow(): void {
  const cur = readPrefs();
  if (!cur.slideshow) return;
  const next = nextSlideshowSelection(cur);
  if (!next) return;
  applyMediaSelection(next);
}

/** Deadline for next slide — drives the DurationField countdown aside. */
let slideshowDeadlineMs = 0;
const countdownListeners = new Set<() => void>();

function emitCountdown() {
  for (const l of countdownListeners) l();
}

function subscribeCountdown(listener: () => void) {
  countdownListeners.add(listener);
  return () => {
    countdownListeners.delete(listener);
  };
}

function getSlideshowRemainSec(): number | null {
  if (slideshowDeadlineMs <= 0) return null;
  return Math.max(0, Math.ceil((slideshowDeadlineMs - Date.now()) / 1000));
}

function setSlideshowDeadline(atMs: number) {
  slideshowDeadlineMs = atMs;
  emitCountdown();
}

export default function useWetglassHook() {
  const live = useSyncExternalStore(
    subscribe,
    readPrefs,
    () => STORED_DEFAULTS,
  );

  useEffect(() => onTabSyncApply(SCREEN_ID, rehydrateFromStorage), []);

  useEffect(
    () =>
      subscribeUserMedia(() => {
        const cur = readPrefs();
        if (
          cur.bgSource === "library" &&
          (!cur.libraryId || !getMediaLibraryEntry(cur.libraryId))
        ) {
          writePrefs({
            ...cur,
            bgSource: "stock",
            libraryId: null,
            sessionId: null,
          });
        } else if (
          cur.bgSource === "session" &&
          (!cur.sessionId || !getSessionMediaEntry(cur.sessionId))
        ) {
          writePrefs({
            ...cur,
            bgSource: "stock",
            sessionId: null,
          });
        } else {
          emit();
        }
      }),
    [],
  );

  useEffect(() => {
    if (!live.slideshow) {
      setSlideshowDeadline(0);
      return;
    }
    const ms =
      Math.max(
        WETGLASS_RANGES.slideshowIntervalSec.min,
        live.slideshowIntervalSec,
      ) * 1000;
    setSlideshowDeadline(Date.now() + ms);
    const id = window.setInterval(() => {
      advanceSlideshow();
      setSlideshowDeadline(Date.now() + ms);
    }, ms);
    return () => {
      window.clearInterval(id);
      setSlideshowDeadline(0);
    };
  }, [
    live.slideshow,
    live.slideshowIntervalSec,
    live.slideshowStock,
    live.slideshowLibrary,
    live.slideshowSession,
  ]);

  // Whole-second UI tick for the interval countdown aside
  useEffect(() => {
    if (!live.slideshow) return;
    const id = window.setInterval(() => emitCountdown(), 1000);
    return () => window.clearInterval(id);
  }, [live.slideshow]);

  const slideshowRemainSec = useSyncExternalStore(
    subscribeCountdown,
    getSlideshowRemainSec,
    () => null,
  );

  const commit = (patch: Partial<Stored>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  const mediaValue: MediaSelection =
    live.bgSource === "library" && live.libraryId
      ? { kind: "library", id: live.libraryId }
      : live.bgSource === "session" && live.sessionId
        ? { kind: "session", id: live.sessionId }
        : { kind: "stock", id: live.stockId };

  return {
    liveRef,
    controls: {
      rainAmount: live.rainAmount,
      dropSpeed: live.dropSpeed,
      glass: live.glass,
      lightning: live.lightning,
      bgAlignX: live.bgAlignX,
      bgAlignY: live.bgAlignY,
      slideshow: live.slideshow,
      slideshowStock: live.slideshowStock,
      slideshowLibrary: live.slideshowLibrary,
      slideshowSession: live.slideshowSession,
      slideshowIntervalSec: live.slideshowIntervalSec,
      slideshowRemainSec,
      mediaValue,
      setRainAmount: (rainAmount: number) => commit({ rainAmount }),
      setDropSpeed: (dropSpeed: number) => commit({ dropSpeed }),
      setGlass: (glass: number) => commit({ glass }),
      setLightning: (lightning: number) => commit({ lightning }),
      setBgAlignX: (bgAlignX: number) => commit({ bgAlignX }),
      setBgAlignY: (bgAlignY: number) => commit({ bgAlignY }),
      setSlideshow: (slideshow: boolean) => commit({ slideshow }),
      setSlideshowStock: (slideshowStock: boolean) =>
        commit({ slideshowStock }),
      setSlideshowLibrary: (slideshowLibrary: boolean) =>
        commit({ slideshowLibrary }),
      setSlideshowSession: (slideshowSession: boolean) =>
        commit({ slideshowSession }),
      setSlideshowIntervalSec: (slideshowIntervalSec: number) =>
        commit({
          slideshowIntervalSec: clamp(
            slideshowIntervalSec,
            WETGLASS_RANGES.slideshowIntervalSec.min,
            WETGLASS_RANGES.slideshowIntervalSec.max,
            STORED_DEFAULTS.slideshowIntervalSec,
          ),
        }),
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
