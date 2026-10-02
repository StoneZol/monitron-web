"use client";

import useScreensOverlayHook from "./ScreensOverlay.hooks";
import { ScreensOverlayContext } from "./ScreensOverlay.context";
import type { ScreensOverlayProps } from "./ScreensOverlay.types";

/**
 * HUD shell for every saver. Hide / cross-tab sync live here — screens only
 * pass screenId and render ControlPanel; no per-screen sync wiring.
 * Tap empty screen to wake when HUD is hidden.
 */
const ScreensOverlay = ({ screenId, children }: ScreensOverlayProps) => {
  const { ready, hideHud, hide, show, sync, hasPeers } =
    useScreensOverlayHook(screenId);

  // Wait for client prefs — avoids HUD flash on reload when it was hidden.
  if (!ready) return null;

  if (hideHud) {
    return (
      <div
        className="absolute inset-0 z-10"
        onPointerDown={show}
        role="button"
        tabIndex={0}
        aria-label="Show controls"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") show();
        }}
      />
    );
  }

  return (
    <ScreensOverlayContext.Provider value={{ hide, sync, hasPeers }}>
      <div className="absolute inset-0 z-10 flex h-screen w-screen items-center justify-center">
        <div className="relative z-20 w-80">{children}</div>
      </div>
    </ScreensOverlayContext.Provider>
  );
};

export default ScreensOverlay;
