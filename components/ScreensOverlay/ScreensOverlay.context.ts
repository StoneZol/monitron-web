"use client";

import { createContext, useContext } from "react";

type ScreensOverlayApi = {
  hide: () => void;
  /** Push localStorage prefs to same-path tabs + reload this tab. */
  sync: () => void;
};

export const ScreensOverlayContext = createContext<ScreensOverlayApi | null>(
  null,
);

export function useScreensOverlay() {
  return useContext(ScreensOverlayContext);
}
