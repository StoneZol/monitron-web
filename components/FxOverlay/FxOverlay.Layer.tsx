"use client";

import { useEffect, useRef } from "react";
import { useFxOverlay } from "./FxOverlay.store";

type FxOverlayLayerProps = {
  screenId: string;
};

function clearCanvasFilters(root: HTMLElement) {
  for (const c of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    c.style.filter = "";
  }
}

function applyCanvasFilters(
  root: HTMLElement,
  grayscale: number,
  contrast: number,
) {
  const g = Math.min(1, Math.max(0, grayscale));
  const c = Math.min(2, Math.max(0.5, contrast));
  const parts: string[] = [];
  if (g > 0.001) parts.push(`grayscale(${g})`);
  if (Math.abs(c - 1) > 0.001) parts.push(`contrast(${c})`);
  const filter = parts.join(" ");
  for (const el of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    el.style.filter = filter;
  }
}

/**
 * B&W = canvas grayscale(intensity) + contrast.
 * Blend ≠ normal → optional black wash (separate wash strength — not full blackout at 1).
 */
export function FxOverlayLayer({ screenId }: FxOverlayLayerProps) {
  const fx = useFxOverlay(screenId);
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;

    const paint = () => {
      if (fx.mode === "bw") {
        applyCanvasFilters(root, fx.intensity, fx.contrast);
      } else if (fx.mode !== "off" && Math.abs(fx.contrast - 1) > 0.001) {
        applyCanvasFilters(root, 0, fx.contrast);
      } else {
        clearCanvasFilters(root);
      }
    };

    paint();
    const mo = new MutationObserver(paint);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      clearCanvasFilters(root);
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
