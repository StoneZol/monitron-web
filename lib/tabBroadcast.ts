/** Cross-tab sync for saver controls (same origin + pathname). */

import { saveScreenPrefs } from "@/lib/screenPrefs";

export const TAB_SYNC_VERSION = 4 as const;

/** How far ahead of "now" all tabs aim to hot-apply together. */
export const TAB_SYNC_LEAD_MS = 1000;

/** Fired at the shared sync deadline — prefs already on disk; screens rehydrate. */
export const TAB_SYNC_APPLY = "monitron:tab-sync-apply";

export type TabSyncApplyDetail = { screenId: string };

export type TabSyncMessage = {
  v: typeof TAB_SYNC_VERSION;
  path: string;
  screenId: string;
  /** Ignore echo from the tab that sent this message. */
  senderId: string;
  /** Full prefs snapshot (incl. micGate / peakGain / audioSource). */
  prefs: Record<string, unknown>;
  /** Absolute Date.now() deadline — all tabs hot-apply at/after this. */
  applyAt: number;
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

/** Per-tab HUD hide key (sessionStorage). Same string was once in localStorage. */
export function hudSessionKey(screenId: string) {
  return `monitron:${screenId}:hudHidden`;
}

/**
 * Wait until wall-clock `applyAt`, then fire hot-apply for this screen
 * (0 delay if already past). No navigation — fullscreen survives.
 */
export function scheduleTabSyncApply(applyAt: number, screenId: string): void {
  const delay = Math.max(0, applyAt - Date.now());
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<TabSyncApplyDetail>(TAB_SYNC_APPLY, {
        detail: { screenId },
      }),
    );
  }, delay);
}

/** Subscribe to the shared sync deadline for one screen. */
export function subscribeTabSyncApply(
  screenId: string,
  onApply: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<TabSyncApplyDetail>).detail;
    if (detail?.screenId !== screenId) return;
    onApply();
  };
  window.addEventListener(TAB_SYNC_APPLY, handler);
  return () => window.removeEventListener(TAB_SYNC_APPLY, handler);
}

/**
 * Push full prefs + shared apply deadline. Does not touch HUD visibility.
 * Returns applyAt so the sender can hot-apply on the same tick.
 */
export function broadcastTabSync(
  screenId: string,
  prefs: Record<string, unknown>,
): number {
  const applyAt = Date.now() + TAB_SYNC_LEAD_MS;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return applyAt;
  }
  const path = window.location.pathname;
  const msg: TabSyncMessage = {
    v: TAB_SYNC_VERSION,
    path,
    screenId,
    senderId: getTabSyncSenderId(),
    prefs: { ...prefs },
    applyAt,
  };
  const ch = new BroadcastChannel(tabSyncChannelName(path));
  ch.postMessage(msg);
  ch.close();
  return applyAt;
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
 * Persist prefs, then wait for shared applyAt.
 * Does not change this tab's HUD (open stays open, hidden stays hidden).
 */
export function applyIncomingTabSync(
  screenId: string,
  msg: TabSyncMessage,
): void {
  saveScreenPrefs(screenId, msg.prefs);
  scheduleTabSyncApply(msg.applyAt, screenId);
}

// ── HUD hide: broadcast to all tabs; show stays local ───────────────

type HudHideMsg = {
  kind: "hud-hide";
  screenId: string;
  senderId: string;
};

function hudHideChannelName(path: string) {
  return `monitron:hud-hide:${path}`;
}

/** Tell every sibling tab on this path+screen to hide the overlay. */
export function broadcastHudHide(screenId: string): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }
  const path = window.location.pathname;
  const msg: HudHideMsg = {
    kind: "hud-hide",
    screenId,
    senderId: getTabSyncSenderId(),
  };
  const ch = new BroadcastChannel(hudHideChannelName(path));
  ch.postMessage(msg);
  ch.close();
}

/** Apply remote hide requests (show is never broadcast). */
export function subscribeHudHide(
  screenId: string,
  onHide: () => void,
): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const path = window.location.pathname;
  const ch = new BroadcastChannel(hudHideChannelName(path));
  ch.onmessage = (ev: MessageEvent) => {
    const data = ev.data as HudHideMsg;
    if (
      !data ||
      data.kind !== "hud-hide" ||
      data.screenId !== screenId ||
      data.senderId === getTabSyncSenderId()
    ) {
      return;
    }
    onHide();
  };
  return () => ch.close();
}

// ── Presence: other tabs on the same path + screenId ───────────────

const PRESENCE_TTL_MS = 4000;
const PRESENCE_BEAT_MS = 1500;

type PresenceMsg =
  | { kind: "presence"; type: "hello" | "bye" | "ping"; id: string; screenId: string };

type PresenceBucket = {
  peers: Map<string, number>;
  listeners: Set<() => void>;
  channel: BroadcastChannel | null;
  beatTimer: number | null;
  pruneTimer: number | null;
};

const presenceByKey = new Map<string, PresenceBucket>();

function presenceKey(path: string, screenId: string) {
  return `${path}::${screenId}`;
}

function emitPresence(bucket: PresenceBucket) {
  for (const listener of bucket.listeners) listener();
}

function prunePeers(bucket: PresenceBucket) {
  const now = Date.now();
  let changed = false;
  for (const [id, seen] of bucket.peers) {
    if (now - seen > PRESENCE_TTL_MS) {
      bucket.peers.delete(id);
      changed = true;
    }
  }
  if (changed) emitPresence(bucket);
}

/**
 * Track other tabs of this screen on the same pathname.
 * hasPeers === true when at least one sibling is alive.
 */
export function subscribeTabPresence(
  screenId: string,
  onChange: () => void,
): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }

  const path = window.location.pathname;
  const key = presenceKey(path, screenId);
  let bucket = presenceByKey.get(key);
  if (!bucket) {
    const id = getTabSyncSenderId();
    const channel = new BroadcastChannel(`monitron:tab-presence:${path}`);
    bucket = {
      peers: new Map(),
      listeners: new Set(),
      channel,
      beatTimer: null,
      pruneTimer: null,
    };
    presenceByKey.set(key, bucket);

    const post = (type: PresenceMsg["type"]) => {
      const msg: PresenceMsg = { kind: "presence", type, id, screenId };
      channel.postMessage(msg);
    };

    channel.onmessage = (ev: MessageEvent) => {
      const data = ev.data as PresenceMsg;
      if (
        !data ||
        data.kind !== "presence" ||
        data.screenId !== screenId ||
        data.id === id
      ) {
        return;
      }
      if (data.type === "bye") {
        if (bucket!.peers.delete(data.id)) emitPresence(bucket!);
        return;
      }
      // hello | ping from peer
      const before = bucket!.peers.size;
      bucket!.peers.set(data.id, Date.now());
      if (bucket!.peers.size !== before) emitPresence(bucket!);
      if (data.type === "ping") post("hello");
    };

    const onHide = () => post("bye");
    window.addEventListener("pagehide", onHide);

    post("hello");
    post("ping");
    bucket.beatTimer = window.setInterval(() => post("hello"), PRESENCE_BEAT_MS);
    bucket.pruneTimer = window.setInterval(
      () => prunePeers(bucket!),
      PRESENCE_BEAT_MS,
    );

    // Stash cleanup on last unsubscribe via bucket meta — attach once
    (bucket as PresenceBucket & { _onHide?: () => void })._onHide = onHide;
  }

  bucket.listeners.add(onChange);
  return () => {
    bucket!.listeners.delete(onChange);
    if (bucket!.listeners.size > 0) return;

    // Defer teardown so a same-tick re-subscribe (unstable useSyncExternalStore
    // subscribe identity) does not bye→hello thrash with sibling tabs.
    queueMicrotask(() => {
      const current = presenceByKey.get(key);
      if (!current || current !== bucket || current.listeners.size > 0) return;

      const id = getTabSyncSenderId();
      try {
        current.channel?.postMessage({
          kind: "presence",
          type: "bye",
          id,
          screenId,
        } satisfies PresenceMsg);
      } catch {
        /* ignore */
      }
      if (current.beatTimer != null) window.clearInterval(current.beatTimer);
      if (current.pruneTimer != null) window.clearInterval(current.pruneTimer);
      const hide = (current as PresenceBucket & { _onHide?: () => void })._onHide;
      if (hide) window.removeEventListener("pagehide", hide);
      current.channel?.close();
      presenceByKey.delete(key);
    });
  };
}

export function getTabHasPeers(screenId: string): boolean {
  if (typeof window === "undefined") return false;
  const key = presenceKey(window.location.pathname, screenId);
  const bucket = presenceByKey.get(key);
  if (!bucket) return false;
  // Silent prune — never emit during React getSnapshot
  const now = Date.now();
  for (const [id, seen] of bucket.peers) {
    if (now - seen > PRESENCE_TTL_MS) bucket.peers.delete(id);
  }
  return bucket.peers.size > 0;
}
