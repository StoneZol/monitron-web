"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorTable,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  Select,
  Slider,
  TwinkleControls,
} from "@/components/ControlPanel";
import WarpburstCanvas from "./Warpburst.Canvas";
import useWarpburstHook from "./Warpburst.hooks";
import {
  WARPBURST_RANGES,
  type WarpburstCameraMode,
  type WarpburstProps,
  type ReactiveChannel,
} from "./Warpburst.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const CAMERA_MODE_OPTIONS: {
  value: WarpburstCameraMode;
  label: string;
}[] = [
  { value: "flex", label: "flex (bank wander)" },
  { value: "manual", label: "manual (X / Y)" },
];

const INFO = {
  look: "Goo tunnel fog from Warpburst 2 — no stars. Tint, HSL twinkle, peak flicker.",
  flightSpeed: "Base tunnel advance (1 ≈ Shadertoy BASE_SPEED).",
  cameraMode:
    "flex = stock roll/pitch/yaw/sway. manual = fixed look X/Y, no bank wander.",
  cameraBank:
    "Flex only — roll / pitch / yaw / sway spread. 0 = dead straight, 1 = default, 2 = double.",
  yaw: "Fixed look X (deg). 0 = along the tube.",
  pitch: "Fixed look Y (deg). 0 = along the tube.",
  colorPalette:
    "Idle = base goo. Peak = neon highlight. Hidden while twinkle is on; peak locked when audio is off.",
  twinkle:
    "Hue cycles 0…360 in hsl(H S% L%). Off: solid idle→peak lerp on punches.",
  twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for the twinkle hsl() (100 = full chroma).",
  twinkleL: "Lightness % for the twinkle hsl() (50 = vivid mid).",
  saturation: "Look chroma (0 = gray, 1 = default).",
  fogDetail:
    "Fog structure — low = soft blobs, high = micro-filaments (1 ≈ default, 4 = max).",
  colorChannel:
    "Band that punches color (twinkle: shared light pulse + fog flash; off: idle→peak).",
  speedChannel: "Band that lifts cruise flight speed (smooth).",
  accelChannel: "Band that kicks acceleration (rising-edge punches).",
  colorDrive: "Color / twinkle pulse boost (0…2).",
  speedDrive: "Cruise lift strength (0…8).",
  accelDrive: "Kick / acceleration strength (0…8).",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Warpburst = ({ showOverlay = true }: WarpburstProps) => {
  const { liveRef, vizRef, visualizer, controls } = useWarpburstHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
  const camFlex = controls.cameraMode === "flex";
  const camManual = controls.cameraMode === "manual";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <WarpburstCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="warpburst">
          <ControlPanel
            title="warpburst"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <Slider
                label="Flight speed"
                value={controls.flightSpeed}
                min={WARPBURST_RANGES.flightSpeed.min}
                max={WARPBURST_RANGES.flightSpeed.max}
                step={WARPBURST_RANGES.flightSpeed.step}
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
              {camFlex ? (
                <Slider
                  label="Camera bank"
                  value={controls.cameraBank}
                  min={WARPBURST_RANGES.cameraBank.min}
                  max={WARPBURST_RANGES.cameraBank.max}
                  step={WARPBURST_RANGES.cameraBank.step}
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
                    min={WARPBURST_RANGES.yaw.min}
                    max={WARPBURST_RANGES.yaw.max}
                    step={WARPBURST_RANGES.yaw.step}
                    onChange={controls.setYaw}
                    format={(v) => `${v.toFixed(1)}°`}
                    info={INFO.yaw}
                  />
                  <Slider
                    label="Y"
                    value={controls.pitch}
                    min={WARPBURST_RANGES.pitch.min}
                    max={WARPBURST_RANGES.pitch.max}
                    step={WARPBURST_RANGES.pitch.step}
                    onChange={controls.setPitch}
                    format={(v) => `${v.toFixed(1)}°`}
                    info={INFO.pitch}
                  />
                </>
              ) : null}
              <TwinkleControls
                title="twinkle"
                checked={controls.twinkle}
                onCheckedChange={controls.setTwinkle}
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
              <Slider
                label="Saturation"
                value={controls.saturation}
                min={WARPBURST_RANGES.saturation.min}
                max={WARPBURST_RANGES.saturation.max}
                step={WARPBURST_RANGES.saturation.step}
                onChange={controls.setSaturation}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.saturation}
              />
              <Slider
                label="Fog detail"
                value={controls.fogDetail}
                min={WARPBURST_RANGES.fogDetail.min}
                max={WARPBURST_RANGES.fogDetail.max}
                step={WARPBURST_RANGES.fogDetail.step}
                onChange={controls.setFogDetail}
                format={(v) => `×${v.toFixed(2)}`}
                info={INFO.fogDetail}
              />
              {!controls.twinkle ? (
                <ColorTable
                  label="color palette"
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
                      min={WARPBURST_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={WARPBURST_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Speed"
                      value={controls.speedDrive}
                      min={WARPBURST_RANGES.speedDrive.min}
                      max={controls.speedDriveMax}
                      step={WARPBURST_RANGES.speedDrive.step}
                      onChange={controls.setSpeedDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.speedDrive}
                    />
                    <Slider
                      label="Accel"
                      value={controls.accelDrive}
                      min={WARPBURST_RANGES.accelDrive.min}
                      max={controls.accelDriveMax}
                      step={WARPBURST_RANGES.accelDrive.step}
                      onChange={controls.setAccelDrive}
                      format={(v) => `×${v.toFixed(1)}`}
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

export default Warpburst;
