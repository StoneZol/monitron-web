"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorTable,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  Select,
  Slider,
  TwinkleControls,
} from "@/components/ControlPanel";
import DarkterrainCanvas from "./Darkterrain.Canvas";
import useDarkterrainHook from "./Darkterrain.hooks";
import {
  DARKTERRAIN_RANGES,
  type DarkterrainProps,
  type ReactiveChannel,
} from "./Darkterrain.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
  look: "Dark Terrain flight — soft hills, flex look, sun-tinted lightning.",
  misc: "Flight speed, lightning rate, and flex look bank.",
  flightSpeed: "Base camera advance along the path (1 ≈ Shadertoy default).",
  cameraBank:
    "Coral-style flex look cone (0 = dead ahead, 1 = default wander).",
  sun: "Tint for the chromatic lightning stripes (idle→peak or HSL twinkle).",
  sunPalette:
    "Idle = rest. Peak = color-channel target. Hidden while sun twinkle is on; peak locked when audio is off.",
  sunTwinkle:
    "Hue cycles 0…360 in hsl(H S% L%) on stripe tint. Off: solid tint with idle→peak lerp.",
  sunTwinkleSpeed: "How fast sun hue runs a full lap (1 ≈ 6s).",
  sunTwinkleS: "Saturation % for sun twinkle hsl() (100 = full chroma).",
  sunTwinkleL: "Lightness % for sun twinkle hsl() (50 = vivid mid).",
  lightningRate:
    "Flash spawn rate (0 = off, 0.2 = default, 1 = stock cadence, 2 = 2×).",
  colorChannel:
    "Band that punches sun color (twinkle: light pulse; off: idle→peak).",
  speedChannel: "Band that sets continuous cruise flight (avg + hit sustain).",
  accelChannel: "Band that punches flight in time (kick / accel).",
  camAccelChannel:
    "Band that scales camera bank animation rate (cruise only). Off = 1×.",
  colorDrive: "Color / twinkle pulse boost (0…2).",
  speedDrive: "Cruise flight strength (0…4).",
  accelDrive: "Kick / accel punch strength (0…4).",
  camAccelDrive: "Camera bank animation rate strength (0…4).",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Darkterrain = ({ showOverlay = true }: DarkterrainProps) => {
  const { liveRef, vizRef, visualizer, controls } = useDarkterrainHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <DarkterrainCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="dark_terrain">
          <ControlPanel
            title="dark terrain"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="sun" info={INFO.sun}>
                <TwinkleControls
                  title="sun twinkle"
                  checked={controls.sunTwinkle}
                  onCheckedChange={controls.setSunTwinkle}
                  speed={controls.sunTwinkleSpeed}
                  onSpeedChange={controls.setSunTwinkleSpeed}
                  s={controls.sunTwinkleS}
                  onSChange={controls.setSunTwinkleS}
                  l={controls.sunTwinkleL}
                  onLChange={controls.setSunTwinkleL}
                  info={INFO.sunTwinkle}
                  speedInfo={INFO.sunTwinkleSpeed}
                  sInfo={INFO.sunTwinkleS}
                  lInfo={INFO.sunTwinkleL}
                />
                {!controls.sunTwinkle ? (
                  <ColorTable
                    label="sun palette"
                    info={INFO.sunPalette}
                    columns={["idle", "peak"]}
                    lockedColumns={audioLocked ? ["peak"] : []}
                    columnStamps={audioStamp}
                    rows={[
                      {
                        label: "sun",
                        cells: [
                          {
                            value: controls.sunColor,
                            onChange: controls.setSunColor,
                          },
                          {
                            value: controls.sunColorPeak,
                            onChange: controls.setSunColorPeak,
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}
              </ControlSubSection>

              <ControlSubSection label="misc" info={INFO.misc}>
                <Slider
                  label="Camera bank"
                  value={controls.cameraBank}
                  min={DARKTERRAIN_RANGES.cameraBank.min}
                  max={DARKTERRAIN_RANGES.cameraBank.max}
                  step={DARKTERRAIN_RANGES.cameraBank.step}
                  onChange={controls.setCameraBank}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.cameraBank}
                />
                <Slider
                  label="Flight speed"
                  value={controls.flightSpeed}
                  min={DARKTERRAIN_RANGES.flightSpeed.min}
                  max={DARKTERRAIN_RANGES.flightSpeed.max}
                  step={DARKTERRAIN_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="Lightning"
                  value={controls.lightningRate}
                  min={DARKTERRAIN_RANGES.lightningRate.min}
                  max={DARKTERRAIN_RANGES.lightningRate.max}
                  step={DARKTERRAIN_RANGES.lightningRate.step}
                  onChange={controls.setLightningRate}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.lightningRate}
                />
              </ControlSubSection>
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
                    <Select
                      label="Accel"
                      value={controls.accelChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setAccelChannel}
                      info={INFO.accelChannel}
                    />
                    <Select
                      label="Cam accel"
                      value={controls.camAccelChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setCamAccelChannel}
                      info={INFO.camAccelChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={DARKTERRAIN_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={DARKTERRAIN_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={DARKTERRAIN_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={DARKTERRAIN_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Accel"
                      value={controls.accelDrive}
                      min={DARKTERRAIN_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={DARKTERRAIN_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.accelDrive}
                    />
                    <Slider
                      label="Cam accel"
                      value={controls.camAccelDrive}
                      min={DARKTERRAIN_RANGES.camAccelDrive.min}
                      max={controls.camAccelDriveMax}
                      step={DARKTERRAIN_RANGES.camAccelDrive.step}
                      onChange={controls.setCamAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.camAccelDrive}
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

export default Darkterrain;
