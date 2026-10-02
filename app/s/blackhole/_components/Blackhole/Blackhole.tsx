"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import { ControlPanel, PanelButton } from "@/components/ControlPanel";
import BlackholeCanvas from "./Blackhole.Canvas";
import useBlackholeHook from "./Blackhole.hooks";
import type { BlackholeProps } from "./Blackhole.types";

const SOURCES = [
  {
    label: "Gargantua (sonicether)",
    href: "https://www.shadertoy.com/view/lstSRS",
  },
  {
    label: "flight (tsBXW3)",
    href: "https://www.shadertoy.com/view/tsBXW3",
  },
] as const;

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
            <VisualizerSection visualizer={visualizer} />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Blackhole;
