"use client";

import { useEffect, useRef } from "react";
import { applyFxMode, clearAllFxModes } from "./overlaysMods";
import { useFxOverlay } from "./FxOverlay.store";

type FxOverlayLayerProps = {
  screenId: string;
};

/**
 * Orchestrates overlay mods from `overlaysMods/` + optional blend wash.
 */
export function FxOverlayLayer({ screenId }: FxOverlayLayerProps) {
  const fx = useFxOverlay(screenId);
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;

    const paint = () => {
      applyFxMode(fx.mode, {
        root,
        intensity: fx.intensity,
        contrast: fx.contrast,
      });
    };

    paint();
    const mo = new MutationObserver(paint);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      clearAllFxModes(root);
    };
  }, [fx.mode, fx.intensity, fx.contrast, screenId]);

  const washOn =
    fx.mode !== "off" && fx.blend !== "normal" && fx.wash > 0.001;

  return (
    <>
      <div
        ref={markerRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
      />
      {washOn ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            backgroundColor: "#000000",
            opacity: fx.wash,
            mixBlendMode: fx.blend,
          }}
        />
      ) : null}
    </>
  );
}
