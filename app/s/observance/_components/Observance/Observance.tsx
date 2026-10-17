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
  Toggle,
  TwinkleControls,
} from "@/components/ControlPanel";
import ObservanceCanvas from "./Observance.Canvas";
import useObservanceHook from "./Observance.hooks";
import {
  OBSERVANCE_RANGES,
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

const INFO = {
  look: "Observance flight — black crosses and sun-tinted lightning stripes.",
  flightSpeed: "Base camera advance along the path (1 ≈ Shadertoy default).",
  crosses: "Draw stock black cross markers (on/off only).",
  crossesAir: "Lift crosses off the hills by a fixed height (float in air).",
  crossesFlip: "Invert crosses upside-down (does not change air lift).",
  crossSway:
    "When crosses on: scale stock path sway (1 = Shadertoy, 0 = locked, 2 = 2×).",
  cameraBank:
    "When crosses off: coral-style flex look cone (0 = dead ahead, 1 = default wander).",
  sun: "Tint for the chromatic lightning stripes (idle→peak or HSL twinkle).",
  sunPalette:
    "Idle = rest. Peak = color-channel target. Hidden while sun twinkle is on; peak locked when audio is off.",
  sunTwinkle:
    "Hue cycles 0…360 in hsl(H S% L%) on stripe tint. Off: solid tint with idle→peak lerp.",
  sunTwinkleSpeed: "How fast sun hue runs a full lap (1 ≈ 6s).",
  sunTwinkleS: "Saturation % for sun twinkle hsl() (100 = full chroma).",
  sunTwinkleL: "Lightness % for sun twinkle hsl() (50 = vivid mid).",
  lightning:
    "Show/hide sharp colored stripe / flash bands. Sun disc stays on.",
  colorChannel:
    "Band that punches sun color (twinkle: light pulse; off: idle→peak).",
  speedChannel: "Band that smoothly scales flight speed (no punches).",
  accelChannel:
    "Second band that smoothly scales flight speed (stacks with Speed; no punches).",
  camAccelChannel:
    "Band that smoothly scales how fast camera look animates (sway / bank). Off = 1×. No punches.",
  colorDrive: "Color / twinkle pulse boost (0…2).",
  speedDrive: "Flight speed scale strength (0…4).",
  accelDrive: "Extra flight speed scale strength (0…4).",
  camAccelDrive: "Camera look animation rate strength (0…4).",
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <ObservanceCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="observance">
          <ControlPanel
            title="observance"
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
                min={OBSERVANCE_RANGES.flightSpeed.min}
                max={OBSERVANCE_RANGES.flightSpeed.max}
                step={OBSERVANCE_RANGES.flightSpeed.step}
                onChange={controls.setFlightSpeed}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.flightSpeed}
              />

              <Toggle
                label="Crosses"
                checked={controls.crosses}
                onChange={controls.setCrosses}
                info={INFO.crosses}
              />
              {controls.crosses ? (
                <>
                  <Toggle
                    label="Crosses in air"
                    checked={controls.crossesAir}
                    onChange={controls.setCrossesAir}
                    info={INFO.crossesAir}
                  />
                  <Toggle
                    label="Flip crosses"
                    checked={controls.crossesFlip}
                    onChange={controls.setCrossesFlip}
                    info={INFO.crossesFlip}
                  />
                </>
              ) : null}

              <Toggle
                label="Lightning"
                checked={controls.lightning}
                onChange={controls.setLightning}
                info={INFO.lightning}
              />

              <ControlSubSection label="camera">
                {controls.crosses ? (
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
                ) : (
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
                )}
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
