"use client";

import { createContext, useContext } from "react";

type ScreensOverlayApi = {
  screenId: string;
  hide: () => void;
  /** Push prefs to other open tabs of the same screen (no navigation). */
  sync: () => void;
  /** Soft-nav every Monitron tab onto this screen + apply prefs. */
  follow: () => void;
  /** Other tabs of this screen are open. */
  hasPeers: boolean;
  /** Any other Monitron tab is open (any screen). */
  hasSitePeers: boolean;
};

export const ScreensOverlayContext = createContext<ScreensOverlayApi | null>(
  null,
);

export function useScreensOverlay() {
  return useContext(ScreensOverlayContext);
}
