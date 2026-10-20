"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { bindFullscreenEscape } from "@/lib/fullscreen";
import { snapshotScreenPrefsForSync } from "@/lib/screenLivePrefs";
import {
  applyIncomingTabSync,
  broadcastHudHide,
  broadcastTabSync,
  getTabHasPeers,
  getTabSyncSenderId,
  hudSessionKey,
  scheduleTabSyncApply,
  subscribeHudHide,
  subscribeTabPresence,
  subscribeTabSync,
} from "@/lib/tabBroadcast";
import { exportSessionMediaForSync } from "@/lib/userMedia";

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

/**
 * HUD visibility lives in sessionStorage (per-tab persistence across reload).
 * Hide is broadcast to siblings; show is local only.
 */
function readHidden(screenId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(hudSessionKey(screenId)) === "1";
  } catch {
    return false;
  }
}

function writeHiddenLocal(screenId: string, hidden: boolean) {
  if (typeof window !== "undefined") {
    try {
      const key = hudSessionKey(screenId);
      if (hidden) window.sessionStorage.setItem(key, "1");
      else window.sessionStorage.removeItem(key);
      // Drop legacy shared localStorage so hide can't leak via storage events.
      window.localStorage.removeItem(key);
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

  // Subscribe fns MUST be stable — inline arrows re-subscribe every render.
  // Presence teardown posts "bye" + recreates the channel; with 2+ tabs that
  // becomes a hello/bye storm (CPU melts, audio drops). Fullscreen re-renders
  // made it obvious.
  const subscribeHud = useCallback(
    (listener: () => void) => subscribe(screenId, listener),
    [screenId],
  );
  const subscribePeers = useCallback(
    (listener: () => void) => subscribeTabPresence(screenId, listener),
    [screenId],
  );

  const hideHud = useSyncExternalStore(
    subscribeHud,
    () => readHidden(screenId),
    () => false,
  );

  const hasPeers = useSyncExternalStore(
    subscribePeers,
    () => getTabHasPeers(screenId),
    () => false,
  );

  useEffect(() => bindFullscreenEscape(), []);

  // One-shot: clear shared localStorage hide leftover from older builds.
  useEffect(() => {
    try {
      window.localStorage.removeItem(hudSessionKey(screenId));
    } catch {
      /* ignore */
    }
  }, [screenId]);

  // Remote hide → close this tab's overlay; show is never received.
  useEffect(() => {
    return subscribeHudHide(screenId, () => writeHiddenLocal(screenId, true));
  }, [screenId]);

  // Cross-tab sync — prefs + session local media; does not force-hide.
  useEffect(() => {
    return subscribeTabSync(screenId, (msg) => {
      if (msg.senderId === getTabSyncSenderId()) return;
      applyIncomingTabSync(screenId, msg);
    });
  }, [screenId]);

  const sync = () => {
    if (!getTabHasPeers(screenId)) return;
    const sessionMedia = exportSessionMediaForSync();
    // Prefer this tab's in-memory prefs when registered (wet glass bg, etc.)
    const applyAt = broadcastTabSync(
      screenId,
      snapshotScreenPrefsForSync(screenId),
      sessionMedia,
    );
    scheduleTabSyncApply(applyAt, screenId);
  };

  return {
    ready: isClient,
    hideHud,
    hasPeers,
    hide: () => {
      writeHiddenLocal(screenId, true);
      broadcastHudHide(screenId);
    },
    show: () => writeHiddenLocal(screenId, false),
    sync,
  };
};

export default useScreensOverlayHook;
