/** Cross-tab sync for saver controls (same origin + pathname). */

import { saveScreenPrefs } from "@/lib/screenPrefs";

export const TAB_SYNC_VERSION = 3 as const;

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

/** Per-tab HUD hide key (sessionStorage). Same string was once in localStorage. */
export function hudSessionKey(screenId: string) {
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
 * Push full prefs + shared reload deadline. Does not touch HUD visibility.
 * Returns reloadAt so the sender can reload on the same tick.
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
 * Persist prefs, then wait for shared reloadAt.
 * Does not change this tab's HUD (open stays open, hidden stays hidden).
 */
export function applyIncomingTabSync(
  screenId: string,
  msg: TabSyncMessage,
): void {
  saveScreenPrefs(screenId, msg.prefs);
  scheduleReloadAt(msg.reloadAt);
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

    const id = getTabSyncSenderId();
    try {
      bucket!.channel?.postMessage({
        kind: "presence",
        type: "bye",
        id,
        screenId,
      } satisfies PresenceMsg);
    } catch {
      /* ignore */
    }
    if (bucket!.beatTimer != null) window.clearInterval(bucket!.beatTimer);
    if (bucket!.pruneTimer != null) window.clearInterval(bucket!.pruneTimer);
    const hide = (bucket as PresenceBucket & { _onHide?: () => void })._onHide;
    if (hide) window.removeEventListener("pagehide", hide);
    bucket!.channel?.close();
    presenceByKey.delete(key);
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
