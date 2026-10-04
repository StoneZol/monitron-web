"use client";

import { useSyncExternalStore } from "react";
import {
  migrateAudioSource,
  normalizeMicGate,
  normalizePeakGain,
  useAudioReactive,
  type AudioSource,
} from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";
import {
  KALISTARNEST_COLOR_DRIVE_MAX,
  KALISTARNEST_DEFAULTS,
  KALISTARNEST_DRIVE_MAX,
  type KalistarnestCameraMode,
  type KalistarnestColorMode,
  type KalistarnestLive,
  type ReactiveChannel,
} from "./Kalistarnest.types";

const SCREEN_ID = "kalistarnest";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);
const CAMERA_MODES = new Set<KalistarnestCameraMode>(["manual", "flex"]);
const COLOR_MODES = new Set<KalistarnestColorMode>(["original", "custom"]);

type Stored = KalistarnestLive & {
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...KALISTARNEST_DEFAULTS,
  audioSource: "plugin",
  micGate: 0.02,
  peakGain: 1.5,
};

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#?[0-9a-fA-F]{6}$/.test(v);
}

function asHex(v: unknown, fallback: string): string {
  if (!isHex(v)) return fallback;
  return v.startsWith("#") ? v : `#${v}`;
}

function channel(v: unknown, fallback: ReactiveChannel): ReactiveChannel {
  return typeof v === "string" && CHANNELS.has(v as ReactiveChannel)
    ? (v as ReactiveChannel)
    : fallback;
}

function cameraMode(v: unknown): KalistarnestCameraMode {
  return typeof v === "string" && CAMERA_MODES.has(v as KalistarnestCameraMode)
    ? (v as KalistarnestCameraMode)
    : STORED_DEFAULTS.cameraMode;
}

function colorMode(v: unknown): KalistarnestColorMode {
  return typeof v === "string" && COLOR_MODES.has(v as KalistarnestColorMode)
    ? (v as KalistarnestColorMode)
    : STORED_DEFAULTS.colorMode;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const next: Stored = {
    ...STORED_DEFAULTS,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    flightSpeed: clamp(
      Number(raw.flightSpeed),
      0.1,
      3,
      STORED_DEFAULTS.flightSpeed,
    ),
    cameraMode: cameraMode(raw.cameraMode),
    yaw: clamp(Number(raw.yaw), -180, 180, STORED_DEFAULTS.yaw),
    pitch: clamp(Number(raw.pitch), -80, 80, STORED_DEFAULTS.pitch),
    cameraBank: clamp(
      Number(raw.cameraBank),
      0,
      2,
      STORED_DEFAULTS.cameraBank,
    ),
    colorMode: colorMode(raw.colorMode),
    starColor: asHex(raw.starColor, STORED_DEFAULTS.starColor),
    starColorPeak: asHex(raw.starColorPeak, STORED_DEFAULTS.starColorPeak),
    starTwinkle:
      raw.starTwinkle === undefined
        ? STORED_DEFAULTS.starTwinkle
        : Boolean(raw.starTwinkle),
    starTwinkleSpeed: clamp(
      Number(raw.starTwinkleSpeed),
      0,
      4,
      STORED_DEFAULTS.starTwinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    starTwinkleS: clamp(
      Number(raw.starTwinkleS),
      0,
      100,
      STORED_DEFAULTS.starTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    starTwinkleL: clamp(
      Number(raw.starTwinkleL),
      0,
      100,
      STORED_DEFAULTS.starTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    saturation: clamp(
      Number(raw.saturation),
      0,
      2,
      STORED_DEFAULTS.saturation,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      KALISTARNEST_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      KALISTARNEST_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
  };
  return next;
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
const liveRef: { current: KalistarnestLive } = {
  current: KALISTARNEST_DEFAULTS,
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

export default function useKalistarnestHook() {
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
      flightSpeed: live.flightSpeed,
      cameraMode: live.cameraMode,
      yaw: live.yaw,
      pitch: live.pitch,
      cameraBank: live.cameraBank,
      colorMode: live.colorMode,
      starColor: live.starColor,
      starColorPeak: live.starColorPeak,
      starTwinkle: live.starTwinkle,
      starTwinkleSpeed: live.starTwinkleSpeed,
      starTwinkleS: live.starTwinkleS,
      starTwinkleL: live.starTwinkleL,
      saturation: live.saturation,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      colorDriveMax: KALISTARNEST_COLOR_DRIVE_MAX,
      speedDriveMax: KALISTARNEST_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCameraMode: (cameraMode: KalistarnestCameraMode) =>
        commit({ cameraMode }),
      setYaw: (yaw: number) => commit({ yaw }),
      setPitch: (pitch: number) => commit({ pitch }),
      setCameraBank: (cameraBank: number) => commit({ cameraBank }),
      setColorMode: (colorMode: KalistarnestColorMode) =>
        commit({ colorMode }),
      setStarColor: (starColor: string) => commit({ starColor }),
      setStarColorPeak: (starColorPeak: string) => commit({ starColorPeak }),
      setStarTwinkle: (starTwinkle: boolean) => commit({ starTwinkle }),
      setStarTwinkleSpeed: (starTwinkleSpeed: number) =>
        commit({ starTwinkleSpeed }),
      setStarTwinkleS: (starTwinkleS: number) => commit({ starTwinkleS }),
      setStarTwinkleL: (starTwinkleL: number) => commit({ starTwinkleL }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setColorChannel: (colorChannel: ReactiveChannel) =>
        commit({ colorChannel }),
      setColorDrive: (colorDrive: number) => commit({ colorDrive }),
      setSpeedChannel: (speedChannel: ReactiveChannel) =>
        commit({ speedChannel }),
      setSpeedDrive: (speedDrive: number) => commit({ speedDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        window.location.reload();
      },
    },
  };
}
