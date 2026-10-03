"use client";

import {
  ControlSection,
  Select,
  Slider,
} from "@/components/ControlPanel";
import { useScreensOverlay } from "@/components/ScreensOverlay/ScreensOverlay.context";
import { useFxOverlay } from "./FxOverlay.store";
import { FX_BLEND_OPTIONS, FX_MODE_OPTIONS } from "./FxOverlay.types";

const INFO = {
  section:
    "Fullscreen film stack over any screen — pick a wash, blend mode, and strength.",
  mode: "Base overlay shader. off disables the stack.",
  intensity: "Overlay opacity (alpha). 0 = invisible, 1 = full wash.",
  blend: "CSS mix-blend-mode between the overlay and the scene underneath.",
} as const;

/**
 * Shared panel block — auto-mounted by ControlPanel on every ScreensOverlay screen.
 */
export function FxOverlaySection() {
  const overlay = useScreensOverlay();
  const screenId = overlay?.screenId;
  const fx = useFxOverlay(screenId ?? "__none__");

  if (!screenId) return null;

  return (
    <ControlSection label="fx overlay" info={INFO.section} defaultOpen={false}>
      <Select
        label="Overlay"
        value={fx.mode}
        options={FX_MODE_OPTIONS}
        onChange={fx.setMode}
        info={INFO.mode}
      />
      {fx.mode !== "off" ? (
        <>
          <Select
            label="Blend"
            value={fx.blend}
            options={FX_BLEND_OPTIONS}
            onChange={fx.setBlend}
            info={INFO.blend}
          />
          <Slider
            label="Intensity"
            value={fx.intensity}
            min={0}
            max={1}
            step={0.01}
            onChange={fx.setIntensity}
            format={(v) => v.toFixed(2)}
            info={INFO.intensity}
          />
        </>
      ) : null}
    </ControlSection>
  );
}
