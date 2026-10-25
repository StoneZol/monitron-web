"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { FxOverlaySection } from "@/components/FxOverlay";
import {
  ControlPanel,
  ControlSection,
  ControlSubSection,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import Clouds2dCanvas from "./Clouds2d.Canvas";
import useClouds2dHook from "./Clouds2d.hooks";
import {
  CLOUDS2D_RANGES,
  formatHourLabel,
  snapHourQuarter,
  type Clouds2dProps,
} from "./Clouds2d.types";

const INFO = {
  look: "2D Clouds (drift) — soft FBM sky. Not audio-reactive. Stars at night (behind clouds).",
  flightSpeed: "Cloud drift. 1 ≈ Shadertoy speed (0.03).",
  cover: "Cloud density / cover. Stock ≈ 0.2; raise for a socked-in sky.",
  hour:
    "Clock in 15-min steps. Sunrise 05–07, clean day 07–16, sunset 16–18. Noon (12) ≈ stock.",
  syncDeviceTime:
    "Lock the sky to this device’s local clock. Hour slider unlocks when off.",
} as const;

const Clouds2d = ({ showOverlay = true }: Clouds2dProps) => {
  const { liveRef, controls } = useClouds2dHook();
  const hourSlider = controls.syncDeviceTime
    ? snapHourQuarter(controls.hour)
    : controls.hour;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <Clouds2dCanvas liveRef={liveRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="clouds_2d">
          <ControlPanel
            title="2d clouds"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="time" info={INFO.syncDeviceTime}>
                <Toggle
                  label="sync device time"
                  checked={controls.syncDeviceTime}
                  onChange={controls.setSyncDeviceTime}
                  info={INFO.syncDeviceTime}
                />
                <Slider
                  label="hour"
                  value={hourSlider}
                  min={CLOUDS2D_RANGES.hour.min}
                  max={CLOUDS2D_RANGES.hour.max}
                  step={CLOUDS2D_RANGES.hour.step}
                  onChange={controls.setHour}
                  disabled={controls.syncDeviceTime}
                  format={() =>
                    formatHourLabel(
                      controls.syncDeviceTime ? controls.hour : hourSlider,
                    )
                  }
                  info={INFO.hour}
                />
              </ControlSubSection>
              <ControlSubSection label="clouds" info={INFO.look}>
                <Slider
                  label="speed"
                  value={controls.flightSpeed}
                  min={CLOUDS2D_RANGES.flightSpeed.min}
                  max={CLOUDS2D_RANGES.flightSpeed.max}
                  step={CLOUDS2D_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="density"
                  value={controls.cover}
                  min={CLOUDS2D_RANGES.cover.min}
                  max={CLOUDS2D_RANGES.cover.max}
                  step={CLOUDS2D_RANGES.cover.step}
                  onChange={controls.setCover}
                  info={INFO.cover}
                />
              </ControlSubSection>
            </ControlSection>
            <FxOverlaySection />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Clouds2d;
