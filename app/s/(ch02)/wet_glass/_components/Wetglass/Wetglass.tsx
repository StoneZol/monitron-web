"use client";

import { useSyncExternalStore } from "react";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import { FxOverlaySection } from "@/components/FxOverlay";
import {
  ControlCluster,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  DurationField,
  MediaField,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import { usePluginPresent } from "@/hooks/usePluginPresent";
import { STOCK_PLACEHOLDERS } from "@/lib/stockPlaceholders";
import {
  getBgCropAxis,
  subscribeBgCropAxis,
} from "./Wetglass.bgCrop";
import WetglassCanvas from "./Wetglass.Canvas";
import useWetglassHook from "./Wetglass.hooks";
import { WETGLASS_RANGES, type WetglassProps } from "./Wetglass.types";

const INFO = {
  look: "Wet glass - rain streaks, fog, still background. Ref: BigWings Heartfelt (CC BY-NC-SA 3.0). Raise Render scale for sharper drops.",
  rainAmount: "How heavy the rain is (static drops + layers).",
  dropSpeed: "How fast drops fall / trails advance.",
  glass: "Glass fog - 0 = clear, 1 = opaque frosted blur.",
  lightning: "Occasional lightning flash intensity.",
  background:
    "Stock stills, URL library, local stills (session, up to 20), or one session video (max ~80 MB). Video turns off slideshow / track change; Sync can push the clip to peer tabs.",
  bgAlignX:
    "Horizontal crop anchor (cover is cropping left/right). 0 = left, 0.5 = center, 1 = right.",
  bgAlignY:
    "Vertical crop anchor (cover is cropping top/bottom). 0 = top, 0.5 = center, 1 = bottom.",
  slideshow:
    "Cycle still backgrounds on a timer from the pool. Turns off On track change. Disabled while a video bg is active. Timer pauses while other wet glass tabs are open - use Sync to match them.",
  trackChange:
    "Next still when the plugin tab title changes. Turns off Slideshow. Disabled while a video bg is active. Needs plugin capture on a music tab.",
  poolStock: "Include built-in stock stills in the pool.",
  poolLibrary: "Include shared URL library entries in the pool.",
  poolSession: "Include session-only local uploads in the pool.",
  slideshowInterval:
    "Seconds between slides (MM:SS) - slideshow only. Pauses while other wet glass tabs are open - use Sync to match them.",
} as const;

const Wetglass = ({ showOverlay = true }: WetglassProps) => {
  const { liveRef, controls } = useWetglassHook();
  const pluginPresent = usePluginPresent();
  const cropAxis = useSyncExternalStore(
    subscribeBgCropAxis,
    getBgCropAxis,
    () => "none" as const,
  );
  const trackChangeUi = pluginPresent;
  const videoBg = controls.mediaValue.kind === "video";
  const showPool =
    !videoBg &&
    (controls.slideshow || (controls.trackChange && trackChangeUi));

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <WetglassCanvas liveRef={liveRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="wet_glass">
          <ControlPanel
            title="wet glass"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="background" info={INFO.background}>
                <MediaField
                  label="Background"
                  value={controls.mediaValue}
                  onChange={controls.setMedia}
                  stocks={STOCK_PLACEHOLDERS}
                  info={INFO.background}
                  enableVideo
                />
                {!videoBg ? (
                  <Toggle
                    label="Slideshow"
                    checked={controls.slideshow}
                    onChange={controls.setSlideshow}
                    info={INFO.slideshow}
                  />
                ) : null}
                {!videoBg && trackChangeUi ? (
                  <Toggle
                    label="On track change"
                    checked={controls.trackChange}
                    onChange={controls.setTrackChange}
                    info={INFO.trackChange}
                  />
                ) : null}
                {showPool ? (
                  <>
                    <Toggle
                      label="Pool · stock"
                      checked={controls.slideshowStock}
                      onChange={controls.setSlideshowStock}
                      info={INFO.poolStock}
                    />
                    <Toggle
                      label="Pool · urls"
                      checked={controls.slideshowLibrary}
                      onChange={controls.setSlideshowLibrary}
                      info={INFO.poolLibrary}
                    />
                    <Toggle
                      label="Pool · local"
                      checked={controls.slideshowSession}
                      onChange={controls.setSlideshowSession}
                      info={INFO.poolSession}
                    />
                  </>
                ) : null}
                {controls.slideshow ? (
                  <DurationField
                    label="Interval"
                    value={controls.slideshowIntervalSec}
                    min={WETGLASS_RANGES.slideshowIntervalSec.min}
                    max={WETGLASS_RANGES.slideshowIntervalSec.max}
                    step={WETGLASS_RANGES.slideshowIntervalSec.step}
                    coarseStep={
                      WETGLASS_RANGES.slideshowIntervalSec.coarseStep
                    }
                    onChange={controls.setSlideshowIntervalSec}
                    aside={
                      controls.slideshowRemainSec != null
                        ? `${controls.slideshowRemainSec}s`
                        : undefined
                    }
                    info={INFO.slideshowInterval}
                  />
                ) : null}
                {cropAxis === "x" ? (
                  <Slider
                    label="Align X"
                    value={controls.bgAlignX}
                    min={WETGLASS_RANGES.bgAlignX.min}
                    max={WETGLASS_RANGES.bgAlignX.max}
                    step={WETGLASS_RANGES.bgAlignX.step}
                    onChange={controls.setBgAlignX}
                    format={(v) =>
                      v <= 0.02 ? "left" : v >= 0.98 ? "right" : v.toFixed(2)
                    }
                    info={INFO.bgAlignX}
                  />
                ) : null}
                {cropAxis === "y" ? (
                  <Slider
                    label="Align Y"
                    value={controls.bgAlignY}
                    min={WETGLASS_RANGES.bgAlignY.min}
                    max={WETGLASS_RANGES.bgAlignY.max}
                    step={WETGLASS_RANGES.bgAlignY.step}
                    onChange={controls.setBgAlignY}
                    format={(v) =>
                      v <= 0.02 ? "top" : v >= 0.98 ? "bottom" : v.toFixed(2)
                    }
                    info={INFO.bgAlignY}
                  />
                ) : null}
              </ControlSubSection>

              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Slider
                  label="Rain"
                  value={controls.rainAmount}
                  min={WETGLASS_RANGES.rainAmount.min}
                  max={WETGLASS_RANGES.rainAmount.max}
                  step={WETGLASS_RANGES.rainAmount.step}
                  onChange={controls.setRainAmount}
                  format={(v) => v.toFixed(2)}
                  info={INFO.rainAmount}
                />
                <Slider
                  label="Drop speed"
                  value={controls.dropSpeed}
                  min={WETGLASS_RANGES.dropSpeed.min}
                  max={WETGLASS_RANGES.dropSpeed.max}
                  step={WETGLASS_RANGES.dropSpeed.step}
                  onChange={controls.setDropSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.dropSpeed}
                />
                <Slider
                  label="Glass"
                  value={controls.glass}
                  min={WETGLASS_RANGES.glass.min}
                  max={WETGLASS_RANGES.glass.max}
                  step={WETGLASS_RANGES.glass.step}
                  onChange={controls.setGlass}
                  format={(v) => v.toFixed(2)}
                  info={INFO.glass}
                />
                <Slider
                  label="Lightning"
                  value={controls.lightning}
                  min={WETGLASS_RANGES.lightning.min}
                  max={WETGLASS_RANGES.lightning.max}
                  step={WETGLASS_RANGES.lightning.step}
                  onChange={controls.setLightning}
                  format={(v) => v.toFixed(2)}
                  info={INFO.lightning}
                />
              </ControlCluster>
            </ControlSection>

            <FxOverlaySection />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Wetglass;
