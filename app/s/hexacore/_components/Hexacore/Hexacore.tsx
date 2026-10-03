"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorTable,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  PanelButton,
  Select,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import HexacoreCanvas from "./Hexacore.Canvas";
import useHexacoreHook from "./Hexacore.hooks";
import {
  HEXACORE_RANGES,
  type HexacoreProps,
  type ReactiveChannel,
} from "./Hexacore.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
  look: "Flight through the hexagonal hive — tint and iridescent garland.",
  flightSpeed: "Base camera advance along the tunnel (1 ≈ Shadertoy default).",
  color: "Base tint while garland is on (audio hue-walks / punches it).",
  colorPalette:
    "Idle = rest. Peak = color-channel target. Locked while garland is on or audio is off.",
  garland:
    "Realtime iridescent emit on the hex circuitry. Off: solid edge tint with idle→peak lerp.",
  garlandSpeed: "How fast the garland palette and twinkle cycle (1 ≈ default).",
  saturation: "Look chroma — crystals, garland, and solid emit (0 = gray, 1 = default).",
  colorChannel: "Band that punches color (garland: hue/brightness; off: idle→peak).",
  speedChannel: "Band that punches flight speed.",
  colorDrive: "Color punch strength.",
  speedDrive: "Speed punch strength.",
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
  const { liveRef, vizRef, visualizer, controls } = useHexacoreHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <HexacoreCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="hexacore">
          <ControlPanel
            title="hexacore"
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
              {controls.garland ? (
                <Slider
                  label="Garland speed"
                  value={controls.garlandSpeed}
                  min={HEXACORE_RANGES.garlandSpeed.min}
                  max={HEXACORE_RANGES.garlandSpeed.max}
                  step={HEXACORE_RANGES.garlandSpeed.step}
                  onChange={controls.setGarlandSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.garlandSpeed}
                />
              ) : null}
              <Slider
                label="Saturation"
                value={controls.saturation}
                min={HEXACORE_RANGES.saturation.min}
                max={HEXACORE_RANGES.saturation.max}
                step={HEXACORE_RANGES.saturation.step}
                onChange={controls.setSaturation}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.saturation}
              />
              <ColorTable
                label="color palette"
                info={INFO.colorPalette}
                columns={["idle", "peak"]}
                lockedColumns={
                  audioLocked || controls.garland ? ["peak"] : []
                }
                columnStamps={
                  controls.garland
                    ? { peak: "garland" }
                    : audioStamp
                }
                rows={[
                  {
                    label: "tint",
                    cells: [
                      {
                        value: controls.color,
                        onChange: controls.setColor,
                      },
                      {
                        value: controls.colorPeak,
                        onChange: controls.setColorPeak,
                      },
                    ],
                  },
                ]}
              />
            </ControlSection>

            <VisualizerSection
              visualizer={visualizer}
              info={INFO.visualizer}
            >
              {visualizer.reactive ? (
                <>
                  <ControlSubSection label="channels">
                    <Select
                      label="Color"
                      value={controls.colorChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setColorChannel}
                      info={INFO.colorChannel}
                    />
                    <Select
                      label="Speed"
                      value={controls.speedChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setSpeedChannel}
                      info={INFO.speedChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={HEXACORE_RANGES.drive.min}
                      max={controls.driveMax}
                      step={HEXACORE_RANGES.drive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={HEXACORE_RANGES.drive.min}
                      max={controls.driveMax}
                      step={HEXACORE_RANGES.drive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                  </ControlSubSection>
                </>
              ) : null}
            </VisualizerSection>
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Hexacore;
