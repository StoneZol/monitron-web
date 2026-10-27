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
import InsomniumCanvas from "./Insomnium.Canvas";
import useInsomniumHook from "./Insomnium.hooks";
import {
  INSOMNIUM_RANGES,
  type ReactiveChannel,
  type InsomniumCameraMode,
  type InsomniumProps,
} from "./Insomnium.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const CAMERA_MODE_OPTIONS: { value: InsomniumCameraMode; label: string }[] = [
  { value: "flex", label: "flex (center + scatter)" },
  { value: "manual", label: "manual (±180°)" },
];

const INFO = {
  look: "Insomnium (diatribes) — fractal cavern flight. Channel0 = Organic 4.",
  flightSpeed: "Base flight clock (1 ≈ Shadertoy iTime).",
  cameraMode:
    "flex = stock look + author coral wander (Root-style). manual = freelook X/Y ±180°, no stock tumble.",
  cameraBank: "Author coral scatter on top of stock look (0 = stock aim only).",
  yaw: "Manual look X (±180°).",
  pitch: "Manual look Y (±180°).",
  wallPalette: "March glow. Idle ≈ stock warm vec3(9,2,1).",
  wallTwinkle: "HSL walk on walls instead of idle/peak pickers.",
  lightPalette: "Near-surface falloff tint. Idle ≈ stock cool vec3(1,2,6).",
  lightTwinkle: "HSL walk on the light tint instead of idle/peak pickers.",
  saturation: "Look chroma (0 = gray, 1 = default).",
  wallChannel: "Band that punches wall idle→peak / twinkle.",
  lightChannel: "Band that punches light idle→peak / twinkle.",
  speedChannel: "Band that lifts flight cruise.",
  accelChannel: "Band that kicks flight acceleration.",
  camAccelChannel:
    "Band that drives flex look rate. Only in flex. Default off = 1× wander.",
  wallDrive: "Wall color punch strength.",
  lightDrive: "Light color punch strength.",
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

const Insomnium = ({ showOverlay = true }: InsomniumProps) => {
  const { liveRef, vizRef, visualizer, controls } = useInsomniumHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const flex = controls.cameraMode === "flex";
  const manual = controls.cameraMode === "manual";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <InsomniumCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="insomnium">
          <ControlPanel
            title="insomnium"
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

              <ControlSubSection label="light" info={INFO.lightPalette}>
                <TwinkleControls
                  title="light twinkle"
                  checked={controls.lightTwinkle}
                  onCheckedChange={controls.setLightTwinkle}
                  speed={controls.lightTwinkleSpeed}
                  onSpeedChange={controls.setLightTwinkleSpeed}
                  s={controls.lightTwinkleS}
                  onSChange={controls.setLightTwinkleS}
                  l={controls.lightTwinkleL}
                  onLChange={controls.setLightTwinkleL}
                  info={INFO.lightTwinkle}
                />
                {!controls.lightTwinkle ? (
                  <ColorTable
                    label="light palette"
                    info={INFO.lightPalette}
                    columns={["idle", "peak"]}
                    lockedColumns={audioLocked ? ["peak"] : []}
                    columnStamps={audioStamp}
                    rows={[
                      {
                        label: "lamp",
                        cells: [
                          {
                            value: controls.lightColor,
                            onChange: controls.setLightColor,
                          },
                          {
                            value: controls.lightColorPeak,
                            onChange: controls.setLightColorPeak,
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
                {flex ? (
                  <Slider
                    label="Camera bank"
                    value={controls.cameraBank}
                    min={INSOMNIUM_RANGES.cameraBank.min}
                    max={INSOMNIUM_RANGES.cameraBank.max}
                    step={INSOMNIUM_RANGES.cameraBank.step}
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
                      min={INSOMNIUM_RANGES.yaw.min}
                      max={INSOMNIUM_RANGES.yaw.max}
                      step={INSOMNIUM_RANGES.yaw.step}
                      onChange={controls.setYaw}
                      format={(v) => `${v.toFixed(0)}°`}
                      info={INFO.yaw}
                    />
                    <Slider
                      label="Y"
                      value={controls.pitch}
                      min={INSOMNIUM_RANGES.pitch.min}
                      max={INSOMNIUM_RANGES.pitch.max}
                      step={INSOMNIUM_RANGES.pitch.step}
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
                  min={INSOMNIUM_RANGES.flightSpeed.min}
                  max={INSOMNIUM_RANGES.flightSpeed.max}
                  step={INSOMNIUM_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="Saturation"
                  value={controls.saturation}
                  min={INSOMNIUM_RANGES.saturation.min}
                  max={INSOMNIUM_RANGES.saturation.max}
                  step={INSOMNIUM_RANGES.saturation.step}
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
                      label="Walls"
                      value={controls.wallChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setWallChannel}
                      info={INFO.wallChannel}
                    />
                    <Select
                      label="Light"
                      value={controls.lightChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setLightChannel}
                      info={INFO.lightChannel}
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
                      label="Walls"
                      value={controls.wallDrive}
                      min={INSOMNIUM_RANGES.wallDrive.min}
                      max={controls.colorDriveMax}
                      step={INSOMNIUM_RANGES.wallDrive.step}
                      onChange={controls.setWallDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.wallDrive}
                    />
                    <Slider
                      label="Light"
                      value={controls.lightDrive}
                      min={INSOMNIUM_RANGES.lightDrive.min}
                      max={controls.colorDriveMax}
                      step={INSOMNIUM_RANGES.lightDrive.step}
                      onChange={controls.setLightDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.lightDrive}
                    />
                    <Slider
                      label="Flight"
                      value={controls.speedDrive}
                      min={INSOMNIUM_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={INSOMNIUM_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Flight accel"
                      value={controls.accelDrive}
                      min={INSOMNIUM_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={INSOMNIUM_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.accelDrive}
                    />
                    {flex ? (
                      <Slider
                        label="Cam accel"
                        value={controls.camAccelDrive}
                        min={INSOMNIUM_RANGES.camAccelDrive.min}
                        max={controls.camAccelDriveMax}
                        step={INSOMNIUM_RANGES.camAccelDrive.step}
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

export default Insomnium;
