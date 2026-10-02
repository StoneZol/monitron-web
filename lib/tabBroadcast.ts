/** Cross-tab sync for saver controls (same origin + pathname). */

import { saveScreenPrefs } from "@/lib/screenPrefs";

export const TAB_SYNC_VERSION = 1 as const;

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

/** Push full prefs to other tabs on this path; they hide HUD + reload. */
export function broadcastTabSync(
  screenId: string,
  prefs: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }
  const path = window.location.pathname;
  const msg: TabSyncMessage = {
    v: TAB_SYNC_VERSION,
    path,
    screenId,
    senderId: getTabSyncSenderId(),
    prefs: { ...prefs },
    hideOverlay: true,
  };
  const ch = new BroadcastChannel(tabSyncChannelName(path));
  ch.postMessage(msg);
  ch.close();
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

/** Persist full prefs + force-hide HUD, then reload — scene restarts on the new config. */
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
  window.location.reload();
}
