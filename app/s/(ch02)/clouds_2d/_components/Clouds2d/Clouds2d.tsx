"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { FxOverlaySection } from "@/components/FxOverlay";
import {
  ControlPanel,
  ControlSection,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import Clouds2dCanvas from "./Clouds2d.Canvas";
import useClouds2dHook from "./Clouds2d.hooks";
import {
  CLOUDS2D_RANGES,
  formatHourLabel,
  type Clouds2dProps,
} from "./Clouds2d.types";

const INFO = {
  look: "2D Clouds (drift) — soft FBM sky. Not audio-reactive. Stars at night.",
  flightSpeed: "Cloud drift. 1 ≈ Shadertoy speed (0.03).",
  cover: "Cloud density / cover. Stock ≈ 0.2; raise for a socked-in sky.",
  overcast: "Gray wash on sky + clouds. Dims stars too.",
  hour: "Clock hour 0–23. Noon (12) ≈ stock sky. Dawn ~6, dusk ~18.",
  syncDeviceTime:
    "Lock the sky to this device’s local clock. Hour slider unlocks when off.",
} as const;

const Clouds2d = ({ showOverlay = true }: Clouds2dProps) => {
  const { liveRef, controls } = useClouds2dHook();

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
              <Slider
                label="overcast"
                value={controls.overcast}
                min={CLOUDS2D_RANGES.overcast.min}
                max={CLOUDS2D_RANGES.overcast.max}
                step={CLOUDS2D_RANGES.overcast.step}
                onChange={controls.setOvercast}
                info={INFO.overcast}
              />
              <Toggle
                label="sync device time"
                checked={controls.syncDeviceTime}
                onChange={controls.setSyncDeviceTime}
                info={INFO.syncDeviceTime}
              />
              <Slider
                label="hour"
                value={Math.min(
                  CLOUDS2D_RANGES.hour.max,
                  Math.floor(controls.hour),
                )}
                min={CLOUDS2D_RANGES.hour.min}
                max={CLOUDS2D_RANGES.hour.max}
                step={CLOUDS2D_RANGES.hour.step}
                onChange={controls.setHour}
                disabled={controls.syncDeviceTime}
                format={(h) => formatHourLabel(controls.syncDeviceTime ? controls.hour : h)}
                info={INFO.hour}
              />
            </ControlSection>
            <FxOverlaySection />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Clouds2d;
