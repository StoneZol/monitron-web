"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import {
  ControlPanel,
  ControlSection,
  MediaField,
  PanelButton,
  Slider,
} from "@/components/ControlPanel";
import { STOCK_PLACEHOLDERS } from "@/lib/stockPlaceholders";
import HeartfeltCanvas from "./Heartfelt.Canvas";
import useHeartfeltHook from "./Heartfelt.hooks";
import { HEARTFELT_RANGES, type HeartfeltProps } from "./Heartfelt.types";

const INFO = {
  look: "Heartfelt rain on glass (BigWings) — drops, fog, background. No heart story. CC BY-NC-SA 3.0. Raise Render scale for sharper drops.",
  rainAmount: "How heavy the rain is (static drops + layers).",
  dropSpeed: "How fast drops fall / trails advance.",
  glass: "Glass fog — 0 = clear, 1 = opaque frosted blur.",
  lightning: "Occasional lightning flash intensity.",
  background:
    "Stock stills, shared URL library (max 20, tiny 67×37 previews), or local files (session only, multi-select up to 20 — cleared on refresh).",
  bgAlignX:
    "Horizontal crop anchor when the image is wider than the screen (cover). 0 = left, 0.5 = center, 1 = right.",
  bgAlignY:
    "Vertical crop anchor when the image is taller than the screen (cover). 0 = top, 0.5 = center, 1 = bottom.",
} as const;

const Heartfelt = ({ showOverlay = true }: HeartfeltProps) => {
  const { liveRef, controls } = useHeartfeltHook();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <HeartfeltCanvas liveRef={liveRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="heartfelt">
          <ControlPanel
            title="heartfelt"
            actions={
              <div className="flex gap-2">
                <PanelButton onClick={controls.reset} className="flex-1">
                  reset
                </PanelButton>
                <PanelButton
                  onClick={controls.fullscreen}
                  className="flex-1"
                >
                  fullscreen
                </PanelButton>
              </div>
            }
          >
            <ControlSection label="look" info={INFO.look}>
              <MediaField
                label="Background"
                value={controls.mediaValue}
                onChange={controls.setMedia}
                stocks={STOCK_PLACEHOLDERS}
                info={INFO.background}
              />
              <Slider
                label="Align X"
                value={controls.bgAlignX}
                min={HEARTFELT_RANGES.bgAlignX.min}
                max={HEARTFELT_RANGES.bgAlignX.max}
                step={HEARTFELT_RANGES.bgAlignX.step}
                onChange={controls.setBgAlignX}
                format={(v) =>
                  v <= 0.02 ? "left" : v >= 0.98 ? "right" : v.toFixed(2)
                }
                info={INFO.bgAlignX}
              />
              <Slider
                label="Align Y"
                value={controls.bgAlignY}
                min={HEARTFELT_RANGES.bgAlignY.min}
                max={HEARTFELT_RANGES.bgAlignY.max}
                step={HEARTFELT_RANGES.bgAlignY.step}
                onChange={controls.setBgAlignY}
                format={(v) =>
                  v <= 0.02 ? "top" : v >= 0.98 ? "bottom" : v.toFixed(2)
                }
                info={INFO.bgAlignY}
              />
              <Slider
                label="Rain"
                value={controls.rainAmount}
                min={HEARTFELT_RANGES.rainAmount.min}
                max={HEARTFELT_RANGES.rainAmount.max}
                step={HEARTFELT_RANGES.rainAmount.step}
                onChange={controls.setRainAmount}
                format={(v) => v.toFixed(2)}
                info={INFO.rainAmount}
              />
              <Slider
                label="Drop speed"
                value={controls.dropSpeed}
                min={HEARTFELT_RANGES.dropSpeed.min}
                max={HEARTFELT_RANGES.dropSpeed.max}
                step={HEARTFELT_RANGES.dropSpeed.step}
                onChange={controls.setDropSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.dropSpeed}
              />
              <Slider
                label="Glass"
                value={controls.glass}
                min={HEARTFELT_RANGES.glass.min}
                max={HEARTFELT_RANGES.glass.max}
                step={HEARTFELT_RANGES.glass.step}
                onChange={controls.setGlass}
                format={(v) => v.toFixed(2)}
                info={INFO.glass}
              />
              <Slider
                label="Lightning"
                value={controls.lightning}
                min={HEARTFELT_RANGES.lightning.min}
                max={HEARTFELT_RANGES.lightning.max}
                step={HEARTFELT_RANGES.lightning.step}
                onChange={controls.setLightning}
                format={(v) => v.toFixed(2)}
                info={INFO.lightning}
              />
            </ControlSection>
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Heartfelt;
