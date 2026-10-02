"use client";

import { createContext, useContext } from "react";

type ScreensOverlayApi = {
  screenId: string;
  hide: () => void;
  /** Push localStorage prefs to same-path tabs + reload this tab. */
  sync: () => void;
  /** Other tabs of this screen are open in the browser. */
  hasPeers: boolean;
};

export const ScreensOverlayContext = createContext<ScreensOverlayApi | null>(
  null,
);

export function useScreensOverlay() {
  return useContext(ScreensOverlayContext);
}
