"use client";

import { useEffect, useRef } from "react";
import { applyFxMode, clearAllFxModes, getFxModeMod } from "./overlaysMods";
import { FxGlPass, findSceneCanvas } from "./FxOverlay.GlPass";
import { useFxOverlay } from "./FxOverlay.store";

type FxOverlayLayerProps = {
  screenId: string;
};

/**
 * Orchestrates overlay mods from `overlaysMods/` + optional blend wash.
 * CSS mods (B&W) mutate scene canvas filters; shader mods run a GL pass.
 */
export function FxOverlayLayer({ screenId }: FxOverlayLayerProps) {
  const fx = useFxOverlay(screenId);
  const markerRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<FxGlPass | null>(null);
  const fxRef = useRef(fx);
  fxRef.current = fx;

  // Mode mount: CSS observer or shader pass
  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;

    const mod = getFxModeMod(fx.mode);

    if (!mod || mod.kind !== "shader" || !mod.fragmentShader) {
      if (passRef.current) {
        passRef.current.dispose();
        passRef.current = null;
      }

      const paintCss = () => {
        const live = fxRef.current;
        applyFxMode(live.mode, {
          root,
          intensity: live.intensity,
          contrast: live.contrast,
          speed: live.speed,
          particles: live.particles,
        });
      };
      paintCss();
      const mo = new MutationObserver(paintCss);
      mo.observe(root, { childList: true, subtree: true });
      return () => {
        mo.disconnect();
        clearAllFxModes(root);
      };
    }

    clearAllFxModes(root);
    let pass = passRef.current;
    if (!pass) {
      pass = new FxGlPass(mod.fragmentShader);
      passRef.current = pass;
    } else {
      pass.setFragmentShader(mod.fragmentShader);
    }
    pass.mount(root);
    const live = fxRef.current;
    pass.setUniforms({
      intensity: live.intensity,
      speed: live.speed,
      particles: live.particles,
    });
    pass.start(() => findSceneCanvas(root));

    return () => {
      pass?.stop();
    };
  }, [fx.mode, screenId]);

  // Live knobs
  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;
    const mod = getFxModeMod(fx.mode);
    if (!mod) return;

    if (mod.kind === "shader") {
      passRef.current?.setUniforms({
        intensity: fx.intensity,
        speed: fx.speed,
        particles: fx.particles,
      });
      return;
    }

    applyFxMode(fx.mode, {
      root,
      intensity: fx.intensity,
      contrast: fx.contrast,
      speed: fx.speed,
      particles: fx.particles,
    });
  }, [fx.mode, fx.intensity, fx.contrast, fx.speed, fx.particles]);

  useEffect(
    () => () => {
      passRef.current?.dispose();
      passRef.current = null;
    },
    [],
  );

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
