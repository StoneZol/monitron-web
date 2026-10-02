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
  BLACKHOLE_DRIVE_MAX,
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

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#?[0-9a-fA-F]{6}$/.test(v);
}

/** Old prefs used Shadertoy mouseY 0..1 — map to degrees once. */
function migratePitch(raw: Record<string, unknown>): number {
  const pitch = Number(raw.pitch);
  if (!Number.isFinite(pitch)) return STORED_DEFAULTS.pitch;
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

  const legacy = raw as Record<string, unknown>;
  const holeColor = isHex(legacy.holeColor)
    ? legacy.holeColor.startsWith("#")
      ? legacy.holeColor
      : `#${legacy.holeColor}`
    : isHex(legacy.diskInner)
      ? (legacy.diskInner as string).startsWith("#")
        ? (legacy.diskInner as string)
        : `#${legacy.diskInner}`
      : STORED_DEFAULTS.holeColor;

  const holeColorPeak = isHex(legacy.holeColorPeak)
    ? legacy.holeColorPeak.startsWith("#")
      ? legacy.holeColorPeak
      : `#${legacy.holeColorPeak}`
    : isHex(legacy.diskOuter)
      ? (legacy.diskOuter as string).startsWith("#")
        ? (legacy.diskOuter as string)
        : `#${legacy.diskOuter}`
      : STORED_DEFAULTS.holeColorPeak;

  const yawChannel = channel(
    legacy.yawChannel ?? legacy.spaceChannel,
    STORED_DEFAULTS.yawChannel,
  );
  const yawDrive = clamp(
    Number(legacy.yawDrive ?? legacy.spaceDrive),
    0,
    BLACKHOLE_DRIVE_MAX,
    STORED_DEFAULTS.yawDrive,
  );

  return {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    holeColor,
    holeColorPeak,
    holeTwinkle: Boolean(legacy.holeTwinkle),
    colorSpeed: clamp(
      Number(legacy.colorSpeed),
      1,
      180,
      STORED_DEFAULTS.colorSpeed,
    ),
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
      if (v > 2) return clamp(v * (Math.PI / 180), 0, 2, STORED_DEFAULTS.yawSpeed);
      return clamp(v, 0, 2, STORED_DEFAULTS.yawSpeed);
    })(),
    diskRotationSpeed: clamp(
      Number(raw.diskRotationSpeed),
      0.05,
      5,
      STORED_DEFAULTS.diskRotationSpeed,
    ),
    holeChannel: channel(raw.holeChannel, STORED_DEFAULTS.holeChannel),
    holeDrive: clamp(
      Number(raw.holeDrive),
      0,
      BLACKHOLE_DRIVE_MAX,
      STORED_DEFAULTS.holeDrive,
    ),
    yawChannel,
    yawDrive,
    scalePunch: Boolean(
      legacy.scalePunch === undefined
        ? STORED_DEFAULTS.scalePunch
        : legacy.scalePunch,
    ),
    scaleDrive: clamp(
      Number(legacy.scaleDrive),
      0,
      BLACKHOLE_DRIVE_MAX,
      STORED_DEFAULTS.scaleDrive,
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
      holeColor: live.holeColor,
      holeColorPeak: live.holeColorPeak,
      holeTwinkle: live.holeTwinkle,
      colorSpeed: live.colorSpeed,
      holeChannel: live.holeChannel,
      holeDrive: live.holeDrive,
      yawChannel: live.yawChannel,
      yawDrive: live.yawDrive,
      scalePunch: live.scalePunch,
      scaleDrive: live.scaleDrive,
      driveMax: BLACKHOLE_DRIVE_MAX,
      setYawSpeed: (yawSpeed: number) => commit({ yawSpeed }),
      setPitch: (pitch: number) => commit({ pitch }),
      setBlackHoleSize: (blackHoleSize: number) => commit({ blackHoleSize }),
      setDiskRotationSpeed: (diskRotationSpeed: number) =>
        commit({ diskRotationSpeed }),
      setHoleColor: (holeColor: string) => commit({ holeColor }),
      setHoleColorPeak: (holeColorPeak: string) => commit({ holeColorPeak }),
      setHoleTwinkle: (holeTwinkle: boolean) => commit({ holeTwinkle }),
      setColorSpeed: (colorSpeed: number) => commit({ colorSpeed }),
      setHoleChannel: (holeChannel: ReactiveChannel) => commit({ holeChannel }),
      setHoleDrive: (holeDrive: number) => commit({ holeDrive }),
      setYawChannel: (yawChannel: ReactiveChannel) => commit({ yawChannel }),
      setYawDrive: (yawDrive: number) => commit({ yawDrive }),
      setScalePunch: (scalePunch: boolean) => commit({ scalePunch }),
      setScaleDrive: (scaleDrive: number) => commit({ scaleDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        window.location.reload();
      },
    },
  };
}
