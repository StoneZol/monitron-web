"use client";

import { useEffect, useRef } from "react";
import { getVisualPipWindow, VISUAL_PIP_CHANGE } from "@/lib/visualPip";
import { applyFxMode, clearAllFxModes } from "./overlaysMods";
import { useFxOverlay } from "./FxOverlay.store";

type FxOverlayLayerProps = {
  screenId: string;
};

function isSceneCanvasNode(node: Node): boolean {
  if (node instanceof HTMLCanvasElement) {
    return node.dataset.fxPass == null;
  }
  if (node instanceof HTMLElement) {
    return Boolean(node.querySelector("canvas:not([data-fx-pass])"));
  }
  return false;
}

/**
 * Orchestrates overlay mods — one apply/clear path for every mode (B&W, Sepia, Grain, …).
 * Shader overlays mount inside the R3F shell so Document PiP takes them too.
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

    /**
     * Document PiP adopts the R3F shell (overlay child included). Do NOT clear
     * first — that deletes the layer and a failed re-apply leaves PiP bare.
     */
    const timers: number[] = [];
    const syncAfterPip = () => {
      const run = () => sync();
      requestAnimationFrame(() => {
        run();
        timers.push(window.setTimeout(run, 50));
        timers.push(window.setTimeout(run, 200));
      });
      const pip = getVisualPipWindow();
      pip?.addEventListener("resize", run, { once: true });
    };

    sync();

    // Only react when a *scene* canvas appears — ignore fx overlay mounts.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (isSceneCanvasNode(n)) {
            sync();
            return;
          }
        }
      }
    });
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener(VISUAL_PIP_CHANGE, syncAfterPip);

    return () => {
      for (const t of timers) window.clearTimeout(t);
      window.removeEventListener(VISUAL_PIP_CHANGE, syncAfterPip);
      mo.disconnect();
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
