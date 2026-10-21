"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ControlCluster,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  Select,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import MusicVisualBarCanvas from "./MusicVisualBar.Canvas";
import useMusicVisualBarHook from "./MusicVisualBar.hooks";
import {
  MUSIC_VISUAL_BAR_RANGES,
  type MusicVisualBarProps,
  type ReactiveChannel,
} from "./MusicVisualBar.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
  { value: "off", label: "off" },
  { value: "bass", label: "bass (30–180 Hz)" },
  { value: "mid", label: "mid (200 Hz–2 kHz)" },
  { value: "high", label: "high (2–10 kHz)" },
  { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
  look: "Cyber neon spectrum ring — deep space, frost lens, bloom. FFT from the bus.",
  flightSpeed: "Base spin crawl (+ drift glide when unlocked). 1 ≈ calm.",
  bloomGain: "Golden-angle disk bloom (0 = off).",
  streakGain: "Anamorphic horizontal streak (0 = off).",
  fixedCenter:
    "Lock the ring at screen center. Off = gentle glide (can surprise).",
  colorChannel: "Band that punches neon hue / sat.",
  spinChannel:
    "Band that accelerates spectrum spin — soft pow cruise + rising-edge kicks.",
  driftChannel:
    "Band that gently lifts drift speed on peaks — ring keeps a smooth heading.",
  colorDrive: "Color punch boost (0…2).",
  spinDrive: "Spin accel strength (0…8).",
  driftDrive: "How much peaks lift glide speed (0…8).",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const MusicVisualBar = ({ showOverlay = true }: MusicVisualBarProps) => {
  const { liveRef, vizRef, visualizer, controls } = useMusicVisualBarHook();
  const drifting = !controls.fixedCenter;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <MusicVisualBarCanvas liveRef={liveRef} vizRef={vizRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="music_visual_bar">
          <ControlPanel
            title="music visual bar"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <Toggle
                label="Fixed center"
                checked={controls.fixedCenter}
                onChange={controls.setFixedCenter}
                info={INFO.fixedCenter}
              />
              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Slider
                  label="Spin base"
                  value={controls.flightSpeed}
                  min={MUSIC_VISUAL_BAR_RANGES.flightSpeed.min}
                  max={MUSIC_VISUAL_BAR_RANGES.flightSpeed.max}
                  step={MUSIC_VISUAL_BAR_RANGES.flightSpeed.step}
                  onChange={controls.setFlightSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.flightSpeed}
                />
                <Slider
                  label="Bloom"
                  value={controls.bloomGain}
                  min={MUSIC_VISUAL_BAR_RANGES.bloomGain.min}
                  max={MUSIC_VISUAL_BAR_RANGES.bloomGain.max}
                  step={MUSIC_VISUAL_BAR_RANGES.bloomGain.step}
                  onChange={controls.setBloomGain}
                  format={(v) => v.toFixed(2)}
                  info={INFO.bloomGain}
                />
                <Slider
                  label="Streak"
                  value={controls.streakGain}
                  min={MUSIC_VISUAL_BAR_RANGES.streakGain.min}
                  max={MUSIC_VISUAL_BAR_RANGES.streakGain.max}
                  step={MUSIC_VISUAL_BAR_RANGES.streakGain.step}
                  onChange={controls.setStreakGain}
                  format={(v) => v.toFixed(2)}
                  info={INFO.streakGain}
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
                      label="Spin"
                      value={controls.spinChannel}
                      options={REACTIVE_CHANNEL_OPTIONS}
                      onChange={controls.setSpinChannel}
                      info={INFO.spinChannel}
                    />
                    {drifting ? (
                      <Select
                        label="Drift"
                        value={controls.driftChannel}
                        options={REACTIVE_CHANNEL_OPTIONS}
                        onChange={controls.setDriftChannel}
                        info={INFO.driftChannel}
                      />
                    ) : null}
                  </ControlSubSection>
                  <ControlSubSection label="drive">
                    <Slider
                      label="Color"
                      value={controls.colorDrive}
                      min={MUSIC_VISUAL_BAR_RANGES.colorDrive.min}
                      max={controls.colorDriveMax}
                      step={MUSIC_VISUAL_BAR_RANGES.colorDrive.step}
                      onChange={controls.setColorDrive}
                      format={(v) => `×${v.toFixed(2)}`}
                      info={INFO.colorDrive}
                    />
                    <Slider
                      label="Spin"
                      value={controls.spinDrive}
                      min={MUSIC_VISUAL_BAR_RANGES.spinDrive.min}
                      max={controls.spinDriveMax}
                      step={MUSIC_VISUAL_BAR_RANGES.spinDrive.step}
                      onChange={controls.setSpinDrive}
                      format={(v) => `×${v.toFixed(1)}`}
                      info={INFO.spinDrive}
                    />
                    {drifting ? (
                      <Slider
                        label="Drift"
                        value={controls.driftDrive}
                        min={MUSIC_VISUAL_BAR_RANGES.driftDrive.min}
                        max={controls.driftDriveMax}
                        step={MUSIC_VISUAL_BAR_RANGES.driftDrive.step}
                        onChange={controls.setDriftDrive}
                        format={(v) => `×${v.toFixed(1)}`}
                        info={INFO.driftDrive}
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

export default MusicVisualBar;
