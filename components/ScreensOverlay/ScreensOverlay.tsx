"use client";

import useScreensOverlayHook from "./ScreensOverlay.hooks";
import { ScreensOverlayContext } from "./ScreensOverlay.context";
import type { ScreensOverlayProps } from "./ScreensOverlay.types";

/**
 * HUD shell. Hide lives in ControlPanel title row; tap empty screen to wake.
 * Back / reset / fullscreen live in ControlPanel.actions (fixed under the title).
 * HUD hidden state is persisted per screenId in localStorage.
 */
const ScreensOverlay = ({ screenId, children }: ScreensOverlayProps) => {
  const { ready, hideHud, hide, show } = useScreensOverlayHook(screenId);

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
    <ScreensOverlayContext.Provider value={{ hide }}>
      <div className="absolute inset-0 z-10 flex h-screen w-screen items-center justify-center">
        <div className="relative z-20 w-80">{children}</div>
      </div>
    </ScreensOverlayContext.Provider>
  );
};

export default ScreensOverlay;
