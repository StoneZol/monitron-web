"use client";

import { useEffect, useRef } from "react";
import { applyFxMode, clearAllFxModes } from "./overlaysMods";
import { useFxOverlay } from "./FxOverlay.store";

type FxOverlayLayerProps = {
  screenId: string;
};

/**
 * Orchestrates overlay mods — one apply/clear path for every mode (B&W, Cartoony, …).
 * Shader overlays mount inside the R3F shell so Document PiP takes them with the scene.
 */
export function FxOverlayLayer({ screenId }: FxOverlayLayerProps) {
  const fx = useFxOverlay(screenId);
  const markerRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef(fx);
  fxRef.current = fx;

  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;

    const sync = () => {
      const live = fxRef.current;
      applyFxMode(live.mode, {
        root,
        intensity: live.intensity,
        contrast: live.contrast,
        speed: live.speed,
        particles: live.particles,
      });
    };

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { childList: true, subtree: true });
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    const t0 = window.setTimeout(sync, 0);
    const t1 = window.setTimeout(sync, 100);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      mo.disconnect();
      ro.disconnect();
      clearAllFxModes(root);
    };
  }, [fx.mode, screenId]);

  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root || fx.mode === "off") return;
    applyFxMode(fx.mode, {
      root,
      intensity: fx.intensity,
      contrast: fx.contrast,
      speed: fx.speed,
      particles: fx.particles,
    });
  }, [fx.mode, fx.intensity, fx.contrast, fx.speed, fx.particles]);

  const washOn =
    fx.mode !== "off" && fx.blend !== "normal" && fx.wash > 0.001;

  return (
    <>
      <div
        ref={markerRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-5"
      />
      {washOn ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[6]"
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
