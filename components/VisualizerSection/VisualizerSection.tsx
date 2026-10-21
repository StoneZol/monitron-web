"use client";

import type { ReactNode } from "react";
import { AudioBusPanel } from "@/components/AudioBusPanel";
import {
  ControlCluster,
  ControlSection,
  Select,
  Slider,
} from "@/components/ControlPanel";
import { FxOverlaySection } from "@/components/FxOverlay";
import {
  AUDIO_SOURCE_OPTIONS,
  type AudioSource,
  type useAudioReactive,
} from "@/hooks/useAudioReactive";
import { PLUGIN_URL } from "@/lib/audioBus";

export type VisualizerApi = ReturnType<typeof useAudioReactive>;

export type VisualizerInfo = {
  section?: string;
  source?: string;
  noiseGate?: string;
  micGain?: string;
  peakGain?: string;
};

type VisualizerSectionProps = {
  visualizer: VisualizerApi;
  /** Screen-specific knobs (channels, drive, bounce…) — between source row and bus */
  children?: ReactNode;
  /** Optional help tips — omit on most screens; Matrix wires these for debug */
  info?: VisualizerInfo;
};

/**
 * Shared visualizer chrome for every audio-reactive screen:
 * header: plugin status only; body: source (+ mic), children, ::audio-bus, peak gain.
 * Fx overlay mounts immediately above this block on every screen.
 */
export function VisualizerSection({
  visualizer,
  children,
  info,
}: VisualizerSectionProps) {
  const headerExtra = (
    <div className="flex shrink-0 items-center gap-1.5 text-[9px] uppercase tracking-[0.18em]">
      <span className="text-muted">ext</span>
      <span
        className={visualizer.pluginPresent ? "text-signal" : "text-warn"}
      >
        {visualizer.pluginPresent ? "online" : "offline"}
      </span>
      {!visualizer.pluginPresent ? (
        <a
          href={PLUGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan transition-colors hover:text-signal focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-signal"
        >
          get →
        </a>
      ) : null}
    </div>
  );

  return (
    <>
      <FxOverlaySection />
      <ControlSection
        label="visualizer"
        info={info?.section}
        headerExtra={headerExtra}
        className="@container w-full max-w-full"
      >
        <div className="flex w-full min-w-0 basis-full flex-col gap-1.5">
          <div className="w-full max-w-[min(100%,50%)] min-w-0">
            <Select
              label="source"
              value={visualizer.source}
              options={AUDIO_SOURCE_OPTIONS.map((opt) => ({
                ...opt,
                disabled: opt.value === "plugin" && !visualizer.pluginPresent,
              }))}
              onChange={(value: AudioSource) => visualizer.setSource(value)}
              info={info?.source}
              className="sm:max-w-none"
            />
          </div>
          {visualizer.source === "mic" ? (
            <>
              <ControlCluster>
                <Slider
                  label="Noise gate"
                  value={visualizer.micGate}
                  min={0}
                  max={visualizer.micGateMax}
                  step={0.001}
                  onChange={visualizer.setMicGate}
                  format={(v) => (v <= 0.0005 ? "off" : v.toFixed(3))}
                  info={info?.noiseGate}
                />
                <Slider
                  label="Mic gain"
                  value={visualizer.micGain}
                  min={1}
                  max={visualizer.micGainMax}
                  step={0.1}
                  onChange={visualizer.setMicGain}
                  format={(v) => `×${v.toFixed(1)}`}
                  info={info?.micGain}
                />
              </ControlCluster>
              {visualizer.micNeedsGesture ? (
                <p className="text-[10px] uppercase tracking-[0.18em] text-warn">
                  click anywhere to enable mic
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {children ? (
          <div className="flex w-full min-w-0 basis-full flex-row flex-wrap content-start items-start gap-1.5">
            {children}
          </div>
        ) : null}

        <div className="flex w-full min-w-0 basis-full flex-col gap-1.5">
          <AudioBusPanel
            bus={visualizer.bus}
            busAgeMs={visualizer.busAgeMs}
            busLive={visualizer.busLive}
            className="w-full max-w-none sm:max-w-none"
          />
          {visualizer.reactive ? (
            <Slider
              label="Peak gain"
              value={visualizer.peakGain}
              min={1}
              max={visualizer.peakGainMax}
              step={0.1}
              onChange={visualizer.setPeakGain}
              format={(v) => `×${v.toFixed(1)}`}
              info={info?.peakGain}
              className="w-full sm:max-w-none"
            />
          ) : null}
        </div>
      </ControlSection>
    </>
  );
}
