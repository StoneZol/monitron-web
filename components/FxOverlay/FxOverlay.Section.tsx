"use client";

import {
  ControlSection,
  Select,
  Slider,
} from "@/components/ControlPanel";
import { useScreensOverlay } from "@/components/ScreensOverlay/ScreensOverlay.context";
import { useFxOverlay } from "./FxOverlay.store";
import {
  FX_BLEND_OPTIONS,
  FX_MODE_OPTIONS,
  FX_RANGES,
} from "./FxOverlay.types";

const INFO = {
  section:
    "Film stack over any screen. B&W = grayscale; contrast punches it; blend wash is optional.",
  mode: "Base look. B&W turns the scene grayscale (like a phone editor).",
  intensity: "B&W amount: 0 = full color, 1 = full grayscale.",
  contrast: "Contrast boost on the scene (1 = unchanged).",
  blend:
    "Optional add-on mix-blend for a black wash. normal = no wash. At wash=1 the frame goes black — that’s expected for a full black layer.",
  wash: "Black wash opacity when blend ≠ normal. Keep this modest; 1 = solid black.",
} as const;

/**
 * Shared panel block — mounts just above VisualizerSection on every screen.
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
          <Slider
            label="Intensity"
            value={fx.intensity}
            min={FX_RANGES.intensity.min}
            max={FX_RANGES.intensity.max}
            step={FX_RANGES.intensity.step}
            onChange={fx.setIntensity}
            format={(v) => v.toFixed(2)}
            info={INFO.intensity}
          />
          <Slider
            label="Contrast"
            value={fx.contrast}
            min={FX_RANGES.contrast.min}
            max={FX_RANGES.contrast.max}
            step={FX_RANGES.contrast.step}
            onChange={fx.setContrast}
            format={(v) => `×${v.toFixed(2)}`}
            info={INFO.contrast}
          />
          <Select
            label="Blend (add-on)"
            value={fx.blend}
            options={FX_BLEND_OPTIONS}
            onChange={fx.setBlend}
            info={INFO.blend}
          />
          {fx.blend !== "normal" ? (
            <Slider
              label="Wash"
              value={fx.wash}
              min={FX_RANGES.wash.min}
              max={FX_RANGES.wash.max}
              step={FX_RANGES.wash.step}
              onChange={fx.setWash}
              format={(v) => v.toFixed(2)}
              info={INFO.wash}
            />
          ) : null}
        </>
      ) : null}
    </ControlSection>
  );
}
