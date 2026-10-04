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
import CoralreefCanvas from "./Coralreef.Canvas";
import useCoralreefHook from "./Coralreef.hooks";
import {
  CORALREEF_RANGES,
  type CoralreefColorMode,
  type CoralreefProps,
  type ReactiveChannel,
} from "./Coralreef.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const COLOR_MODE_OPTIONS: {
  value: CoralreefColorMode;
  label: string;
}[] = [
  { value: "original", label: "original (Yusef28 palette)" },
  { value: "paletteTwinkle", label: "palette twinkle (stock walk)" },
  { value: "twinkle", label: "twinkle (solid HSL)" },
  { value: "palette", label: "palette (idle / peak)" },
];

const INFO = {
  look: "Coral Reef volumetric tunnel (Yusef28) — four color modes + speed.",
  flightSpeed: "Base tunnel clock (1 ≈ Shadertoy iTime).",
  colorMode:
    "original = stock cos palette. palette twinkle = phase-walk that palette. twinkle = solid HSL fill. palette = idle→peak.",
  colorPalette:
    "Idle = rest tint. Peak = audio target. Only used in palette mode.",
  twinkle: "Solid HSL hue walk for the whole reef fill.",
  paletteTwinkle:
    "Walks the stock Yusef28 cos palette phase — keeps the reef look, shifts hues.",
  twinkleSpeed: "How fast hue / palette phase runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for solid twinkle hsl().",
  twinkleL: "Lightness % for solid twinkle hsl().",
  saturation: "Look chroma (0 = gray, 1 = default).",
  colorChannel: "Band that punches light / color.",
  speedChannel: "Band that punches flight speed (rising-edge hits).",
  colorDrive: "Color / twinkle pulse boost (0…2).",
  speedDrive: "Speed punch strength (0…4).",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Coralreef = ({ showOverlay = true }: CoralreefProps) => {
  const { liveRef, vizRef, visualizer, controls } = useCoralreefHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const mode = controls.colorMode;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <CoralreefCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="coralreef">
          <ControlPanel
            title="coral reef"
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
                min={CORALREEF_RANGES.flightSpeed.min}
                max={CORALREEF_RANGES.flightSpeed.max}
                step={CORALREEF_RANGES.flightSpeed.step}
                onChange={controls.setFlightSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.flightSpeed}
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
              {mode === "palette" ? (
                <ColorTable
                  label="reef palette"
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
                min={CORALREEF_RANGES.saturation.min}
                max={CORALREEF_RANGES.saturation.max}
                step={CORALREEF_RANGES.saturation.step}
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
                      min={CORALREEF_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={CORALREEF_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={CORALREEF_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={CORALREEF_RANGES.speedDrive.step}
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

export default Coralreef;
