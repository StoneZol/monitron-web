"use client";

import useScreensOverlayHook from "./ScreensOverlay.hooks";
import { ScreensOverlayContext } from "./ScreensOverlay.context";
import type { ScreensOverlayProps } from "./ScreensOverlay.types";
import { FxOverlayLayer } from "@/components/FxOverlay";

/**
 * HUD shell for every saver. Hide / cross-tab sync live here — screens only
 * pass screenId and render ControlPanel; no per-screen sync wiring.
 * Tap empty screen to wake when HUD is hidden.
 * Fx overlay layer paints over the scene on every screen.
 */
const ScreensOverlay = ({ screenId, children }: ScreensOverlayProps) => {
  const { ready, hideHud, hide, show, sync, hasPeers } =
    useScreensOverlayHook(screenId);

  // Wait for client prefs — avoids HUD flash on reload when it was hidden.
  if (!ready) return null;

  if (hideHud) {
    return (
      <>
        <FxOverlayLayer screenId={screenId} />
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
      </>
    );
  }

  return (
    <ScreensOverlayContext.Provider
      value={{ screenId, hide, sync, hasPeers }}
    >
      <FxOverlayLayer screenId={screenId} />
      <div className="absolute inset-0 z-10 flex h-screen w-screen items-center justify-center">
        <div className="relative z-20 w-80">{children}</div>
      </div>
    </ScreensOverlayContext.Provider>
  );
};

export default ScreensOverlay;
