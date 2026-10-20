"use client";

import { useSyncExternalStore } from "react";
import {
  getPluginTabTitleState,
  subscribePluginTabTitle,
  type PluginTabTitleState,
} from "@/lib/pluginTabTitle";

const SERVER_SNAP: PluginTabTitleState = {
  title: "",
  prevTitle: "",
  t: 0,
  updatedAt: 0,
  changed: false,
};

/**
 * Live tab title from the Monitron extension (`tab-title` messages).
 * Parallel to the audio spectrum bus — use for future track/tab triggers.
 */
export function usePluginTabTitle(): PluginTabTitleState {
  return useSyncExternalStore(
    subscribePluginTabTitle,
    getPluginTabTitleState,
    () => SERVER_SNAP,
  );
}
