"use client";

import { createContext, useContext } from "react";

type ScreensOverlayApi = {
  hide: () => void;
};

export const ScreensOverlayContext = createContext<ScreensOverlayApi | null>(
  null,
);

export function useScreensOverlay() {
  return useContext(ScreensOverlayContext);
}
