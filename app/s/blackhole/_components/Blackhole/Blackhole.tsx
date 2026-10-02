"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
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
} from "@/components/ControlPanel";
import BlackholeCanvas from "./Blackhole.Canvas";
import useBlackholeHook from "./Blackhole.hooks";
import {
  BLACKHOLE_RANGES,
  type BlackholeProps,
  type ReactiveChannel,
} from "./Blackhole.types";

const SOURCES = [
  {
    label: "tsBXW3 · accretion disk",
    href: "https://www.shadertoy.com/view/tsBXW3",
  },
] as const;

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
  look: "Tint, orbit, scale — and optional beat punch on the hole.",
  holeTwinkle: "Hue walks from idle. Peak column locked while on.",
  holePalette:
    "Idle = rest. Peak = hole-channel target (locked while twinkle is on or audio is off).",
  colorSpeed: "Hue walk rate while twinkle is on.",
  yawSpeed: "Horizontal orbit rate (unitless, like disk spin).",
  pitch: "Camera tilt in degrees.",
  scale: "Black hole / disk radius (_Size).",
  scalePunch: "Pulse + shake hole scale from the hole channel.",
  scaleDrive: "How hard scale punches when Scale punch is on.",
  diskSpin: "Accretion disk / horizon swirl speed.",
  holeChannel: "Band that punches hole / disk color, glow, and scale punch.",
  yawChannel: "Band that punches yaw orbit speed.",
  holeDrive: "Hole punch strength.",
  yawDrive: "Yaw orbit punch strength.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;
const Blackhole = ({ showOverlay = true }: BlackholeProps) => {
  const { liveRef, vizRef, visualizer, controls } = useBlackholeHook();
  const audioLocked = !visualizer.reactive;
  const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <BlackholeCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="blackhole">
          <ControlPanel
            title="blackhole"
            actions={
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <NavBackButton className="min-w-0 flex-1" />
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
                <div className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                  {SOURCES.map((src) => (
                    <a
                      key={src.href}
                      href={src.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan hover:text-signal"
                    >
                      {src.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            }
          >
            <ControlSection label="look" info={INFO.look}>
              <Toggle
                label="Hole twinkle"
                checked={controls.holeTwinkle}
                onChange={controls.setHoleTwinkle}
                info={INFO.holeTwinkle}
              />
              <ColorTable
                label="hole palette"
                info={INFO.holePalette}
                columns={["idle", "peak"]}
                lockedColumns={
                  audioLocked || controls.holeTwinkle ? ["peak"] : []
                }
                columnStamps={
                  controls.holeTwinkle
                    ? { peak: "twinkle" }
                    : audioStamp
                }
                rows={[
                  {
                    label: "hole",
                    cells: [
                      {
                        value: controls.holeColor,
                        onChange: controls.setHoleColor,
                      },
                      {
                        value: controls.holeColorPeak,
                        onChange: controls.setHoleColorPeak,
                      },
                    ],
                  },
                ]}
              />
              {controls.holeTwinkle ? (
                <Slider
                  label="Color speed"
                  value={controls.colorSpeed}
                  min={BLACKHOLE_RANGES.colorSpeed.min}
                  max={BLACKHOLE_RANGES.colorSpeed.max}
                  step={BLACKHOLE_RANGES.colorSpeed.step}
                  onChange={controls.setColorSpeed}
                  info={INFO.colorSpeed}
                />
              ) : null}
              <Slider
                label="Yaw speed"
                value={controls.yawSpeed}
                min={BLACKHOLE_RANGES.yawSpeed.min}
                max={BLACKHOLE_RANGES.yawSpeed.max}
                step={BLACKHOLE_RANGES.yawSpeed.step}
                onChange={controls.setYawSpeed}
                format={(v) => v.toFixed(2)}
                info={INFO.yawSpeed}
              />
              <Slider
                label="Pitch"
                value={controls.pitch}
                min={BLACKHOLE_RANGES.pitch.min}
                max={BLACKHOLE_RANGES.pitch.max}
                step={BLACKHOLE_RANGES.pitch.step}
                onChange={controls.setPitch}
                format={(v) => `${v.toFixed(0)}°`}
                info={INFO.pitch}
              />
              <Slider
                label="Scale"
                value={controls.blackHoleSize}
                min={BLACKHOLE_RANGES.blackHoleSize.min}
                max={BLACKHOLE_RANGES.blackHoleSize.max}
                step={BLACKHOLE_RANGES.blackHoleSize.step}
                onChange={controls.setBlackHoleSize}
                format={(v) => v.toFixed(2)}
                info={INFO.scale}
              />
              <Toggle
                label="Scale punch"
                checked={controls.scalePunch}
                onChange={controls.setScalePunch}
                info={INFO.scalePunch}
              />
              {controls.scalePunch ? (
                <Slider
                  label="Scale drive"
                  value={controls.scaleDrive}
                  min={BLACKHOLE_RANGES.drive.min}
                  max={controls.driveMax}
                  step={BLACKHOLE_RANGES.drive.step}
                  onChange={controls.setScaleDrive}
                  format={(v) => `×${v.toFixed(1)}`}
                  info={INFO.scaleDrive}
                />
              ) : null}
              <Slider
                label="Disk spin"
                value={controls.diskRotationSpeed}
                min={BLACKHOLE_RANGES.diskRotationSpeed.min}
                max={BLACKHOLE_RANGES.diskRotationSpeed.max}
                step={BLACKHOLE_RANGES.diskRotationSpeed.step}
                onChange={controls.setDiskRotationSpeed}
                format={(v) => v.toFixed(2)}
                info={INFO.diskSpin}
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
                      label="Hole"
                      value={controls.holeChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setHoleChannel}
                      info={INFO.holeChannel}
                    />
                    <Select
                      label="Yaw"
                      value={controls.yawChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setYawChannel}
                      info={INFO.yawChannel}
                    />
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Hole"
                      value={controls.holeDrive}
                      min={BLACKHOLE_RANGES.drive.min}
                      max={controls.driveMax}
                      step={BLACKHOLE_RANGES.drive.step}
                      onChange={controls.setHoleDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.holeDrive}
                    />
                    <Slider
                      label="Yaw"
                      value={controls.yawDrive}
                      min={BLACKHOLE_RANGES.drive.min}
                      max={controls.driveMax}
                      step={BLACKHOLE_RANGES.drive.step}
                      onChange={controls.setYawDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.yawDrive}
                    />
                  </ControlSubSection>
                </>
              ) : null}
            </VisualizerSection>          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Blackhole;
