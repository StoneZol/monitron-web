/** Cross-tab sync for saver controls (same origin + pathname). */

import { saveScreenPrefs } from "@/lib/screenPrefs";

export const TAB_SYNC_VERSION = 2 as const;

/** How far ahead of "now" all tabs aim to reload together. */
export const TAB_SYNC_LEAD_MS = 1000;

export type TabSyncMessage = {
  v: typeof TAB_SYNC_VERSION;
  path: string;
  screenId: string;
  /** Ignore echo from the tab that sent this message. */
  senderId: string;
  /** Full prefs snapshot (incl. micGate / peakGain / audioSource). */
  prefs: Record<string, unknown>;
  /** Receivers force-hide HUD; sender keeps its overlay. */
  hideOverlay: true;
  /** Absolute Date.now() deadline — all tabs reload at/after this. */
  reloadAt: number;
};

let tabSenderId: string | null = null;

export function getTabSyncSenderId(): string {
  if (tabSenderId) return tabSenderId;
  if (typeof window === "undefined") return "ssr";
  tabSenderId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return tabSenderId;
}

export function tabSyncChannelName(path: string) {
  return `monitron:tab-sync:${path}`;
}

export function hudStorageKey(screenId: string) {
  return `monitron:${screenId}:hudHidden`;
}

/** Wait until wall-clock `reloadAt`, then reload (0 delay if already past). */
export function scheduleReloadAt(reloadAt: number): void {
  const delay = Math.max(0, reloadAt - Date.now());
  window.setTimeout(() => {
    window.location.reload();
  }, delay);
}

/**
 * Push full prefs + shared reload deadline. Returns reloadAt so the sender
 * can wait on the same tick without applying hideOverlay.
 */
export function broadcastTabSync(
  screenId: string,
  prefs: Record<string, unknown>,
): number {
  const reloadAt = Date.now() + TAB_SYNC_LEAD_MS;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return reloadAt;
  }
  const path = window.location.pathname;
  const msg: TabSyncMessage = {
    v: TAB_SYNC_VERSION,
    path,
    screenId,
    senderId: getTabSyncSenderId(),
    prefs: { ...prefs },
    hideOverlay: true,
    reloadAt,
  };
  const ch = new BroadcastChannel(tabSyncChannelName(path));
  ch.postMessage(msg);
  ch.close();
  return reloadAt;
}

export function subscribeTabSync(
  screenId: string,
  onMessage: (msg: TabSyncMessage) => void,
): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const path = window.location.pathname;
  const ch = new BroadcastChannel(tabSyncChannelName(path));
  ch.onmessage = (ev: MessageEvent) => {
    const data = ev.data as TabSyncMessage;
    if (
      !data ||
      data.v !== TAB_SYNC_VERSION ||
      data.path !== path ||
      data.screenId !== screenId
    ) {
      return;
    }
    onMessage(data);
  };
  return () => ch.close();
}

/**
 * Persist prefs + force-hide HUD, then wait for shared reloadAt.
 * (Late message → reload ASAP.)
 */
export function applyIncomingTabSync(
  screenId: string,
  msg: TabSyncMessage,
): void {
  saveScreenPrefs(screenId, msg.prefs);
  try {
    window.localStorage.setItem(hudStorageKey(screenId), "1");
  } catch {
    /* ignore */
  }
  scheduleReloadAt(msg.reloadAt);
}
