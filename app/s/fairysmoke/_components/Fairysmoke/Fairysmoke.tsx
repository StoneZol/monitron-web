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
import FairysmokeCanvas from "./Fairysmoke.Canvas";
import useFairysmokeHook from "./Fairysmoke.hooks";
import {
  FAIRYSMOKE_RANGES,
  type FairysmokeColorMode,
  type FairysmokeProps,
  type ReactiveChannel,
} from "./Fairysmoke.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const COLOR_MODE_OPTIONS: { value: FairysmokeColorMode; label: string }[] = [
  { value: "original", label: "original (Himred phase)" },
  { value: "twinkle", label: "twinkle (HSL walk)" },
  { value: "palette", label: "palette (idle / peak)" },
];

const INFO = {
  look: "Volumetric fairy smoke shell (Himred) — three color modes + speed.",
  smokeSpeed: "Base smoke / turbulence clock (1 ≈ Shadertoy iTime).",
  chaos:
    "Breaks the cyclic cos lock — secondary phase warp + turbulence amplitude. 0 = pure Himred.",
  density:
    "Sample budget ×40 (×2 = Himred 80). Crank with high chaos when the shell thins out. Heavier GPU.",
  colorMode:
    "original = Himred cos phase rainbow. twinkle = solid HSL walk + pulse. palette = solid idle→peak, no phase hue.",
  colorPalette:
    "Idle = rest tint. Peak = audio target. Only used in palette mode.",
  twinkle:
    "Solid HSL hue walk (no phase rainbow). Audio light-pulses harder than other screens.",
  twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for the twinkle hsl() (100 = full chroma).",
  twinkleL: "Lightness % for the twinkle hsl() (50 = vivid mid).",
  saturation: "Look chroma (0 = gray, 1 = default).",
  colorChannel:
    "Band that punches color / brightness (mode-dependent).",
  speedChannel: "Band that punches smoke speed.",
  colorDrive: "Color / twinkle pulse boost (0…2).",
  speedDrive: "Smoke speed punch strength (0…4). Rising-edge hits, not a continuous flex.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Fairysmoke = ({ showOverlay = true }: FairysmokeProps) => {
  const { liveRef, vizRef, visualizer, controls } = useFairysmokeHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const mode = controls.colorMode;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <FairysmokeCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="fairysmoke">
          <ControlPanel
            title="fairy smoke"
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
                label="Smoke speed"
                value={controls.smokeSpeed}
                min={FAIRYSMOKE_RANGES.smokeSpeed.min}
                max={FAIRYSMOKE_RANGES.smokeSpeed.max}
                step={FAIRYSMOKE_RANGES.smokeSpeed.step}
                onChange={controls.setSmokeSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.smokeSpeed}
              />
              <Slider
                label="Chaos"
                value={controls.chaos}
                min={FAIRYSMOKE_RANGES.chaos.min}
                max={FAIRYSMOKE_RANGES.chaos.max}
                step={FAIRYSMOKE_RANGES.chaos.step}
                onChange={controls.setChaos}
                format={(v) => v.toFixed(2)}
                info={INFO.chaos}
              />
              <Slider
                label="Density"
                value={controls.density}
                min={FAIRYSMOKE_RANGES.density.min}
                max={FAIRYSMOKE_RANGES.density.max}
                step={FAIRYSMOKE_RANGES.density.step}
                onChange={controls.setDensity}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.density}
              />
              <Select
                label="Color mode"
                value={controls.colorMode}
                options={COLOR_MODE_OPTIONS}
                onChange={controls.setColorMode}
                info={INFO.colorMode}
              />
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
              {mode === "palette" ? (
                <ColorTable
                  label="smoke palette"
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
              <Slider
                label="Saturation"
                value={controls.saturation}
                min={FAIRYSMOKE_RANGES.saturation.min}
                max={FAIRYSMOKE_RANGES.saturation.max}
                step={FAIRYSMOKE_RANGES.saturation.step}
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
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={FAIRYSMOKE_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={FAIRYSMOKE_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={FAIRYSMOKE_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={FAIRYSMOKE_RANGES.speedDrive.step}
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

export default Fairysmoke;
