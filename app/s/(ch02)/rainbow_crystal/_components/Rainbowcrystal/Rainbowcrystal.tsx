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
import RainbowcrystalCanvas from "./Rainbowcrystal.Canvas";
import useRainbowcrystalHook from "./Rainbowcrystal.hooks";
import {
  RAINBOWCRYSTAL_RANGES,
  type RainbowcrystalColorMode,
  type RainbowcrystalProps,
  type ReactiveChannel,
} from "./Rainbowcrystal.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30-180 Hz)" },
  { value: "mid", label: "mid (200 Hz-2 kHz)" },
  { value: "high", label: "high (2-10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const COLOR_MODE_OPTIONS: { value: RainbowcrystalColorMode; label: string }[] =
  [
    { value: "original", label: "original" },
    { value: "flow", label: "flow" },
    { value: "twinkle", label: "twinkle (1 color HSL)" },
    { value: "palette", label: "palette (idle / peak)" },
  ];

const INFO = {
  look: "Rainbow Crystal (OldEclipse) - folded crystal march, four color modes + audio speed.",
  crystalSpeed: "Base crystal clock (1 ~= Shadertoy iTime).",
  colorMode:
    "original = locked Shadertoy palette. flow = same original palette with drifting phase. twinkle = solid HSL walk. palette = idle->peak.",
  colorPalette:
    "Idle = rest tint. Peak = audio target. Only used in palette mode.",
  flowSpeed:
    "How fast the original palette phase drifts (1 ~= full lap / 6s).",
  twinkle:
    "Solid HSL hue walk (one color). Uses shared twinkle defaults (speed 1, S 100, L 50).",
  twinkleSpeed: "How fast hue runs a full lap (1 ~= 6s).",
  twinkleS: "Saturation % for the twinkle hsl() (100 = full chroma).",
  twinkleL: "Lightness % for the twinkle hsl() (50 = vivid mid).",
  saturation: "Look chroma (0 = gray, 1 = default).",
  colorChannel: "Band that punches color / brightness (mode-dependent).",
  speedChannel: "Band that lifts cruise crystal speed (smooth).",
  accelChannel: "Band that kicks acceleration (rising-edge punches).",
  colorDrive: "Color / twinkle pulse boost (0...2).",
  speedDrive: "Cruise lift strength (0...8).",
  accelDrive: "Kick / acceleration strength (0...8).",
  visualizer: {
    section: "Audio in -> bus meters -> peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so x3 still moves.",
  },
} as const;

const Rainbowcrystal = ({ showOverlay = true }: RainbowcrystalProps) => {
  const { liveRef, vizRef, visualizer, controls } = useRainbowcrystalHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const mode = controls.colorMode;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <RainbowcrystalCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="rainbow_crystal">
          <ControlPanel
            title="rainbow crystal"
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
                {mode === "flow" ? (
                  <Slider
                    label="Flow speed"
                    value={controls.twinkleSpeed}
                    min={0}
                    max={4}
                    step={0.05}
                    onChange={controls.setTwinkleSpeed}
                    format={(v) => `×${v.toFixed(2)}`}
                    info={INFO.flowSpeed}
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
                {mode === "palette" ? (
                  <ColorTable
                    label="crystal palette"
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
              </ControlSubSection>

              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Slider
                  label="Crystal speed"
                  value={controls.crystalSpeed}
                  min={RAINBOWCRYSTAL_RANGES.crystalSpeed.min}
                  max={RAINBOWCRYSTAL_RANGES.crystalSpeed.max}
                  step={RAINBOWCRYSTAL_RANGES.crystalSpeed.step}
                  onChange={controls.setCrystalSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.crystalSpeed}
                />
                <Slider
                  label="Saturation"
                  value={controls.saturation}
                  min={RAINBOWCRYSTAL_RANGES.saturation.min}
                  max={RAINBOWCRYSTAL_RANGES.saturation.max}
                  step={RAINBOWCRYSTAL_RANGES.saturation.step}
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
                      label="Color"
                      value={controls.colorChannel}
                      options={[...REACTIVE_CHANNEL_OPTIONS]}
                      onChange={controls.setColorChannel}
                      info={INFO.colorChannel}
                    />
                    <Select
                      label="Speed"
                      value={controls.speedChannel}
                      options={[...REACTIVE_CHANNEL_OPTIONS]}
                      onChange={controls.setSpeedChannel}
                      info={INFO.speedChannel}
                    />
                    <Select
                      label="Accel"
                      value={controls.accelChannel}
                      options={[...REACTIVE_CHANNEL_OPTIONS]}
                      onChange={controls.setAccelChannel}
                      info={INFO.accelChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={RAINBOWCRYSTAL_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={RAINBOWCRYSTAL_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `x${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={RAINBOWCRYSTAL_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={RAINBOWCRYSTAL_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `x${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Accel"
                      value={controls.accelDrive}
                      min={RAINBOWCRYSTAL_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={RAINBOWCRYSTAL_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `x${v.toFixed(1)}`}
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

export default Rainbowcrystal;
