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
  hasUserBackground,
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

function asBgSource(v: unknown, stockId: StockPlaceholderId): HeartfeltBgSource {
  if (v === "user") return hasUserBackground() ? "user" : "stock";
  if (v === "stock") return "stock";
  // Legacy backgroundId migration
  if (typeof v === "string" && v.length > 0) {
    return hasUserBackground() ? "user" : "stock";
  }
  if (v === null) return "stock";
  void stockId;
  return "stock";
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const stockId = asStockId(raw.stockId ?? DEFAULT_STOCK_ID);
  // Explicit bgSource wins; never auto-force "last user" over a stock pick
  const bgSource = asBgSource(
    raw.bgSource !== undefined ? raw.bgSource : raw.backgroundId,
    stockId,
  );

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
    bgSource,
    stockId,
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

  // If custom slot wiped elsewhere, fall back to stock (don't invent a new pick)
  useEffect(
    () =>
      subscribeUserMedia(() => {
        const cur = readPrefs();
        if (cur.bgSource === "user" && !hasUserBackground()) {
          writePrefs({ ...cur, bgSource: "stock" });
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
    live.bgSource === "user"
      ? { kind: "user" }
      : { kind: "stock", id: live.stockId };

  return {
    liveRef,
    controls: {
      rainAmount: live.rainAmount,
      dropSpeed: live.dropSpeed,
      glass: live.glass,
      lightning: live.lightning,
      mediaValue,
      setRainAmount: (rainAmount: number) => commit({ rainAmount }),
      setDropSpeed: (dropSpeed: number) => commit({ dropSpeed }),
      setGlass: (glass: number) => commit({ glass }),
      setLightning: (lightning: number) => commit({ lightning }),
      setMedia: (sel: MediaSelection) => {
        if (sel.kind === "stock") {
          commit({
            bgSource: "stock",
            stockId: asStockId(sel.id),
          });
          return;
        }
        if (!hasUserBackground()) {
          commit({ bgSource: "stock" });
          return;
        }
        commit({ bgSource: "user" });
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
