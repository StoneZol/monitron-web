/**
 * Parallel low-rate store for extension `tab-title` messages.
 * Independent of the spectrum bus / plugin viz lease — screens can
 * subscribe later for track/tab-change triggers.
 */

import {
  subscribeAudioBus,
  type AudioTabTitle,
} from "@/lib/audioBus";

export type PluginTabTitleState = {
  /** Latest title from the plugin (empty until first message) */
  title: string;
  /** Previous title before the last change (for trigger dedupe) */
  prevTitle: string;
  /** Plugin capture timestamp from the message */
  t: number;
  /** Page wall-clock ms when state last updated */
  updatedAt: number;
  /** True when `title` differs from `prevTitle` on this update */
  changed: boolean;
};

const EMPTY: PluginTabTitleState = {
  title: "",
  prevTitle: "",
  t: 0,
  updatedAt: 0,
  changed: false,
};

let state: PluginTabTitleState = EMPTY;
const listeners = new Set<() => void>();
let unsubBus: (() => void) | null = null;

function emit() {
  for (const l of listeners) l();
}

function applyTabTitle(msg: AudioTabTitle) {
  const nextTitle = msg.title;
  const changed = nextTitle !== state.title;
  state = {
    title: nextTitle,
    prevTitle: changed ? state.title : state.prevTitle,
    t: msg.t,
    updatedAt: Date.now(),
    changed,
  };
  emit();
}

function ensureListening() {
  if (unsubBus || typeof window === "undefined") return;
  unsubBus = subscribeAudioBus({
    onTabTitle: applyTabTitle,
  });
}

export function getPluginTabTitleState(): PluginTabTitleState {
  return state;
}

export function subscribePluginTabTitle(listener: () => void): () => void {
  ensureListening();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubBus) {
      unsubBus();
      unsubBus = null;
    }
  };
}

/** Test / reset helper — clears stored titles. */
export function resetPluginTabTitle() {
  state = EMPTY;
  emit();
}
