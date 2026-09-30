"use client";

import { cn } from "@/lib/utils";
import useScreensOverlayHook from "./ScreensOverlay.hooks";
import type { ScreensOverlayProps } from "./ScreensOverlay.types";

/**
 * Idle-fade HUD shell. Back / reset / fullscreen live in ControlPanel.actions
 * (fixed under the title) so they stay visible while knobs scroll.
 */
const ScreensOverlay = ({ children }: ScreensOverlayProps) => {
  const { hideHud } = useScreensOverlayHook();

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex h-screen w-screen items-center justify-center",
        hideHud && "pointer-events-none opacity-0",
      )}
      aria-hidden={hideHud}
    >
      <div className="relative z-20 w-80">{children}</div>
    </div>
  );
};

export default ScreensOverlay;
