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
  TwinkleControls,
} from "@/components/ControlPanel";
import Blue002Canvas from "./Blue002.Canvas";
import useBlue002Hook from "./Blue002.hooks";
import {
  BLUE002_RANGES,
  type Blue002CameraMode,
  type Blue002ColorMode,
  type Blue002Props,
  type ReactiveChannel,
} from "./Blue002.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const COLOR_MODE_OPTIONS: { value: Blue002ColorMode; label: string }[] = [
  { value: "original", label: "original (idle / peak)" },
  { value: "twinkle", label: "twinkle (solid HSL)" },
];

const CAMERA_MODE_OPTIONS: { value: Blue002CameraMode; label: string }[] = [
  { value: "flex", label: "flex (center + scatter)" },
  { value: "manual", label: "manual (X / Y look)" },
];

const INFO = {
  look: "002 Blue (haquxx) — IFS tunnel glow flight.",
  flightSpeed: "Base flight clock (1 ≈ Shadertoy iTime).",
  cameraMode:
    "flex = coral-style wander (default). manual = freelook X/Y ±180°.",
  cameraBank: "Flex scatter amount (0 = locked center, 1 = default).",
  yaw: "Look X in degrees (±180).",
  pitch: "Look Y in degrees (±180).",
  colorMode:
    "original = stock blue idle → white-blue peak. twinkle = solid HSL walk.",
  colorPalette: "Idle = rest blue. Peak = light-channel white-blue target.",
  twinkle: "Solid HSL hue walk over the glow.",
  twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for the twinkle hsl().",
  twinkleL: "Lightness % for the twinkle hsl().",
  saturation: "Look chroma (0 = gray, 1 = default).",
  colorChannel: "Band that drives light — idle→peak and glow punch.",
  speedChannel: "Band that lifts flight cruise.",
  accelChannel: "Band that kicks flight acceleration.",
  camAccelChannel:
    "Band that drives flex look rate. Only in flex. Default off = 1× wander.",
  colorDrive: "Light / peak punch strength.",
  speedDrive: "Flight cruise strength.",
  accelDrive: "Flight kick strength.",
  camAccelDrive: "Flex look clock strength. Only in flex.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Blue002 = ({ showOverlay = true }: Blue002Props) => {
  const { liveRef, vizRef, visualizer, controls } = useBlue002Hook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const mode = controls.colorMode;
  const flex = controls.cameraMode === "flex";
  const manual = controls.cameraMode === "manual";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <Blue002Canvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="blue_002">
          <ControlPanel
            title="002 blue"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="color" info={INFO.colorMode}>
                <Select
                  label="Color mode"
                  value={controls.colorMode}
                  options={COLOR_MODE_OPTIONS}
                  onChange={controls.setColorMode}
                  info={INFO.colorMode}
                />
                {mode === "original" ? (
                  <ColorTable
                    label="blue palette"
                    info={INFO.colorPalette}
                    columns={["idle", "peak"]}
                    lockedColumns={audioLocked ? ["peak"] : []}
                    columnStamps={audioStamp}
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
                ) : null}
                {mode === "twinkle" ? (
                  <TwinkleControls
                    title="twinkle"
                    checked
                    showToggle={false}
                    speed={controls.twinkleSpeed}
                    onSpeedChange={controls.setTwinkleSpeed}
                    s={controls.twinkleS}
                    onSChange={controls.setTwinkleS}
                    l={controls.twinkleL}
                    onLChange={controls.setTwinkleL}
                    info={INFO.twinkle}
                    speedInfo={INFO.twinkleSpeed}
                    sInfo={INFO.twinkleS}
                    lInfo={INFO.twinkleL}
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
                {flex ? (
                  <Slider
                    label="Camera bank"
                    value={controls.cameraBank}
                    min={BLUE002_RANGES.cameraBank.min}
                    max={BLUE002_RANGES.cameraBank.max}
                    step={BLUE002_RANGES.cameraBank.step}
                    onChange={controls.setCameraBank}
                    format={(v) => `×${v.toFixed(2)}`}
                    info={INFO.cameraBank}
                  />
                ) : null}
                {manual ? (
                  <>
                    <Slider
                      label="X"
                      value={controls.yaw}
                      min={BLUE002_RANGES.yaw.min}
                      max={BLUE002_RANGES.yaw.max}
                      step={BLUE002_RANGES.yaw.step}
                      onChange={controls.setYaw}
                      format={(v) => `${v.toFixed(0)}°`}
                      info={INFO.yaw}
                    />
                    <Slider
                      label="Y"
                      value={controls.pitch}
                      min={BLUE002_RANGES.pitch.min}
                      max={BLUE002_RANGES.pitch.max}
                      step={BLUE002_RANGES.pitch.step}
                      onChange={controls.setPitch}
                      format={(v) => `${v.toFixed(0)}°`}
                      info={INFO.pitch}
                    />
                  </>
                ) : null}
              </ControlSubSection>

              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Slider
                  label="Flight speed"
                  value={controls.flightSpeed}
                  min={BLUE002_RANGES.flightSpeed.min}
                  max={BLUE002_RANGES.flightSpeed.max}
                  step={BLUE002_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="Saturation"
                  value={controls.saturation}
                  min={BLUE002_RANGES.saturation.min}
                  max={BLUE002_RANGES.saturation.max}
                  step={BLUE002_RANGES.saturation.step}
                  onChange={controls.setSaturation}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.saturation}
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
                      label="Light"
                      value={controls.colorChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setColorChannel}
                      info={INFO.colorChannel}
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
                    {flex ? (
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
                      label="Light"
                      value={controls.colorDrive}
                      min={BLUE002_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={BLUE002_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Flight"
                      value={controls.speedDrive}
                      min={BLUE002_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={BLUE002_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Flight accel"
                      value={controls.accelDrive}
                      min={BLUE002_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={BLUE002_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.accelDrive}
                    />
                    {flex ? (
                      <Slider
                        label="Cam accel"
                        value={controls.camAccelDrive}
                        min={BLUE002_RANGES.camAccelDrive.min}
                        max={controls.camAccelDriveMax}
                        step={BLUE002_RANGES.camAccelDrive.step}
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

export default Blue002;
