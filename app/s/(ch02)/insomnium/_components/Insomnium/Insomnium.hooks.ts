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
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";
import {
  INSOMNIUM_COLOR_DRIVE_MAX,
  INSOMNIUM_DEFAULTS,
  INSOMNIUM_DRIVE_MAX,
  INSOMNIUM_RANGES,
  type ReactiveChannel,
  type InsomniumCameraMode,
  type InsomniumLive,
} from "./Insomnium.types";

const SCREEN_ID = "insomnium";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);
const CAMERA_MODES = new Set<InsomniumCameraMode>(["flex", "manual"]);

type Stored = InsomniumLive & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...INSOMNIUM_DEFAULTS,
  audioSource: "plugin",
  micGate: MIC_GATE_DEFAULT,
  micGain: MIC_GAIN_DEFAULT,
  peakGain: PEAK_GAIN_DEFAULT,
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

function migrateCameraMode(
  raw: Stored & Record<string, unknown>,
): InsomniumCameraMode {
  const mode = String(raw.cameraMode ?? "");
  if (mode === "stock") return "flex";
  if (CAMERA_MODES.has(mode as InsomniumCameraMode)) {
    return mode as InsomniumCameraMode;
  }
  return STORED_DEFAULTS.cameraMode;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  return {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    micGain: normalizeMicGain(raw.micGain),
    peakGain: normalizePeakGain(raw.peakGain),
    flightSpeed: clamp(
      Number(raw.flightSpeed),
      INSOMNIUM_RANGES.flightSpeed.min,
      INSOMNIUM_RANGES.flightSpeed.max,
      STORED_DEFAULTS.flightSpeed,
    ),
    cameraMode: migrateCameraMode(raw),
    yaw: clamp(
      Number(raw.yaw),
      INSOMNIUM_RANGES.yaw.min,
      INSOMNIUM_RANGES.yaw.max,
      STORED_DEFAULTS.yaw,
    ),
    pitch: clamp(
      Number(raw.pitch),
      INSOMNIUM_RANGES.pitch.min,
      INSOMNIUM_RANGES.pitch.max,
      STORED_DEFAULTS.pitch,
    ),
    cameraBank: clamp(
      Number(raw.cameraBank),
      INSOMNIUM_RANGES.cameraBank.min,
      INSOMNIUM_RANGES.cameraBank.max,
      STORED_DEFAULTS.cameraBank,
    ),
    wallColor: asHex(raw.wallColor, STORED_DEFAULTS.wallColor),
    wallColorPeak: asHex(raw.wallColorPeak, STORED_DEFAULTS.wallColorPeak),
    wallTwinkle: Boolean(raw.wallTwinkle),
    wallTwinkleSpeed: clamp(
      Number(raw.wallTwinkleSpeed),
      0,
      4,
      STORED_DEFAULTS.wallTwinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    wallTwinkleS: clamp(
      Number(raw.wallTwinkleS),
      0,
      100,
      STORED_DEFAULTS.wallTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    wallTwinkleL: clamp(
      Number(raw.wallTwinkleL),
      0,
      100,
      STORED_DEFAULTS.wallTwinkleL ?? 70,
    ),
    lightColor: asHex(raw.lightColor, STORED_DEFAULTS.lightColor),
    lightColorPeak: asHex(raw.lightColorPeak, STORED_DEFAULTS.lightColorPeak),
    lightTwinkle: Boolean(raw.lightTwinkle),
    lightTwinkleSpeed: clamp(
      Number(raw.lightTwinkleSpeed),
      0,
      4,
      STORED_DEFAULTS.lightTwinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    lightTwinkleS: clamp(
      Number(raw.lightTwinkleS),
      0,
      100,
      STORED_DEFAULTS.lightTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    lightTwinkleL: clamp(
      Number(raw.lightTwinkleL),
      0,
      100,
      STORED_DEFAULTS.lightTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    saturation: clamp(
      Number(raw.saturation),
      INSOMNIUM_RANGES.saturation.min,
      INSOMNIUM_RANGES.saturation.max,
      STORED_DEFAULTS.saturation,
    ),
    wallChannel: channel(raw.wallChannel, STORED_DEFAULTS.wallChannel),
    wallDrive: clamp(
      Number(raw.wallDrive),
      0,
      INSOMNIUM_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.wallDrive,
    ),
    lightChannel: channel(raw.lightChannel, STORED_DEFAULTS.lightChannel),
    lightDrive: clamp(
      Number(raw.lightDrive),
      0,
      INSOMNIUM_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.lightDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      INSOMNIUM_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
    accelChannel: channel(raw.accelChannel, STORED_DEFAULTS.accelChannel),
    accelDrive: clamp(
      Number(raw.accelDrive),
      0,
      INSOMNIUM_DRIVE_MAX,
      STORED_DEFAULTS.accelDrive,
    ),
    camAccelChannel: channel(
      raw.camAccelChannel,
      STORED_DEFAULTS.camAccelChannel,
    ),
    camAccelDrive: clamp(
      Number(raw.camAccelDrive),
      0,
      INSOMNIUM_DRIVE_MAX,
      STORED_DEFAULTS.camAccelDrive,
    ),
  };
}

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cached: Stored | null = null;
const liveRef: { current: InsomniumLive } = {
  current: INSOMNIUM_DEFAULTS,
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

export default function useInsomniumHook() {
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
      cameraMode: live.cameraMode,
      yaw: live.yaw,
      pitch: live.pitch,
      cameraBank: live.cameraBank,
      wallColor: live.wallColor,
      wallColorPeak: live.wallColorPeak,
      wallTwinkle: live.wallTwinkle,
      wallTwinkleSpeed: live.wallTwinkleSpeed,
      wallTwinkleS: live.wallTwinkleS,
      wallTwinkleL: live.wallTwinkleL,
      lightColor: live.lightColor,
      lightColorPeak: live.lightColorPeak,
      lightTwinkle: live.lightTwinkle,
      lightTwinkleSpeed: live.lightTwinkleSpeed,
      lightTwinkleS: live.lightTwinkleS,
      lightTwinkleL: live.lightTwinkleL,
      saturation: live.saturation,
      wallChannel: live.wallChannel,
      wallDrive: live.wallDrive,
      lightChannel: live.lightChannel,
      lightDrive: live.lightDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      accelChannel: live.accelChannel,
      accelDrive: live.accelDrive,
      camAccelChannel: live.camAccelChannel,
      camAccelDrive: live.camAccelDrive,
      colorDriveMax: INSOMNIUM_COLOR_DRIVE_MAX,
      speedDriveMax: INSOMNIUM_DRIVE_MAX,
      accelDriveMax: INSOMNIUM_DRIVE_MAX,
      camAccelDriveMax: INSOMNIUM_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCameraMode: (cameraMode: InsomniumCameraMode) =>
        commit({ cameraMode }),
      setYaw: (yaw: number) => commit({ yaw }),
      setPitch: (pitch: number) => commit({ pitch }),
      setCameraBank: (cameraBank: number) => commit({ cameraBank }),
      setWallColor: (wallColor: string) => commit({ wallColor }),
      setWallColorPeak: (wallColorPeak: string) => commit({ wallColorPeak }),
      setWallTwinkle: (wallTwinkle: boolean) => commit({ wallTwinkle }),
      setWallTwinkleSpeed: (wallTwinkleSpeed: number) =>
        commit({ wallTwinkleSpeed }),
      setWallTwinkleS: (wallTwinkleS: number) => commit({ wallTwinkleS }),
      setWallTwinkleL: (wallTwinkleL: number) => commit({ wallTwinkleL }),
      setLightColor: (lightColor: string) => commit({ lightColor }),
      setLightColorPeak: (lightColorPeak: string) => commit({ lightColorPeak }),
      setLightTwinkle: (lightTwinkle: boolean) => commit({ lightTwinkle }),
      setLightTwinkleSpeed: (lightTwinkleSpeed: number) =>
        commit({ lightTwinkleSpeed }),
      setLightTwinkleS: (lightTwinkleS: number) => commit({ lightTwinkleS }),
      setLightTwinkleL: (lightTwinkleL: number) => commit({ lightTwinkleL }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setWallChannel: (wallChannel: ReactiveChannel) => commit({ wallChannel }),
      setWallDrive: (wallDrive: number) => commit({ wallDrive }),
      setLightChannel: (lightChannel: ReactiveChannel) =>
        commit({ lightChannel }),
      setLightDrive: (lightDrive: number) => commit({ lightDrive }),
      setSpeedChannel: (speedChannel: ReactiveChannel) =>
        commit({ speedChannel }),
      setSpeedDrive: (speedDrive: number) => commit({ speedDrive }),
      setAccelChannel: (accelChannel: ReactiveChannel) =>
        commit({ accelChannel }),
      setAccelDrive: (accelDrive: number) => commit({ accelDrive }),
      setCamAccelChannel: (camAccelChannel: ReactiveChannel) =>
        commit({ camAccelChannel }),
      setCamAccelDrive: (camAccelDrive: number) => commit({ camAccelDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
