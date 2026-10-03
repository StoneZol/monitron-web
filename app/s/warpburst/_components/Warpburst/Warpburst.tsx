"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
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
import WarpburstCanvas from "./Warpburst.Canvas";
import useWarpburstHook from "./Warpburst.hooks";
import {
  WARPBURST_RANGES,
  type WarpburstProps,
  type ReactiveChannel,
} from "./Warpburst.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
  look: "Goo tunnel fog from Warpburst 2 — no stars. Tint, garland crawl, peak flicker.",
  flightSpeed: "Base tunnel advance (1 ≈ Shadertoy BASE_SPEED).",
  cameraBank:
    "Camera roll / pitch / yaw / sway spread — 0 = dead straight, 1 = default, 2 = double.",
  colorPalette:
    "Idle = base goo. Peak = neon highlight. Locked while garland is on or audio is off.",
  garland:
    "Realtime iridescent fog crawl. Off: solid idle→peak lerp on punches.",
  garlandSpeed: "How fast the fog palette crawls (1 ≈ default).",
  saturation: "Look chroma (0 = gray, 1 = default).",
  fogDetail: "Fog structure — low = soft blobs, high = micro-filaments (1 ≈ default, 4 = max).",
  colorChannel:
    "Band that punches color + peak twinkle (garland: hue; off: idle→peak).",
  speedChannel: "Band that punches flight speed.",
  colorDrive: "Color / twinkle punch strength.",
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

const Warpburst = ({ showOverlay = true }: WarpburstProps) => {
  const { liveRef, vizRef, visualizer, controls } = useWarpburstHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <WarpburstCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="warpburst">
          <ControlPanel
            title="warpburst"
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
                min={WARPBURST_RANGES.flightSpeed.min}
                max={WARPBURST_RANGES.flightSpeed.max}
                step={WARPBURST_RANGES.flightSpeed.step}
                onChange={controls.setFlightSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.flightSpeed}
              />
              <Slider
                label="Camera bank"
                value={controls.cameraBank}
                min={WARPBURST_RANGES.cameraBank.min}
                max={WARPBURST_RANGES.cameraBank.max}
                step={WARPBURST_RANGES.cameraBank.step}
                onChange={controls.setCameraBank}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.cameraBank}
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
                  min={WARPBURST_RANGES.garlandSpeed.min}
                  max={WARPBURST_RANGES.garlandSpeed.max}
                  step={WARPBURST_RANGES.garlandSpeed.step}
                  onChange={controls.setGarlandSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.garlandSpeed}
                />
              ) : null}
              <Slider
                label="Saturation"
                value={controls.saturation}
                min={WARPBURST_RANGES.saturation.min}
                max={WARPBURST_RANGES.saturation.max}
                step={WARPBURST_RANGES.saturation.step}
                onChange={controls.setSaturation}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.saturation}
              />
              <Slider
                label="Fog detail"
                value={controls.fogDetail}
                min={WARPBURST_RANGES.fogDetail.min}
                max={WARPBURST_RANGES.fogDetail.max}
                step={WARPBURST_RANGES.fogDetail.step}
                onChange={controls.setFogDetail}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.fogDetail}
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
                      min={WARPBURST_RANGES.drive.min}
                      max={controls.driveMax}
                      step={WARPBURST_RANGES.drive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={WARPBURST_RANGES.drive.min}
                      max={controls.driveMax}
                      step={WARPBURST_RANGES.drive.step}
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

export default Warpburst;
