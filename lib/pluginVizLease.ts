/**
 * Plugin visualizer-toggle is global per extension. Multiple Monitron tabs
 * coordinate via BroadcastChannel; this tab uses acquire/release so React
 * remounts don't spuriously disable the stream.
 */

import { postVisualizerToggle } from "@/lib/audioBus";

const CHANNEL = "monitron:plugin-viz-lease";

type LeaseMsg =
  | { type: "want"; id: string; wanted: boolean }
  | { type: "ping"; id: string };

let tabId: string | null = null;
let channel: BroadcastChannel | null = null;
/** Active acquire() calls on this tab (useAudioReactive / applySource). */
let holderCount = 0;
const peersWanting = new Set<string>();
let lastPosted: boolean | null = null;
let started = false;

function getTabId(): string {
  if (tabId) return tabId;
  tabId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random()}`;
  return tabId;
}

function localWantsStream(): boolean {
  return holderCount > 0;
}

function extensionShouldEnable(): boolean {
  return localWantsStream() || peersWanting.size > 0;
}

function flushExtensionToggle(force = false) {
  const enabled = extensionShouldEnable();
  if (!force && lastPosted === enabled) return;
  lastPosted = enabled;
  postVisualizerToggle(enabled);
}

function broadcastWant(wanted: boolean) {
  if (!channel) return;
  channel.postMessage({
    type: "want",
    id: getTabId(),
    wanted,
  } satisfies LeaseMsg);
}

function syncPeerState(forceToggle = false) {
  broadcastWant(localWantsStream());
  flushExtensionToggle(forceToggle);
}

function onMessage(ev: MessageEvent) {
  const data = ev.data as LeaseMsg;
  if (!data || typeof data !== "object") return;
  if (data.type === "ping") {
    if (data.id === getTabId()) return;
    if (localWantsStream()) broadcastWant(true);
    return;
  }
  if (data.type !== "want" || data.id === getTabId()) return;
  if (data.wanted) peersWanting.add(data.id);
  else peersWanting.delete(data.id);
  flushExtensionToggle();
}

function ensureChannel() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = onMessage;
    channel.postMessage({ type: "ping", id: getTabId() } satisfies LeaseMsg);
  }
  window.addEventListener("pagehide", onPageHide);
}

function onPageHide() {
  if (holderCount === 0) return;
  holderCount = 0;
  broadcastWant(false);
  flushExtensionToggle();
}

/**
 * This tab needs plugin frames. Call the returned release when done.
 * Safe across React Strict Mode remounts (pair acquire/release per hook instance).
 */
export function acquirePluginViz(): () => void {
  ensureChannel();
  const wasEmpty = holderCount === 0;
  holderCount += 1;
  syncPeerState(wasEmpty);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holderCount = Math.max(0, holderCount - 1);
    syncPeerState();
  };
}
