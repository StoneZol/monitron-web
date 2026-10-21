"use client";

import useScreensOverlayHook from "./ScreensOverlay.hooks";
import { ScreensOverlayContext } from "./ScreensOverlay.context";
import type { ScreensOverlayProps } from "./ScreensOverlay.types";
import { FxOverlayLayer } from "@/components/FxOverlay";

/**
 * HUD shell for every saver. Hide / cross-tab sync (prefs + session media)
 * live here — screens only pass screenId and render ControlPanel.
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
      <div className="absolute inset-0 z-10 flex h-dvh w-full items-center justify-center p-2 sm:p-4">
        {/* 1 col · 2 @ md · 3 subsection chips @ lg (15.5rem × 3) */}
        <div className="relative z-20 w-full max-w-[min(100%,22rem)] md:max-w-[min(100%,34rem)] lg:max-w-[min(100%,50rem)]">
          {children}
        </div>
      </div>
    </ScreensOverlayContext.Provider>
  );
};

export default ScreensOverlay;
