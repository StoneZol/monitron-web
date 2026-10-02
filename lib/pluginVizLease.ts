/**
 * Plugin visualizer-toggle is global per extension. Multiple Monitron tabs
 * share a lease over BroadcastChannel so closing one tab does not kill the
 * stream for the others.
 */

import { postVisualizerToggle } from "@/lib/audioBus";

const CHANNEL = "monitron:plugin-viz-lease";

type LeaseMsg =
  | { type: "want"; id: string; wanted: boolean }
  | { type: "ping"; id: string };

let tabId: string | null = null;
let channel: BroadcastChannel | null = null;
let localWanted = false;
/** Other tabs currently claiming the plugin stream */
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

function flushExtensionToggle() {
  const enabled = localWanted || peersWanting.size > 0;
  if (lastPosted === enabled) return;
  lastPosted = enabled;
  postVisualizerToggle(enabled);
}

function onMessage(ev: MessageEvent) {
  const data = ev.data as LeaseMsg;
  if (!data || typeof data !== "object") return;
  if (data.type === "ping") {
    if (data.id === getTabId()) return;
    if (localWanted && channel) {
      channel.postMessage({
        type: "want",
        id: getTabId(),
        wanted: true,
      } satisfies LeaseMsg);
    }
    return;
  }
  if (data.type !== "want" || data.id === getTabId()) return;
  if (data.wanted) peersWanting.add(data.id);
  else peersWanting.delete(data.id);
  flushExtensionToggle();
}

function ensureChannel() {
  if (started || typeof window === "undefined") return;
  if (typeof BroadcastChannel === "undefined") {
    started = true;
    return;
  }
  started = true;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = onMessage;
  window.addEventListener("pagehide", onPageHide);
  // Learn who already holds the lease
  channel.postMessage({ type: "ping", id: getTabId() } satisfies LeaseMsg);
}

function onPageHide() {
  if (!localWanted) return;
  localWanted = false;
  if (channel) {
    channel.postMessage({
      type: "want",
      id: getTabId(),
      wanted: false,
    } satisfies LeaseMsg);
  }
  flushExtensionToggle();
}

/** This tab wants (or releases) the plugin audio stream. */
export function setPluginVizWanted(wanted: boolean) {
  ensureChannel();
  if (localWanted === wanted) return;
  localWanted = wanted;
  if (channel) {
    channel.postMessage({
      type: "want",
      id: getTabId(),
      wanted,
    } satisfies LeaseMsg);
  }
  flushExtensionToggle();
}
