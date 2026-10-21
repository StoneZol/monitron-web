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
import ObservanceCanvas from "./Observance.Canvas";
import useObservanceHook from "./Observance.hooks";
import {
  OBSERVANCE_RANGES,
  type CrossBaseLightMode,
  type ObservanceCameraMode,
  type ObservanceProps,
  type ReactiveChannel,
} from "./Observance.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const CAMERA_MODE_OPTIONS: {
  value: ObservanceCameraMode;
  label: string;
}[] = [
  { value: "stock", label: "stock (ahead)" },
  { value: "manual", label: "manual (X / Y)" },
  { value: "flex", label: "flex (center + scatter)" },
];

const BASE_LIGHT_OPTIONS: { value: CrossBaseLightMode; label: string }[] = [
  { value: "off", label: "off" },
  { value: "sun", label: "sun color" },
  { value: "custom", label: "custom" },
  { value: "twinkle", label: "twinkle" },
];

const INFO = {
  look: "Observance flight — black crosses and sun-tinted lightning stripes.",
  flightSpeed: "Base camera advance along the path (1 ≈ Shadertoy default).",
  cameraMode:
    "stock = Shadertoy ahead. manual = freelook X/Y. flex = Dark Terrain bank wander. Path stays fixed.",
  yaw: "Look yaw relative to flight (deg). 0 = along the path.",
  pitch: "Look pitch relative to flight (deg). 0 = along the path.",
  cameraBank:
    "Flex look cone radius. Wander stays inside a circle; bank scales how wide that circle gets.",
  crosses: "Cross markers, plant / air / bar / base lamps.",
  crossesAir: "Lift crosses off the hills by a fixed height (float in air).",
  crossesFlip: "Slide the crossbar down the stem (inverted cross). No rotation.",
  crossBaseLight:
    "Lamps on the ground in front of each cross. Off / follow sun / custom solid / own HSL twinkle. Stay down when In air.",
  crossBaseColor:
    "Idle = rest. Peak = Color-channel target. Peak locked when audio is off.",
  crossBaseTwinkle:
    "Independent HSL hue cycle for base lamps (separate from sun twinkle).",
  crossBaseTwinkleSpeed: "How fast base-lamp hue runs a full lap (1 ≈ 6s).",
  crossBaseTwinkleS: "Saturation % for base-lamp twinkle hsl().",
  crossBaseTwinkleL: "Lightness % for base-lamp twinkle hsl().",
  crossSway:
    "Stock camera path sway (1 = Shadertoy, 0 = locked, 2 = 2×). Only in stock mode.",
  sun: "Tint for the chromatic lightning stripes (idle→peak or HSL twinkle).",
  sunPalette:
    "Idle = rest. Peak = color-channel target. Hidden while sun twinkle is on; peak locked when audio is off.",
  sunTwinkle:
    "Hue cycles 0…360 in hsl(H S% L%) on stripe tint. Off: solid tint with idle→peak lerp.",
  sunTwinkleSpeed: "How fast sun hue runs a full lap (1 ≈ 6s).",
  sunTwinkleS: "Saturation % for sun twinkle hsl() (100 = full chroma).",
  sunTwinkleL: "Lightness % for sun twinkle hsl() (50 = vivid mid).",
  lightningRate:
    "Flash spawn rate (0 = off, 0.2 = default, 1 = Shadertoy cadence, 2 = 2×).",
  colorChannel:
    "Band that punches sun color (twinkle: light pulse; off: idle→peak).",
  speedChannel: "Band that sets continuous cruise flight (avg + hit sustain).",
  accelChannel: "Band that punches flight in time (kick / accel).",
  camAccelChannel:
    "Band that drives flex look rate — cruise lift + in-time kicks. Only in flex. Off = 1×.",
  colorDrive: "Color / twinkle pulse boost (0…2).",
  speedDrive: "Cruise flight strength (0…4).",
  accelDrive: "Kick / accel punch strength (0…4).",
  camAccelDrive: "Flex look clock strength (0…4). Only in flex mode.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Observance = ({ showOverlay = true }: ObservanceProps) => {
  const { liveRef, vizRef, visualizer, controls } = useObservanceHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const camStock = controls.cameraMode === "stock";
  const camFlex = controls.cameraMode === "flex";
  const camManual = controls.cameraMode === "manual";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <ObservanceCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="observance">
          <ControlPanel
            title="observance"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="crosses" info={INFO.crosses}>
                <Toggle
                  label="In air"
                  checked={controls.crossesAir}
                  onChange={controls.setCrossesAir}
                  info={INFO.crossesAir}
                />
                <Toggle
                  label="Flip bar"
                  checked={controls.crossesFlip}
                  onChange={controls.setCrossesFlip}
                  info={INFO.crossesFlip}
                />
                <Select
                  label="Base lights"
                  value={controls.crossBaseLightMode}
                  options={BASE_LIGHT_OPTIONS}
                  onChange={controls.setCrossBaseLightMode}
                  info={INFO.crossBaseLight}
                />
                {controls.crossBaseLightMode === "custom" ? (
                  <ColorTable
                    label="base lamp"
                    info={INFO.crossBaseColor}
                    columns={["idle", "peak"]}
                    lockedColumns={audioLocked ? ["peak"] : []}
                    columnStamps={audioStamp}
                    rows={[
                      {
                        label: "lamp",
                        cells: [
                          {
                            value: controls.crossBaseColor,
                            onChange: controls.setCrossBaseColor,
                          },
                          {
                            value: controls.crossBaseColorPeak,
                            onChange: controls.setCrossBaseColorPeak,
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}
                {controls.crossBaseLightMode === "twinkle" ? (
                  <TwinkleControls
                    title="base twinkle"
                    checked
                    showToggle={false}
                    speed={controls.crossBaseTwinkleSpeed}
                    onSpeedChange={controls.setCrossBaseTwinkleSpeed}
                    s={controls.crossBaseTwinkleS}
                    onSChange={controls.setCrossBaseTwinkleS}
                    l={controls.crossBaseTwinkleL}
                    onLChange={controls.setCrossBaseTwinkleL}
                    info={INFO.crossBaseTwinkle}
                    speedInfo={INFO.crossBaseTwinkleSpeed}
                    sInfo={INFO.crossBaseTwinkleS}
                    lInfo={INFO.crossBaseTwinkleL}
                  />
                ) : null}
              </ControlSubSection>

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

              <ControlSubSection label="camera" info={INFO.cameraMode}>
                <Select
                  label="Camera"
                  value={controls.cameraMode}
                  options={CAMERA_MODE_OPTIONS}
                  onChange={controls.setCameraMode}
                  info={INFO.cameraMode}
                />
                {camStock ? (
                  <Slider
                    label="Cross sway"
                    value={controls.crossSway}
                    min={OBSERVANCE_RANGES.crossSway.min}
                    max={OBSERVANCE_RANGES.crossSway.max}
                    step={OBSERVANCE_RANGES.crossSway.step}
                    onChange={controls.setCrossSway}
                    format={(v) => `×${v.toFixed(2)}`}
                    info={INFO.crossSway}
                  />
                ) : null}
                {camFlex ? (
                  <Slider
                    label="Camera bank"
                    value={controls.cameraBank}
                    min={OBSERVANCE_RANGES.cameraBank.min}
                    max={OBSERVANCE_RANGES.cameraBank.max}
                    step={OBSERVANCE_RANGES.cameraBank.step}
                    onChange={controls.setCameraBank}
                    format={(v) => `×${v.toFixed(2)}`}
                    info={INFO.cameraBank}
                  />
                ) : null}
                {camManual ? (
                  <>
                    <Slider
                      label="X"
                      value={controls.yaw}
                      min={OBSERVANCE_RANGES.yaw.min}
                      max={OBSERVANCE_RANGES.yaw.max}
                      step={OBSERVANCE_RANGES.yaw.step}
                      onChange={controls.setYaw}
                      format={(v) => `${v.toFixed(1)}°`}
                      info={INFO.yaw}
                    />
                    <Slider
                      label="Y"
                      value={controls.pitch}
                      min={OBSERVANCE_RANGES.pitch.min}
                      max={OBSERVANCE_RANGES.pitch.max}
                      step={OBSERVANCE_RANGES.pitch.step}
                      onChange={controls.setPitch}
                      format={(v) => `${v.toFixed(1)}°`}
                      info={INFO.pitch}
                    />
                  </>
                ) : null}
              </ControlSubSection>

              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Slider
                  label="Flight speed"
                  value={controls.flightSpeed}
                  min={OBSERVANCE_RANGES.flightSpeed.min}
                  max={OBSERVANCE_RANGES.flightSpeed.max}
                  step={OBSERVANCE_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="Lightning"
                  value={controls.lightningRate}
                  min={OBSERVANCE_RANGES.lightningRate.min}
                  max={OBSERVANCE_RANGES.lightningRate.max}
                  step={OBSERVANCE_RANGES.lightningRate.step}
                  onChange={controls.setLightningRate}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.lightningRate}
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
                    {camFlex ? (
                      <Select
                        label="Cam accel"
                        value={controls.camAccelChannel}
                        options={REACTIVE_CHANNEL_OPTIONS}
                        onChange={controls.setCamAccelChannel}
                        info={INFO.camAccelChannel}
                      />
                    ) : null}
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={OBSERVANCE_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={OBSERVANCE_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={OBSERVANCE_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={OBSERVANCE_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Accel"
                      value={controls.accelDrive}
                      min={OBSERVANCE_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={OBSERVANCE_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.accelDrive}
                    />
                    {camFlex ? (
                      <Slider
                        label="Cam accel"
                        value={controls.camAccelDrive}
                        min={OBSERVANCE_RANGES.camAccelDrive.min}
                        max={controls.camAccelDriveMax}
                        step={OBSERVANCE_RANGES.camAccelDrive.step}
                        onChange={controls.setCamAccelDrive}
                        format={(v) => `×${v.toFixed(1)}`}
                        info={INFO.camAccelDrive}
                      />
                    ) : null}
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

export default Observance;
