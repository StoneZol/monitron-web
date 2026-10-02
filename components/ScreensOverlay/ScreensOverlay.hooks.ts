"use client";

import { useEffect, useSyncExternalStore } from "react";
import { bindFullscreenEscape } from "@/lib/fullscreen";
import { readScreenPrefsRaw } from "@/lib/screenPrefs";
import {
  applyIncomingTabSync,
  broadcastTabSync,
  getTabSyncSenderId,
  hudStorageKey,
  scheduleReloadAt,
  subscribeTabSync,
} from "@/lib/tabBroadcast";

const listeners = new Map<string, Set<() => void>>();

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

/** Always hit localStorage on client — never cache SSR/false poison. */
function readHidden(screenId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(hudStorageKey(screenId)) === "1";
  } catch {
    return false;
  }
}

function writeHidden(screenId: string, hidden: boolean) {
  if (typeof window !== "undefined") {
    try {
      if (hidden) window.localStorage.setItem(hudStorageKey(screenId), "1");
      else window.localStorage.removeItem(hudStorageKey(screenId));
    } catch {
      /* private mode */
    }
  }
  emit(screenId);
}

const subscribeNoop = () => () => {};

const useScreensOverlayHook = (screenId: string) => {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const hideHud = useSyncExternalStore(
    (listener) => subscribe(screenId, listener),
    () => readHidden(screenId),
    () => false,
  );

  useEffect(() => bindFullscreenEscape(), []);

  // Cross-tab sync — any screen under ScreensOverlay gets this for free.
  useEffect(() => {
    return subscribeTabSync(screenId, (msg) => {
      if (msg.senderId === getTabSyncSenderId()) return;
      applyIncomingTabSync(screenId, msg);
    });
  }, [screenId]);

  const sync = () => {
    const reloadAt = broadcastTabSync(screenId, readScreenPrefsRaw(screenId));
    // Same deadline as peers; keep this tab's HUD (receivers force-hide).
    scheduleReloadAt(reloadAt);
  };

  return {
    ready: isClient,
    hideHud,
    hide: () => writeHidden(screenId, true),
    show: () => writeHidden(screenId, false),
    sync,
  };
};

export default useScreensOverlayHook;
