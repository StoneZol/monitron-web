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

/** Old prefs used Shadertoy mouseY 0..1 — map to degrees once. */
function migratePitch(raw: Record<string, unknown>): number {
  const pitch = Number(raw.pitch);
  if (!Number.isFinite(pitch)) return STORED_DEFAULTS.pitch;
  // Legacy mouseY units were typically 0..1
  if (pitch >= 0 && pitch <= 1 && !("pitchUnit" in raw)) {
    const angleY = 2 * pitch * Math.PI + 0.1 + Math.PI;
    let deg = (angleY * 180) / Math.PI;
    deg = ((deg + 180) % 360) - 180;
    return clamp(deg, -180, 180, STORED_DEFAULTS.pitch);
  }
  return clamp(pitch, -180, 180, STORED_DEFAULTS.pitch);
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
    flightSpeed: clamp(
      Number(raw.flightSpeed),
      0.05,
      8,
      STORED_DEFAULTS.flightSpeed,
    ),
    blackHoleSize: clamp(
      Number(raw.blackHoleSize),
      0.05,
      2,
      STORED_DEFAULTS.blackHoleSize,
    ),
    pitch: migratePitch(raw),
    yawSpeed: (() => {
      const v = Number(raw.yawSpeed);
      if (!Number.isFinite(v)) return STORED_DEFAULTS.yawSpeed;
      // Legacy UI stored °/s (~6); new unit is Shadertoy coeff (~0.1)
      if (v > 2) return clamp(v * (Math.PI / 180), 0, 2, STORED_DEFAULTS.yawSpeed);
      return clamp(v, 0, 2, STORED_DEFAULTS.yawSpeed);
    })(),
    diskRotationSpeed: clamp(
      Number(raw.diskRotationSpeed),
      0.05,
      5,
      STORED_DEFAULTS.diskRotationSpeed,
    ),
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
  // Mark degrees so migratePitch won't re-map 0..1 forever
  cached = { ...next, pitchUnit: "deg" } as Stored & { pitchUnit: string };
  liveRef.current = cached;
  saveScreenPrefs(SCREEN_ID, cached);
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
      yawSpeed: live.yawSpeed,
      pitch: live.pitch,
      blackHoleSize: live.blackHoleSize,
      diskRotationSpeed: live.diskRotationSpeed,
      setYawSpeed: (yawSpeed: number) => commit({ yawSpeed }),
      setPitch: (pitch: number) => commit({ pitch }),
      setBlackHoleSize: (blackHoleSize: number) => commit({ blackHoleSize }),
      setDiskRotationSpeed: (diskRotationSpeed: number) =>
        commit({ diskRotationSpeed }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        window.location.reload();
      },
    },
  };
}
