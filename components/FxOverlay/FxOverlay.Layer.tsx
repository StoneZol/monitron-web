"use client";

import { useFxOverlay } from "./FxOverlay.store";

type FxOverlayLayerProps = {
  screenId: string;
};

/**
 * Fullscreen film stack over the scene canvas, under the HUD.
 * v1: B&W = black wash × intensity × mix-blend-mode.
 */
export function FxOverlayLayer({ screenId }: FxOverlayLayerProps) {
  const fx = useFxOverlay(screenId);

  if (fx.mode === "off" || fx.intensity <= 0.001) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        backgroundColor: "#000000",
        opacity: fx.intensity,
        mixBlendMode: fx.blend,
      }}
    />
  );
}
