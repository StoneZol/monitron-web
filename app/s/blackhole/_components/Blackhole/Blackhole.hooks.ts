"use client";

import { useSyncExternalStore } from "react";
import {
  migrateAudioSource,
  MIC_GATE_DEFAULT,
  normalizeMicGate,
  normalizePeakGain,
  PEAK_GAIN_DEFAULT,
  useAudioReactive,
  type AudioSource,
} from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import {
  BLACKHOLE_DEFAULTS,
  type BlackholeLive,
  type ReactiveChannel,
} from "./Blackhole.types";

const SCREEN_ID = "blackhole";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);

type Stored = BlackholeLive & {
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...BLACKHOLE_DEFAULTS,
  audioSource: "off",
  micGate: MIC_GATE_DEFAULT,
  peakGain: PEAK_GAIN_DEFAULT,
};

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const channel = (v: unknown, fallback: ReactiveChannel): ReactiveChannel =>
    typeof v === "string" && CHANNELS.has(v as ReactiveChannel)
      ? (v as ReactiveChannel)
      : fallback;

  return {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    flightSpeed: clamp(Number(raw.flightSpeed), 0.05, 8, STORED_DEFAULTS.flightSpeed),
    blackHoleSize: clamp(
      Number(raw.blackHoleSize),
      0.05,
      2,
      STORED_DEFAULTS.blackHoleSize,
    ),
    yaw: clamp(Number(raw.yaw), -180, 180, STORED_DEFAULTS.yaw),
    pitch: clamp(Number(raw.pitch), 0, 1, STORED_DEFAULTS.pitch),
    spaceChannel: channel(raw.spaceChannel, STORED_DEFAULTS.spaceChannel),
    holeChannel: channel(raw.holeChannel, STORED_DEFAULTS.holeChannel),
    spaceDrive: clamp(Number(raw.spaceDrive), 0, 8, STORED_DEFAULTS.spaceDrive),
    holeDrive: clamp(Number(raw.holeDrive), 0, 8, STORED_DEFAULTS.holeDrive),
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
const liveRef: { current: BlackholeLive } = { current: BLACKHOLE_DEFAULTS };

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
  liveRef.current = next;
  saveScreenPrefs(SCREEN_ID, next);
  emit();
}

export default function useBlackholeHook() {
  const live = useSyncExternalStore(
    subscribe,
    readPrefs,
    () => STORED_DEFAULTS,
  );

  const commit = (patch: Partial<Stored>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  const visualizer = useAudioReactive({
    preferredSource: live.audioSource,
    preferredMicGate: live.micGate,
    preferredPeakGain: live.peakGain,
    onSourceChange: (audioSource) => commit({ audioSource }),
    onMicGateChange: (micGate) => commit({ micGate }),
    onPeakGainChange: (peakGain) => commit({ peakGain }),
  });

  return {
    liveRef,
    vizRef: visualizer.vizRef,
    visualizer,
    controls: {
      yaw: live.yaw,
      pitch: live.pitch,
      blackHoleSize: live.blackHoleSize,
      setYaw: (yaw: number) => commit({ yaw }),
      setPitch: (pitch: number) => commit({ pitch }),
      setBlackHoleSize: (blackHoleSize: number) => commit({ blackHoleSize }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        window.location.reload();
      },
    },
  };
}
