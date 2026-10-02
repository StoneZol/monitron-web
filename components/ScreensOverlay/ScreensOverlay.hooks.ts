"use client";

import { useEffect, useSyncExternalStore } from "react";
import { bindFullscreenEscape } from "@/lib/fullscreen";

function hudKey(screenId: string) {
  return `monitron:${screenId}:hudHidden`;
}

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, boolean>();

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

function readHidden(screenId: string): boolean {
  const hit = cache.get(screenId);
  if (hit !== undefined) return hit;
  try {
    const v = window.localStorage.getItem(hudKey(screenId)) === "1";
    cache.set(screenId, v);
    return v;
  } catch {
    cache.set(screenId, false);
    return false;
  }
}

function writeHidden(screenId: string, hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(hudKey(screenId), "1");
    else window.localStorage.removeItem(hudKey(screenId));
  } catch {
    /* private mode — keep session cache */
  }
  cache.set(screenId, hidden);
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

  return {
    ready: isClient,
    hideHud,
    hide: () => writeHidden(screenId, true),
    show: () => writeHidden(screenId, false),
  };
};

export default useScreensOverlayHook;
