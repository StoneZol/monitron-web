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
import StarleidoscopeCanvas from "./Starleidoscope.Canvas";
import useStarleidoscopeHook from "./Starleidoscope.hooks";
import {
  STARLEIDOSCOPE_RANGES,
  type ReactiveChannel,
  type StarleidoscopeColorMode,
  type StarleidoscopeProps,
} from "./Starleidoscope.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const COLOR_MODE_OPTIONS: {
  value: StarleidoscopeColorMode;
  label: string;
}[] = [
  { value: "original", label: "original (stock palette)" },
  { value: "paletteTwinkle", label: "palette twinkle (stock HSL)" },
  { value: "twinkle", label: "twinkle (solid HSL)" },
  { value: "palette", label: "palette (idle / peak)" },
];

const INFO = {
  look: "Starleidoscope (DanielXMoore) — kaleidoscope starfield with layered depth.",
  patternSpeed:
    "Kaleidoscope / tunnel scroll (edges + depth). ×1 is tuned snappy; coeffs scale from this. Star pulse stays wall-clock.",
  kaleidoSides:
    "Radial mirrors around center (stock = 3). Higher = more wedges meeting in the middle; stock IFS tunnel stays.",
  kaleidoChaos:
    "Warps fold angles and UV — 0 = clean stock mirrors, 1 = messy.",
  colorSpeed: "Palette / HSL phase rate (1 ≈ full lap / 6s).",
  colorMode:
    "original = stock + FFT. palette twinkle = stock hues × full HSL cycle. twinkle = solid HSL. palette = idle→peak.",
  colorPalette: "Idle = rest tint. Peak = color-channel target.",
  paletteTwinkle:
    "Takes stock star colors and rotates their HSL hue through a full cycle (1 ≈ 6s). Greens/yellows included.",
  twinkle: "Solid HSL hue walk over the starfield.",
  twinkleSpeed: "How fast hue / palette phase runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for the twinkle hsl().",
  twinkleL: "Lightness % for the twinkle hsl().",
  saturation: "Look chroma (0 = gray, 1 = default).",
  colorChannel:
    "Band that lifts color-transition / twinkle cruise (twinkle / palette / paletteTwinkle). Original uses stock FFT.",
  colorAccelChannel: "Band that kicks color-transition rate.",
  patternChannel: "Band that lifts pattern / scroll cruise.",
  patternAccelChannel: "Band that kicks pattern acceleration.",
  colorDrive: "Color cruise strength.",
  colorAccelDrive: "Color kick strength.",
  patternDrive: "Pattern cruise strength.",
  patternAccelDrive: "Pattern kick strength.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Starleidoscope = ({ showOverlay = true }: StarleidoscopeProps) => {
  const { liveRef, vizRef, visualizer, controls } = useStarleidoscopeHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const mode = controls.colorMode;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <StarleidoscopeCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="starleidoscope">
          <ControlPanel
            title="starleidoscope"
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
                {mode === "paletteTwinkle" ? (
                  <Slider
                    label="Palette speed"
                    value={controls.colorSpeed}
                    min={STARLEIDOSCOPE_RANGES.colorSpeed.min}
                    max={STARLEIDOSCOPE_RANGES.colorSpeed.max}
                    step={STARLEIDOSCOPE_RANGES.colorSpeed.step}
                    onChange={controls.setColorSpeed}
                    format={(v) => `×${v.toFixed(2)}`}
                    info={INFO.paletteTwinkle}
                  />
                ) : null}
                {mode === "twinkle" ? (
                  <TwinkleControls
                    title="twinkle"
                    checked
                    showToggle={false}
                    speed={controls.colorSpeed}
                    onSpeedChange={controls.setColorSpeed}
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
                    label="star palette"
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
                  label="Pattern speed"
                  value={controls.patternSpeed}
                  min={STARLEIDOSCOPE_RANGES.patternSpeed.min}
                  max={STARLEIDOSCOPE_RANGES.patternSpeed.max}
                  step={STARLEIDOSCOPE_RANGES.patternSpeed.step}
                  onChange={controls.setPatternSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.patternSpeed}
                />
                <Slider
                  label="Saturation"
                  value={controls.saturation}
                  min={STARLEIDOSCOPE_RANGES.saturation.min}
                  max={STARLEIDOSCOPE_RANGES.saturation.max}
                  step={STARLEIDOSCOPE_RANGES.saturation.step}
                  onChange={controls.setSaturation}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.saturation}
                />
                <Slider
                  label="Mirrors"
                  value={controls.kaleidoSides}
                  min={STARLEIDOSCOPE_RANGES.kaleidoSides.min}
                  max={STARLEIDOSCOPE_RANGES.kaleidoSides.max}
                  step={STARLEIDOSCOPE_RANGES.kaleidoSides.step}
                  onChange={controls.setKaleidoSides}
                  format={(v) => `${Math.round(v)}`}
                  info={INFO.kaleidoSides}
                />
                <Slider
                  label="Chaos"
                  value={controls.kaleidoChaos}
                  min={STARLEIDOSCOPE_RANGES.kaleidoChaos.min}
                  max={STARLEIDOSCOPE_RANGES.kaleidoChaos.max}
                  step={STARLEIDOSCOPE_RANGES.kaleidoChaos.step}
                  onChange={controls.setKaleidoChaos}
                  format={(v) => v.toFixed(2)}
                  info={INFO.kaleidoChaos}
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
                      label="Color accel"
                      value={controls.colorAccelChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setColorAccelChannel}
                      info={INFO.colorAccelChannel}
                    />
                    <Select
                      label="Pattern"
                      value={controls.patternChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setPatternChannel}
                      info={INFO.patternChannel}
                    />
                    <Select
                      label="Pattern accel"
                      value={controls.patternAccelChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setPatternAccelChannel}
                      info={INFO.patternAccelChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={STARLEIDOSCOPE_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={STARLEIDOSCOPE_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Color accel"
                      value={controls.colorAccelDrive}
                      min={STARLEIDOSCOPE_RANGES.colorAccelDrive.min}
                      max={controls.colorAccelDriveMax}
                      step={STARLEIDOSCOPE_RANGES.colorAccelDrive.step}
                      onChange={controls.setColorAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.colorAccelDrive}
                    />
                    <Slider
                      label="Pattern"
                      value={controls.patternDrive}
                      min={STARLEIDOSCOPE_RANGES.patternDrive.min}
                      max={controls.patternDriveMax}
                      step={STARLEIDOSCOPE_RANGES.patternDrive.step}
                      onChange={controls.setPatternDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.patternDrive}
                    />
                    <Slider
                      label="Pattern accel"
                      value={controls.patternAccelDrive}
                      min={STARLEIDOSCOPE_RANGES.patternAccelDrive.min}
                      max={controls.patternAccelDriveMax}
                      step={STARLEIDOSCOPE_RANGES.patternAccelDrive.step}
                      onChange={controls.setPatternAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.patternAccelDrive}
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

export default Starleidoscope;
