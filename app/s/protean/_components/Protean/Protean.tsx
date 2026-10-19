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
  TwinkleControls,
} from "@/components/ControlPanel";
import ProteanCanvas from "./Protean.Canvas";
import useProteanHook from "./Protean.hooks";
import {
  PROTEAN_RANGES,
  type ProteanCameraMode,
  type ProteanColorMode,
  type ProteanProps,
  type ReactiveChannel,
} from "./Protean.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const CAMERA_MODE_OPTIONS: {
  value: ProteanCameraMode;
  label: string;
}[] = [
  { value: "flex", label: "flex (stock path)" },
  { value: "manual", label: "manual (X / Y)" },
];

const COLOR_MODE_OPTIONS: {
  value: ProteanColorMode;
  label: string;
}[] = [
  { value: "original", label: "original (nimitz palette)" },
  { value: "paletteTwinkle", label: "palette twinkle (stock walk)" },
  { value: "solid", label: "solid (idle / peak)" },
  { value: "twinkle", label: "twinkle (solid HSL)" },
];

const INFO = {
  look: "Protean clouds (nimitz) — volume march through deforming fog. CC BY-NC-SA 3.0.",
  flightSpeed: "Base flight along Z (1 ≈ Shadertoy iTime×3 pace).",
  cameraMode:
    "flex = stock path look. manual = fixed X/Y (original mouse-style).",
  yaw: "Look X — pans like Shadertoy mouse X.",
  pitch: "Look Y + light density morph (original mouse Y).",
  morph: "Bias on the stock prm1 cloud pulse (−1…1).",
  colorMode:
    "original = stock. palette twinkle = phase-walk, no picker. solid = idle→peak. twinkle = HSL hue walk.",
  solidPalette: "Idle / peak tint — audio lerps toward peak.",
  paletteTwinkle:
    "Walks the stock nimitz sin palette phase — same look, shifting hues.",
  twinkle: "Solid HSL hue walk over the cloud luminance.",
  twinkleSpeed: "How fast hue / palette phase runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for solid twinkle hsl().",
  twinkleL: "Lightness % for solid twinkle hsl().",
  saturation: "Look chroma (0 = gray, 1 = default).",
  colorChannel: "Band that punches tint / peak flash.",
  speedChannel: "Band that lifts cruise flight.",
  accelChannel: "Band that kicks acceleration.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Protean = ({ showOverlay = true }: ProteanProps) => {
  const { liveRef, vizRef, visualizer, controls } = useProteanHook();
  const camManual = controls.cameraMode === "manual";
  const mode = controls.colorMode;
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <ProteanCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="protean">
          <ControlPanel
            title="protean clouds"
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
                min={PROTEAN_RANGES.flightSpeed.min}
                max={PROTEAN_RANGES.flightSpeed.max}
                step={PROTEAN_RANGES.flightSpeed.step}
                onChange={controls.setFlightSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.flightSpeed}
              />
              <Select
                label="Camera"
                value={controls.cameraMode}
                options={CAMERA_MODE_OPTIONS}
                onChange={controls.setCameraMode}
                info={INFO.cameraMode}
              />
              {camManual ? (
                <>
                  <Slider
                    label="X"
                    value={controls.yaw}
                    min={PROTEAN_RANGES.yaw.min}
                    max={PROTEAN_RANGES.yaw.max}
                    step={PROTEAN_RANGES.yaw.step}
                    onChange={controls.setYaw}
                    format={(v) => `${v.toFixed(1)}°`}
                    info={INFO.yaw}
                  />
                  <Slider
                    label="Y"
                    value={controls.pitch}
                    min={PROTEAN_RANGES.pitch.min}
                    max={PROTEAN_RANGES.pitch.max}
                    step={PROTEAN_RANGES.pitch.step}
                    onChange={controls.setPitch}
                    format={(v) => `${v.toFixed(1)}°`}
                    info={INFO.pitch}
                  />
                </>
              ) : null}
              <Slider
                label="Morph"
                value={controls.morph}
                min={PROTEAN_RANGES.morph.min}
                max={PROTEAN_RANGES.morph.max}
                step={PROTEAN_RANGES.morph.step}
                onChange={controls.setMorph}
                format={(v) => v.toFixed(2)}
                info={INFO.morph}
              />
              <Select
                label="Color mode"
                value={controls.colorMode}
                options={COLOR_MODE_OPTIONS}
                onChange={controls.setColorMode}
                info={INFO.colorMode}
              />
              {mode === "paletteTwinkle" ? (
                <Slider
                  label="Palette speed"
                  value={controls.twinkleSpeed}
                  min={0}
                  max={4}
                  step={0.05}
                  onChange={controls.setTwinkleSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.paletteTwinkle}
                />
              ) : null}
              {mode === "twinkle" ? (
                <TwinkleControls
                  title="twinkle"
                  checked
                  onCheckedChange={(on) => {
                    if (!on) controls.setColorMode("original");
                  }}
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
              {mode === "solid" ? (
                <ColorTable
                  label="solid palette"
                  info={INFO.solidPalette}
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
              <Slider
                label="Saturation"
                value={controls.saturation}
                min={PROTEAN_RANGES.saturation.min}
                max={PROTEAN_RANGES.saturation.max}
                step={PROTEAN_RANGES.saturation.step}
                onChange={controls.setSaturation}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.saturation}
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
                    <Select
                      label="Accel"
                      value={controls.accelChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setAccelChannel}
                      info={INFO.accelChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={PROTEAN_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={PROTEAN_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={PROTEAN_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={PROTEAN_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                    />
                    <Slider
                      label="Accel"
                      value={controls.accelDrive}
                      min={PROTEAN_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={PROTEAN_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
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

export default Protean;
