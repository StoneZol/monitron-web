"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toggleFullscreen } from "@/lib/fullscreen";
import { resetFxOverlay } from "@/components/FxOverlay";
import { readScreenPrefsMigrating, saveScreenPrefs } from "@/lib/screenPrefs";
import { registerScreenLivePrefs } from "@/lib/screenLivePrefs";
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
import {
  getSessionVideoEntry,
  subscribeSessionVideo,
} from "@/lib/sessionVideo";
import type { MediaSelection } from "@/components/ControlPanel";
import { getTabHasPeers } from "@/lib/tabBroadcast";
import {
  getPluginTabTitleState,
  subscribePluginTabTitle,
} from "@/lib/pluginTabTitle";
import { nextSlideshowSelection } from "./Wetglass.slideshow";
import {
  WETGLASS_DEFAULTS,
  WETGLASS_RANGES,
  type WetglassBgSource,
  type WetglassLive,
} from "./Wetglass.types";

const SCREEN_ID = "wet_glass";

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
  const videoId =
    typeof raw.videoId === "string" && raw.videoId ? raw.videoId : null;

  // Session stills / video are RAM-only — restore only if still in this tab
  let bgSource: WetglassBgSource = "stock";
  if (rawSource === "video" && videoId && getSessionVideoEntry(videoId)) {
    bgSource = "video";
  } else if (
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

  const slideshow = asBool(raw.slideshow, STORED_DEFAULTS.slideshow);
  const trackChangeRaw = asBool(raw.trackChange, STORED_DEFAULTS.trackChange);
  // Video mutex: no slideshow / track-change while a video bg is active
  const trackChange =
    bgSource === "video"
      ? false
      : trackChangeRaw && !slideshow;
  const slideshowOn = bgSource === "video" ? false : slideshow;

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
    slideshow: slideshowOn,
    trackChange,
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
    videoId: bgSource === "video" ? videoId : null,
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
  cached = migratePrefs({
    ...STORED_DEFAULTS,
    ...readScreenPrefsMigrating(SCREEN_ID, ["wetglass", "heartfelt"]),
  } as Stored & Record<string, unknown>);
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
      videoId: null,
    });
    return;
  }
  if (sel.kind === "video") {
    if (!getSessionVideoEntry(sel.id)) {
      writePrefs({
        ...cur,
        bgSource: "stock",
        videoId: null,
        sessionId: null,
      });
      return;
    }
    writePrefs({
      ...cur,
      bgSource: "video",
      videoId: sel.id,
      sessionId: null,
      slideshow: false,
      trackChange: false,
    });
    return;
  }
  if (sel.kind === "session") {
    if (!getSessionMediaEntry(sel.id)) {
      writePrefs({
        ...cur,
        bgSource: "stock",
        sessionId: null,
        videoId: null,
      });
      return;
    }
    writePrefs({
      ...cur,
      bgSource: "session",
      sessionId: sel.id,
      videoId: null,
    });
    return;
  }
  if (!getMediaLibraryEntry(sel.id)) {
    writePrefs({
      ...cur,
      bgSource: "stock",
      sessionId: null,
      videoId: null,
    });
    return;
  }
  writePrefs({
    ...cur,
    bgSource: "library",
    libraryId: sel.id,
    sessionId: null,
    videoId: null,
  });
}

/**
 * Next image from the shared pool (timer slideshow or track-change).
 * @param from - slideshow timer skips when sibling tabs are open (shared
 *   localStorage + Sync should coordinate). Track-change still advances:
 *   only the tab that hears plugin tab-title should react, and peers were
 *   falsely blocking single-user setups (preview + browser, etc.).
 */
function advanceBgPool(from: "slideshow" | "track"): void {
  const cur = readPrefs();
  if (cur.bgSource === "video") return;
  if (from === "slideshow") {
    if (!cur.slideshow) return;
    if (getTabHasPeers(SCREEN_ID)) return;
  } else if (!cur.trackChange) {
    return;
  }
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

  // Sync must push THIS tab's bg, not a sibling overwrite sitting in localStorage
  useEffect(
    () =>
      registerScreenLivePrefs(SCREEN_ID, () => ({
        ...readPrefs(),
      })),
    [],
  );

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
            videoId: null,
          });
        } else if (
          cur.bgSource === "session" &&
          (!cur.sessionId || !getSessionMediaEntry(cur.sessionId))
        ) {
          writePrefs({
            ...cur,
            bgSource: "stock",
            sessionId: null,
            videoId: null,
          });
        } else {
          emit();
        }
      }),
    [],
  );

  useEffect(
    () =>
      subscribeSessionVideo(() => {
        const cur = readPrefs();
        if (
          cur.bgSource === "video" &&
          (!cur.videoId || !getSessionVideoEntry(cur.videoId))
        ) {
          writePrefs({
            ...cur,
            bgSource: "stock",
            videoId: null,
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
      advanceBgPool("slideshow");
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

  // Keep tab-title store warm so enabling trackChange does not treat the
  // current track as a "change".
  useEffect(() => subscribePluginTabTitle(() => {}), []);

  // Plugin tab-title -> next bg (only while trackChange is on)
  useEffect(() => {
    if (!live.trackChange) return;
    // Prime from whatever is already known - first snapshot is not a "change"
    const norm = (t: string) => t.trim();
    let lastTitle = norm(getPluginTabTitleState().title);
    let primed = Boolean(lastTitle);
    return subscribePluginTabTitle(() => {
      if (!readPrefs().trackChange) return;
      const s = getPluginTabTitleState();
      const title = norm(s.title);
      if (!title) return;
      if (!primed) {
        primed = true;
        lastTitle = title;
        return;
      }
      if (title === lastTitle) return;
      lastTitle = title;
      advanceBgPool("track");
    });
  }, [live.trackChange]);

  const slideshowRemainSec = useSyncExternalStore(
    subscribeCountdown,
    getSlideshowRemainSec,
    () => null,
  );

  const commit = (patch: Partial<Stored>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  const mediaValue: MediaSelection =
    live.bgSource === "video" && live.videoId
      ? { kind: "video", id: live.videoId }
      : live.bgSource === "library" && live.libraryId
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
      trackChange: live.trackChange,
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
      setSlideshow: (slideshow: boolean) => {
        const cur = readPrefs();
        if (!slideshow) {
          commit({ slideshow: false });
          return;
        }
        // Enabling slideshow drops video bg (stills pool only)
        if (cur.bgSource === "video") {
          commit({
            slideshow: true,
            trackChange: false,
            bgSource: "stock",
            videoId: null,
          });
          return;
        }
        commit({ slideshow: true, trackChange: false });
      },
      setTrackChange: (trackChange: boolean) => {
        const cur = readPrefs();
        if (!trackChange) {
          commit({ trackChange: false });
          return;
        }
        if (cur.bgSource === "video") {
          commit({
            trackChange: true,
            slideshow: false,
            bgSource: "stock",
            videoId: null,
          });
          return;
        }
        commit({ trackChange: true, slideshow: false });
      },
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
