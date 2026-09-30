"use client";

import type { ReactNode } from "react";
import { AudioBusPanel } from "@/components/AudioBusPanel";
import {
  ControlSection,
  Select,
  Slider,
} from "@/components/ControlPanel";
import {
  AUDIO_SOURCE_OPTIONS,
  type AudioSource,
  type useAudioReactive,
} from "@/hooks/useAudioReactive";
import { PLUGIN_URL } from "@/lib/audioBus";

export type VisualizerApi = ReturnType<typeof useAudioReactive>;

type VisualizerSectionProps = {
  visualizer: VisualizerApi;
  /** Screen-specific knobs (channels, drive, bounce…) — between source and bus */
  children?: ReactNode;
};

/**
 * Shared visualizer chrome for every audio-reactive screen:
 * extension status, source, mic gate, screen children, ::audio-bus, peak gain.
 */
export function VisualizerSection({
  visualizer,
  children,
}: VisualizerSectionProps) {
  return (
    <ControlSection label="visualizer">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em]">
        <span className="text-muted">extension</span>
        <span
          className={
            visualizer.pluginPresent ? "text-signal" : "text-warn"
          }
        >
          {visualizer.pluginPresent ? "online" : "offline"}
        </span>
      </div>
      {!visualizer.pluginPresent && (
        <a
          href={PLUGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-signal focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <span className="text-warn/80">get</span>
          plugin
          <span aria-hidden className="text-cyan">
            →
          </span>
        </a>
      )}
      <Select
        label="source"
        value={visualizer.source}
        options={AUDIO_SOURCE_OPTIONS.map((opt) => ({
          ...opt,
          disabled: opt.value === "plugin" && !visualizer.pluginPresent,
        }))}
        onChange={(value: AudioSource) => visualizer.setSource(value)}
      />
      {visualizer.source === "mic" && (
        <Slider
          label="Noise gate"
          value={visualizer.micGate}
          min={0}
          max={visualizer.micGateMax}
          step={0.001}
          onChange={visualizer.setMicGate}
          format={(v) => (v <= 0.0005 ? "off" : v.toFixed(3))}
        />
      )}
      {visualizer.micNeedsGesture && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-warn">
          click anywhere to enable mic
        </p>
      )}
      {children}
      <AudioBusPanel
        bus={visualizer.bus}
        busAgeMs={visualizer.busAgeMs}
        busLive={visualizer.busLive}
      />
      {visualizer.reactive && (
        <Slider
          label="Peak gain"
          value={visualizer.peakGain}
          min={1}
          max={visualizer.peakGainMax}
          step={0.1}
          onChange={visualizer.setPeakGain}
          format={(v) => `×${v.toFixed(1)}`}
        />
      )}
    </ControlSection>
  );
}
