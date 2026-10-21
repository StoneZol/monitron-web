"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  MIC_GAIN_DEFAULT,
  MIC_GATE_DEFAULT,
  migrateAudioSource,
  normalizeMicGain,
  normalizeMicGate,
  normalizePeakGain,
  PEAK_GAIN_DEFAULT,
  useAudioReactive,
  type AudioSource,
} from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { resetFxOverlay } from "@/components/FxOverlay";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import { onTabSyncApply } from "@/lib/tabSyncHotApply";
import {
  MUSIC_VISUAL_BAR_COLOR_DRIVE_MAX,
  MUSIC_VISUAL_BAR_DEFAULTS,
  MUSIC_VISUAL_BAR_DRIVE_MAX,
  type MusicVisualBarLive,
  type ReactiveChannel,
} from "./MusicVisualBar.types";

const SCREEN_ID = "music_visual_bar";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);

type Stored = MusicVisualBarLive & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...MUSIC_VISUAL_BAR_DEFAULTS,
  audioSource: "off",
  micGate: MIC_GATE_DEFAULT,
  micGain: MIC_GAIN_DEFAULT,
  peakGain: PEAK_GAIN_DEFAULT,
};

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function channel(v: unknown, fallback: ReactiveChannel): ReactiveChannel {
  return typeof v === "string" && CHANNELS.has(v as ReactiveChannel)
    ? (v as ReactiveChannel)
    : fallback;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  // Legacy speed* → spin*; jerk* → drift*
  const spinChRaw =
    raw.spinChannel !== undefined ? raw.spinChannel : raw["speedChannel"];
  const spinDrRaw =
    raw.spinDrive !== undefined ? raw.spinDrive : raw["speedDrive"];
  const driftChRaw =
    raw.driftChannel !== undefined ? raw.driftChannel : raw["jerkChannel"];
  const driftDrRaw =
    raw.driftDrive !== undefined ? raw.driftDrive : raw["jerkDrive"];

  return {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    micGain: normalizeMicGain(raw.micGain),
    peakGain: normalizePeakGain(raw.peakGain),
    flightSpeed: clamp(
      Number(raw.flightSpeed),
      0.1,
      3,
      STORED_DEFAULTS.flightSpeed,
    ),
    bloomGain: clamp(
      Number(raw.bloomGain),
      0,
      1.5,
      STORED_DEFAULTS.bloomGain,
    ),
    streakGain: clamp(
      Number(raw.streakGain),
      0,
      1,
      STORED_DEFAULTS.streakGain,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      MUSIC_VISUAL_BAR_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    spinChannel: channel(spinChRaw, STORED_DEFAULTS.spinChannel),
    spinDrive: clamp(
      Number(spinDrRaw),
      0,
      MUSIC_VISUAL_BAR_DRIVE_MAX,
      STORED_DEFAULTS.spinDrive,
    ),
    // Missing key → fixed (safer default); only explicit false unlocks drift
    fixedCenter: raw.fixedCenter !== false,
    driftChannel: channel(driftChRaw, STORED_DEFAULTS.driftChannel),
    driftDrive: clamp(
      Number(driftDrRaw),
      0,
      MUSIC_VISUAL_BAR_DRIVE_MAX,
      STORED_DEFAULTS.driftDrive,
    ),
  };
}

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cached: Stored | null = null;
const liveRef: { current: MusicVisualBarLive } = {
  current: MUSIC_VISUAL_BAR_DEFAULTS,
};

function readPrefs(): Stored {
  if (cached) return cached;
  cached = migratePrefs(
    loadScreenPrefs(SCREEN_ID, { ...STORED_DEFAULTS }) as Stored &
      Record<string, unknown>,
  );
  liveRef.current = cached;
  return cached;
}

function writePrefs(next: Stored) {
  cached = next;
  liveRef.current = cached;
  saveScreenPrefs(SCREEN_ID, cached);
  emit();
}

function rehydrateFromStorage() {
  cached = null;
  readPrefs();
  emit();
}

export default function useMusicVisualBarHook() {
  const live = useSyncExternalStore(
    subscribe,
    readPrefs,
    () => STORED_DEFAULTS,
  );

  useEffect(() => onTabSyncApply(SCREEN_ID, rehydrateFromStorage), []);

  const commit = (patch: Partial<Stored>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  const visualizer = useAudioReactive({
    preferredSource: live.audioSource,
    preferredMicGate: live.micGate,
    preferredMicGain: live.micGain,
    preferredPeakGain: live.peakGain,
    onSourceChange: (audioSource) => commit({ audioSource }),
    onMicGateChange: (micGate) => commit({ micGate }),
    onMicGainChange: (micGain) => commit({ micGain }),
    onPeakGainChange: (peakGain) => commit({ peakGain }),
  });

  return {
    liveRef,
    vizRef: visualizer.vizRef,
    visualizer,
    controls: {
      flightSpeed: live.flightSpeed,
      bloomGain: live.bloomGain,
      streakGain: live.streakGain,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      spinChannel: live.spinChannel,
      spinDrive: live.spinDrive,
      fixedCenter: live.fixedCenter,
      driftChannel: live.driftChannel,
      driftDrive: live.driftDrive,
      colorDriveMax: MUSIC_VISUAL_BAR_COLOR_DRIVE_MAX,
      spinDriveMax: MUSIC_VISUAL_BAR_DRIVE_MAX,
      driftDriveMax: MUSIC_VISUAL_BAR_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setBloomGain: (bloomGain: number) => commit({ bloomGain }),
      setStreakGain: (streakGain: number) => commit({ streakGain }),
      setColorChannel: (colorChannel: ReactiveChannel) =>
        commit({ colorChannel }),
      setColorDrive: (colorDrive: number) => commit({ colorDrive }),
      setSpinChannel: (spinChannel: ReactiveChannel) =>
        commit({ spinChannel }),
      setSpinDrive: (spinDrive: number) => commit({ spinDrive }),
      setFixedCenter: (fixedCenter: boolean) => commit({ fixedCenter }),
      setDriftChannel: (driftChannel: ReactiveChannel) =>
        commit({ driftChannel }),
      setDriftDrive: (driftDrive: number) => commit({ driftDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
