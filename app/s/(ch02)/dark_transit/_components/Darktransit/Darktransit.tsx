"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorTable,
  ControlCluster,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  Select,
  Slider,
  Toggle,
  TwinkleControls,
} from "@/components/ControlPanel";
import DarktransitCanvas from "./Darktransit.Canvas";
import useDarktransitHook from "./Darktransit.hooks";
import {
  DARKTRANSIT_RANGES,
  type DarktransitProps,
  type ReactiveChannel,
} from "./Darktransit.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
  look: "Dark Transit (diatribes) — low-tech tunnel, 28-step march, stock camera.",
  flightSpeed: "Base flight clock (1 ≈ Shadertoy iTime). Stock path unchanged.",
  cinemaBars: "Letterbox cinema bars (stock look).",
  wallPalette: "Tunnel wall glow. Idle ≈ stock soft white. Peak = audio punch.",
  wallTwinkle: "HSL walk on wall glow instead of idle/peak pickers.",
  orbPalette: "Lead orb. Idle ≈ stock blue. Peak = ice white-blue.",
  orbTwinkle: "HSL walk on the orb instead of idle/peak pickers.",
  saturation: "Look chroma (0 = gray, 1 = default).",
  wallChannel: "Band that punches wall idle→peak / twinkle.",
  orbChannel: "Band that punches orb idle→peak / twinkle.",
  speedChannel: "Band that lifts flight cruise.",
  accelChannel: "Band that kicks flight acceleration.",
  wallDrive: "Wall color punch strength.",
  orbDrive: "Orb color punch strength.",
  speedDrive: "Flight cruise strength.",
  accelDrive: "Flight kick strength.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Darktransit = ({ showOverlay = true }: DarktransitProps) => {
  const { liveRef, vizRef, visualizer, controls } = useDarktransitHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <DarktransitCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="dark_transit">
          <ControlPanel
            title="dark transit"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="walls" info={INFO.wallPalette}>
                <TwinkleControls
                  title="wall twinkle"
                  checked={controls.wallTwinkle}
                  onCheckedChange={controls.setWallTwinkle}
                  speed={controls.wallTwinkleSpeed}
                  onSpeedChange={controls.setWallTwinkleSpeed}
                  s={controls.wallTwinkleS}
                  onSChange={controls.setWallTwinkleS}
                  l={controls.wallTwinkleL}
                  onLChange={controls.setWallTwinkleL}
                  info={INFO.wallTwinkle}
                />
                {!controls.wallTwinkle ? (
                  <ColorTable
                    label="wall palette"
                    info={INFO.wallPalette}
                    columns={["idle", "peak"]}
                    lockedColumns={audioLocked ? ["peak"] : []}
                    columnStamps={audioStamp}
                    rows={[
                      {
                        label: "glow",
                        cells: [
                          {
                            value: controls.wallColor,
                            onChange: controls.setWallColor,
                          },
                          {
                            value: controls.wallColorPeak,
                            onChange: controls.setWallColorPeak,
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}
              </ControlSubSection>

              <ControlSubSection label="orb" info={INFO.orbPalette}>
                <TwinkleControls
                  title="orb twinkle"
                  checked={controls.orbTwinkle}
                  onCheckedChange={controls.setOrbTwinkle}
                  speed={controls.orbTwinkleSpeed}
                  onSpeedChange={controls.setOrbTwinkleSpeed}
                  s={controls.orbTwinkleS}
                  onSChange={controls.setOrbTwinkleS}
                  l={controls.orbTwinkleL}
                  onLChange={controls.setOrbTwinkleL}
                  info={INFO.orbTwinkle}
                />
                {!controls.orbTwinkle ? (
                  <ColorTable
                    label="orb palette"
                    info={INFO.orbPalette}
                    columns={["idle", "peak"]}
                    lockedColumns={audioLocked ? ["peak"] : []}
                    columnStamps={audioStamp}
                    rows={[
                      {
                        label: "glow",
                        cells: [
                          {
                            value: controls.orbColor,
                            onChange: controls.setOrbColor,
                          },
                          {
                            value: controls.orbColorPeak,
                            onChange: controls.setOrbColorPeak,
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}
              </ControlSubSection>

              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Slider
                  label="Flight speed"
                  value={controls.flightSpeed}
                  min={DARKTRANSIT_RANGES.flightSpeed.min}
                  max={DARKTRANSIT_RANGES.flightSpeed.max}
                  step={DARKTRANSIT_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="Saturation"
                  value={controls.saturation}
                  min={DARKTRANSIT_RANGES.saturation.min}
                  max={DARKTRANSIT_RANGES.saturation.max}
                  step={DARKTRANSIT_RANGES.saturation.step}
                  onChange={controls.setSaturation}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.saturation}
                />
                <Toggle
                  label="Cinema bars"
                  checked={controls.cinemaBars}
                  onChange={controls.setCinemaBars}
                  info={INFO.cinemaBars}
                />
              </ControlCluster>
            </ControlSection>

            <VisualizerSection
              visualizer={visualizer}
              info={INFO.visualizer}
            >
              {visualizer.reactive ? (
                <>
                  <ControlSubSection label="channels">
                    <Select
                      label="Walls"
                      value={controls.wallChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setWallChannel}
                      info={INFO.wallChannel}
                    />
                    <Select
                      label="Orb"
                      value={controls.orbChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setOrbChannel}
                      info={INFO.orbChannel}
                    />
                    <Select
                      label="Flight"
                      value={controls.speedChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setSpeedChannel}
                      info={INFO.speedChannel}
                    />
                    <Select
                      label="Flight accel"
                      value={controls.accelChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setAccelChannel}
                      info={INFO.accelChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Walls"
                      value={controls.wallDrive}
                      min={DARKTRANSIT_RANGES.wallDrive.min}
                      max={controls.colorDriveMax}
                      step={DARKTRANSIT_RANGES.wallDrive.step}
                      onChange={controls.setWallDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.wallDrive}
                    />
                    <Slider
                      label="Orb"
                      value={controls.orbDrive}
                      min={DARKTRANSIT_RANGES.orbDrive.min}
                      max={controls.colorDriveMax}
                      step={DARKTRANSIT_RANGES.orbDrive.step}
                      onChange={controls.setOrbDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.orbDrive}
                    />
                    <Slider
                      label="Flight"
                      value={controls.speedDrive}
                      min={DARKTRANSIT_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={DARKTRANSIT_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Flight accel"
                      value={controls.accelDrive}
                      min={DARKTRANSIT_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={DARKTRANSIT_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.accelDrive}
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

export default Darktransit;
