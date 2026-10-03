"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorField,
  ControlPanel,
  ControlSection,
  PanelButton,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import HexacoreCanvas from "./Hexacore.Canvas";
import useHexacoreHook from "./Hexacore.hooks";
import { HEXACORE_RANGES, type HexacoreProps } from "./Hexacore.types";

const INFO = {
  look: "Flight through the hexagonal hive — tint and energy pulse.",
  flightSpeed: "Camera advance along the tunnel (1 ≈ Shadertoy default).",
  color: "Tint for crystal and energy palettes.",
  garland: "Racing energy pulse down the tunnel. Off keeps hex edges lit in the picked color.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Hexacore = ({ showOverlay = true }: HexacoreProps) => {
  const { liveRef, visualizer, controls } = useHexacoreHook();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <HexacoreCanvas liveRef={liveRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="hexacore">
          <ControlPanel
            title="hexacore"
            actions={
              <div className="flex gap-2">
                <NavBackButton className="min-w-0 flex-1" />
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
              <Slider
                label="Flight speed"
                value={controls.flightSpeed}
                min={HEXACORE_RANGES.flightSpeed.min}
                max={HEXACORE_RANGES.flightSpeed.max}
                step={HEXACORE_RANGES.flightSpeed.step}
                onChange={controls.setFlightSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.flightSpeed}
              />
              <Toggle
                label="Garland"
                checked={controls.garland}
                onChange={controls.setGarland}
                info={INFO.garland}
              />
              <ColorField
                label="Color"
                value={controls.color}
                onChange={controls.setColor}
                info={INFO.color}
              />
            </ControlSection>

            <VisualizerSection
              visualizer={visualizer}
              info={INFO.visualizer}
            />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Hexacore;
