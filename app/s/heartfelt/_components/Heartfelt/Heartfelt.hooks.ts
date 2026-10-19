"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toggleFullscreen } from "@/lib/fullscreen";
import { resetFxOverlay } from "@/components/FxOverlay";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
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
import {
  HEARTFELT_DEFAULTS,
  type HeartfeltBgSource,
  type HeartfeltLive,
} from "./Heartfelt.types";

const SCREEN_ID = "heartfelt";

type Stored = HeartfeltLive;

const STORED_DEFAULTS: Stored = { ...HEARTFELT_DEFAULTS };

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function asStockId(v: unknown): StockPlaceholderId {
  return isStockPlaceholderId(v) ? v : DEFAULT_STOCK_ID;
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
  let bgSource: HeartfeltBgSource = "stock";
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
const liveRef: { current: HeartfeltLive } = { current: HEARTFELT_DEFAULTS };

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

export default function useHeartfeltHook() {
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
      mediaValue,
      setRainAmount: (rainAmount: number) => commit({ rainAmount }),
      setDropSpeed: (dropSpeed: number) => commit({ dropSpeed }),
      setGlass: (glass: number) => commit({ glass }),
      setLightning: (lightning: number) => commit({ lightning }),
      setBgAlignX: (bgAlignX: number) => commit({ bgAlignX }),
      setBgAlignY: (bgAlignY: number) => commit({ bgAlignY }),
      setMedia: (sel: MediaSelection) => {
        if (sel.kind === "stock") {
          commit({
            bgSource: "stock",
            stockId: asStockId(sel.id),
            sessionId: null,
          });
          return;
        }
        if (sel.kind === "session") {
          if (!getSessionMediaEntry(sel.id)) {
            commit({ bgSource: "stock", sessionId: null });
            return;
          }
          commit({ bgSource: "session", sessionId: sel.id });
          return;
        }
        if (!getMediaLibraryEntry(sel.id)) {
          commit({ bgSource: "stock", sessionId: null });
          return;
        }
        commit({
          bgSource: "library",
          libraryId: sel.id,
          sessionId: null,
        });
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
