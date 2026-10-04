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
import KalistarnestCanvas from "./Kalistarnest.Canvas";
import useKalistarnestHook from "./Kalistarnest.hooks";
import {
  KALISTARNEST_RANGES,
  type KalistarnestCameraMode,
  type KalistarnestColorMode,
  type KalistarnestProps,
  type ReactiveChannel,
} from "./Kalistarnest.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const CAMERA_MODE_OPTIONS: {
  value: KalistarnestCameraMode;
  label: string;
}[] = [
  { value: "manual", label: "manual (X / Y)" },
  { value: "flex", label: "flex (center + scatter)" },
];

const COLOR_MODE_OPTIONS: {
  value: KalistarnestColorMode;
  label: string;
}[] = [
  { value: "original", label: "original (aladiN palette)" },
  { value: "custom", label: "custom (stars)" },
];

const INFO = {
  look: "Kali Star Nest free flight (aladiN) — world-fixed planes, no mouse look.",
  flightSpeed: "Base flight clock (1 ≈ Shadertoy FLY_SPEED along +Z).",
  cameraMode:
    "manual = freelook X/Y (0/0 = along flight). flex = center + bank scatter. Flight path stays fixed.",
  yaw: "Look X in degrees — 0 = along flight. Turns the view, not the path.",
  pitch: "Look Y in degrees — 0 = along flight. Turns the view, not the path.",
  cameraBank:
    "Flex look scatter around the flight heading — 0 = locked, 1 = default, 2 = double.",
  colorMode:
    "original = aladiN fixedTint + stock dust. custom = star palette / twinkle; dust stays stock.",
  starPalette: "Stars idle→peak. Hidden while star twinkle is on.",
  starTwinkle: "HSL hue walk for stars (custom mode).",
  twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for the twinkle hsl().",
  twinkleL: "Lightness % for the twinkle hsl().",
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

const Kalistarnest = ({ showOverlay = true }: KalistarnestProps) => {
  const { liveRef, vizRef, visualizer, controls } = useKalistarnestHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const custom = controls.colorMode === "custom";
  const flex = controls.cameraMode === "flex";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <KalistarnestCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="kalistarnest">
          <ControlPanel
            title="kali star nest"
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
                min={KALISTARNEST_RANGES.flightSpeed.min}
                max={KALISTARNEST_RANGES.flightSpeed.max}
                step={KALISTARNEST_RANGES.flightSpeed.step}
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
              {flex ? (
                <Slider
                  label="Camera bank"
                  value={controls.cameraBank}
                  min={KALISTARNEST_RANGES.cameraBank.min}
                  max={KALISTARNEST_RANGES.cameraBank.max}
                  step={KALISTARNEST_RANGES.cameraBank.step}
                  onChange={controls.setCameraBank}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.cameraBank}
                />
              ) : (
                <>
                  <Slider
                    label="X"
                    value={controls.yaw}
                    min={KALISTARNEST_RANGES.yaw.min}
                    max={KALISTARNEST_RANGES.yaw.max}
                    step={KALISTARNEST_RANGES.yaw.step}
                    onChange={controls.setYaw}
                    format={(v) => `${v.toFixed(1)}°`}
                    info={INFO.yaw}
                  />
                  <Slider
                    label="Y"
                    value={controls.pitch}
                    min={KALISTARNEST_RANGES.pitch.min}
                    max={KALISTARNEST_RANGES.pitch.max}
                    step={KALISTARNEST_RANGES.pitch.step}
                    onChange={controls.setPitch}
                    format={(v) => `${v.toFixed(1)}°`}
                    info={INFO.pitch}
                  />
                </>
              )}
              <Select
                label="Color mode"
                value={controls.colorMode}
                options={COLOR_MODE_OPTIONS}
                onChange={controls.setColorMode}
                info={INFO.colorMode}
              />
              {custom ? (
                <>
                  <TwinkleControls
                    title="stars twinkle"
                    checked={controls.starTwinkle}
                    onCheckedChange={controls.setStarTwinkle}
                    speed={controls.starTwinkleSpeed}
                    onSpeedChange={controls.setStarTwinkleSpeed}
                    s={controls.starTwinkleS}
                    onSChange={controls.setStarTwinkleS}
                    l={controls.starTwinkleL}
                    onLChange={controls.setStarTwinkleL}
                    info={INFO.starTwinkle}
                    speedInfo={INFO.twinkleSpeed}
                    sInfo={INFO.twinkleS}
                    lInfo={INFO.twinkleL}
                  />
                  {!controls.starTwinkle ? (
                    <ColorTable
                      label="stars palette"
                      info={INFO.starPalette}
                      columns={["idle", "peak"]}
                      lockedColumns={audioLocked ? ["peak"] : []}
                      columnStamps={audioStamp}
                      rows={[
                        {
                          label: "stars",
                          cells: [
                            {
                              value: controls.starColor,
                              onChange: controls.setStarColor,
                            },
                            {
                              value: controls.starColorPeak,
                              onChange: controls.setStarColorPeak,
                            },
                          ],
                        },
                      ]}
                    />
                  ) : null}
                </>
              ) : null}
              <Slider
                label="Saturation"
                value={controls.saturation}
                min={KALISTARNEST_RANGES.saturation.min}
                max={KALISTARNEST_RANGES.saturation.max}
                step={KALISTARNEST_RANGES.saturation.step}
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
                      min={KALISTARNEST_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={KALISTARNEST_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={KALISTARNEST_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={KALISTARNEST_RANGES.speedDrive.step}
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

export default Kalistarnest;
