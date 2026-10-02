"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ControlPanel,
  ControlSection,
  PanelButton,
  Slider,
} from "@/components/ControlPanel";
import BlackholeCanvas from "./Blackhole.Canvas";
import useBlackholeHook from "./Blackhole.hooks";
import {
  BLACKHOLE_RANGES,
  type BlackholeProps,
} from "./Blackhole.types";

const SOURCES = [
  {
    label: "tsBXW3 · accretion disk",
    href: "https://www.shadertoy.com/view/tsBXW3",
  },
] as const;

const INFO = {
  camera: "Pitch + BH scale. Yaw auto-orbits at a fixed rate.",
  pitch: "Camera tilt in degrees.",
  scale: "Black hole / disk radius (_Size).",
  diskSpin: "Accretion disk / horizon swirl speed.",
} as const;

const Blackhole = ({ showOverlay = true }: BlackholeProps) => {
  const { liveRef, vizRef, visualizer, controls } = useBlackholeHook();

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
            <ControlSection label="camera" info={INFO.camera}>
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

            <VisualizerSection visualizer={visualizer} />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Blackhole;
