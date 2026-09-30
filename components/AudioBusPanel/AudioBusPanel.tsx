"use client";

import { AUDIO_BAND_COUNT } from "@/lib/audioBus";
import { cn } from "@/lib/utils";
import type { AudioBusSnap } from "./AudioBusPanel.types";

export type { AudioBusSnap } from "./AudioBusPanel.types";
export { emptyAudioBusSnap } from "./AudioBusPanel.types";

function fmt01(n: number) {
  return Math.min(1, Math.max(0, n)).toFixed(2);
}

/** Age for bus header: seconds until 1h, then h + m. */
function formatAge(ms: number): string {
  const sec = ms / 1000;
  if (sec < 10) return `${sec.toFixed(1)}s`;
  if (sec < 3600) return `${Math.round(sec)}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function BandMeter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="grid grid-cols-[36px_1fr_36px] items-center gap-1.5">
      <span className="uppercase text-muted">{label}</span>
      <div className="h-2 overflow-hidden border border-line bg-screen">
        <div
          className={cn("h-full transition-[width] duration-75", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-ink">{fmt01(value)}</span>
    </div>
  );
}

function SpectrumBars({ bands }: { bands: number[] }) {
  return (
    <div className="flex h-8 items-end gap-px border border-line bg-screen px-0.5 py-0.5">
      {bands.map((v, i) => (
        <div
          key={i}
          className="min-w-0 flex-1 bg-signal/80 transition-[height] duration-75"
          style={{
            height: `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`,
          }}
          title={`b${i}: ${fmt01(v)}`}
        />
      ))}
    </div>
  );
}

type AudioBusPanelProps = {
  bus: AudioBusSnap | null;
  /** Capture-clock age (frame.t) for the header — matches plugin */
  busAgeMs: number | null;
  busLive: boolean;
  className?: string;
};

/**
 * 1:1 port of monitron-plugin DebugMenu `BusMeters`.
 * Lives in the centered ControlPanel visualizer section.
 */
export function AudioBusPanel({
  bus,
  busAgeMs,
  busLive,
  className,
}: AudioBusPanelProps) {
  const bands = bus?.bands ?? new Array(AUDIO_BAND_COUNT).fill(0);
  return (
    <div
      className={cn(
        "border border-line bg-screen/60 p-2 font-mono text-[10px] tracking-[0.04em]",
        className,
      )}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="uppercase tracking-[0.18em] text-signal">
          ::audio-bus
        </span>
        <span
          className={cn("tabular-nums", busLive ? "text-signal" : "text-muted")}
        >
          {bus
            ? `${busLive ? "live" : "stale"} · ${bus.fps.toFixed(0)} fps · age ${busAgeMs != null ? formatAge(busAgeMs) : "—"}`
            : "no frames yet"}
        </span>
      </div>
      <SpectrumBars bands={bands} />
      <div className="mt-1.5 flex flex-col gap-1">
        <BandMeter label="rms" value={bus?.rms ?? 0} color="bg-cyan" />
        <BandMeter label="peak" value={bus?.peak ?? 0} color="bg-warn" />
      </div>
      <div className="mt-1.5 truncate text-[9px] text-muted">
        t={bus ? bus.t.toFixed(1) : "—"} · sr=
        {bus?.sampleRate ? Math.round(bus.sampleRate) : "—"} · n=
        {AUDIO_BAND_COUNT}
      </div>
    </div>
  );
}
