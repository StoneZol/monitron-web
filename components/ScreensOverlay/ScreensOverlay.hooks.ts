"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { bindFullscreenEscape } from "@/lib/fullscreen";
import { placeholders } from "@/lib/placeholders";
import { snapshotScreenPrefsForSync } from "@/lib/screenLivePrefs";
import {
  applyIncomingTabSync,
  broadcastHudHide,
  broadcastSiteFollow,
  broadcastTabSync,
  getSiteHasPeers,
  getTabHasPeers,
  getTabSyncSenderId,
  hudSessionKey,
  scheduleTabSyncApply,
  subscribeHudHide,
  subscribeSitePresence,
  subscribeTabPresence,
  subscribeTabSync,
} from "@/lib/tabBroadcast";
import { exportSessionMediaForSync } from "@/lib/userMedia";
import { exportSessionVideoForSync } from "@/lib/sessionVideo";

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

  const subscribeHud = useCallback(
    (listener: () => void) => subscribe(screenId, listener),
    [screenId],
  );
  const subscribePeers = useCallback(
    (listener: () => void) => subscribeTabPresence(screenId, listener),
    [screenId],
  );
  const subscribeSite = useCallback(
    (listener: () => void) => subscribeSitePresence(listener),
    [],
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

  const hasSitePeers = useSyncExternalStore(
    subscribeSite,
    () => getSiteHasPeers(),
    () => false,
  );

  useEffect(() => bindFullscreenEscape(), []);

  useEffect(() => {
    try {
      window.localStorage.removeItem(hudSessionKey(screenId));
    } catch {
      /* ignore */
    }
  }, [screenId]);

  useEffect(() => {
    return subscribeHudHide(screenId, () => writeHiddenLocal(screenId, true));
  }, [screenId]);

  useEffect(() => {
    return subscribeTabSync(screenId, (msg) => {
      if (msg.senderId === getTabSyncSenderId()) return;
      applyIncomingTabSync(screenId, msg);
    });
  }, [screenId]);

  const syncPayload = () => {
    const sessionMedia = exportSessionMediaForSync();
    const sessionVideo = exportSessionVideoForSync();
    const prefs = snapshotScreenPrefsForSync(screenId);
    return { sessionMedia, sessionVideo, prefs };
  };

  const sync = () => {
    if (!getTabHasPeers(screenId)) return;
    const { sessionMedia, sessionVideo, prefs } = syncPayload();
    const applyAt = broadcastTabSync(
      screenId,
      prefs,
      sessionMedia,
      sessionVideo,
    );
    scheduleTabSyncApply(applyAt, screenId);
  };

  const follow = () => {
    if (!getSiteHasPeers()) return;
    const href =
      placeholders.find((p) => p.id === screenId)?.href ?? `/s/${screenId}`;
    const { sessionMedia, sessionVideo, prefs } = syncPayload();
    const applyAt = broadcastSiteFollow(
      screenId,
      href,
      prefs,
      sessionMedia,
      sessionVideo,
    );
    scheduleTabSyncApply(applyAt, screenId);
  };

  return {
    ready: isClient,
    hideHud,
    hasPeers,
    hasSitePeers,
    hide: () => {
      writeHiddenLocal(screenId, true);
      broadcastHudHide(screenId);
    },
    show: () => writeHiddenLocal(screenId, false),
    sync,
    follow,
  };
};

export default useScreensOverlayHook;
