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
  BLUE002_COLOR_DRIVE_MAX,
  BLUE002_DEFAULTS,
  BLUE002_DRIVE_MAX,
  BLUE002_RANGES,
  type Blue002CameraMode,
  type Blue002ColorMode,
  type Blue002Live,
  type ReactiveChannel,
} from "./Blue002.types";

const SCREEN_ID = "blue_002";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);
const COLOR_MODES = new Set<Blue002ColorMode>(["original", "twinkle"]);
const CAMERA_MODES = new Set<Blue002CameraMode>(["flex", "manual"]);

type Stored = Blue002Live & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...BLUE002_DEFAULTS,
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

function migrateColorMode(raw: Record<string, unknown>): Blue002ColorMode {
  const mode = raw.colorMode;
  if (typeof mode === "string" && COLOR_MODES.has(mode as Blue002ColorMode)) {
    return mode as Blue002ColorMode;
  }
  return STORED_DEFAULTS.colorMode;
}

function migrateCameraMode(raw: Record<string, unknown>): Blue002CameraMode {
  const mode = raw.cameraMode;
  // Old "stock" path removed — fall back to flex
  if (mode === "stock") return "flex";
  if (
    typeof mode === "string" &&
    CAMERA_MODES.has(mode as Blue002CameraMode)
  ) {
    return mode as Blue002CameraMode;
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
      BLUE002_RANGES.flightSpeed.min,
      BLUE002_RANGES.flightSpeed.max,
      STORED_DEFAULTS.flightSpeed,
    ),
    cameraMode: migrateCameraMode(raw),
    yaw: clamp(
      Number(raw.yaw),
      BLUE002_RANGES.yaw.min,
      BLUE002_RANGES.yaw.max,
      STORED_DEFAULTS.yaw,
    ),
    pitch: clamp(
      Number(raw.pitch),
      BLUE002_RANGES.pitch.min,
      BLUE002_RANGES.pitch.max,
      STORED_DEFAULTS.pitch,
    ),
    cameraBank: clamp(
      Number(raw.cameraBank),
      BLUE002_RANGES.cameraBank.min,
      BLUE002_RANGES.cameraBank.max,
      STORED_DEFAULTS.cameraBank,
    ),
    colorMode: migrateColorMode(raw),
    color: asHex(raw.color, STORED_DEFAULTS.color),
    colorPeak: asHex(raw.colorPeak, STORED_DEFAULTS.colorPeak),
    twinkleSpeed: clamp(
      Number(raw.twinkleSpeed),
      0,
      4,
      STORED_DEFAULTS.twinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    twinkleS: clamp(
      Number(raw.twinkleS),
      0,
      100,
      STORED_DEFAULTS.twinkleS ?? TWINKLE_DEFAULT_S,
    ),
    twinkleL: clamp(
      Number(raw.twinkleL),
      0,
      100,
      STORED_DEFAULTS.twinkleL ?? TWINKLE_DEFAULT_L,
    ),
    saturation: clamp(
      Number(raw.saturation),
      BLUE002_RANGES.saturation.min,
      BLUE002_RANGES.saturation.max,
      STORED_DEFAULTS.saturation,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      BLUE002_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      BLUE002_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
    accelChannel: channel(raw.accelChannel, STORED_DEFAULTS.accelChannel),
    accelDrive: clamp(
      Number(raw.accelDrive),
      0,
      BLUE002_DRIVE_MAX,
      STORED_DEFAULTS.accelDrive,
    ),
    camAccelChannel: channel(
      raw.camAccelChannel,
      STORED_DEFAULTS.camAccelChannel,
    ),
    camAccelDrive: clamp(
      Number(raw.camAccelDrive),
      0,
      BLUE002_DRIVE_MAX,
      STORED_DEFAULTS.camAccelDrive,
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
const liveRef: { current: Blue002Live } = {
  current: BLUE002_DEFAULTS,
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

export default function useBlue002Hook() {
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
      colorMode: live.colorMode,
      color: live.color,
      colorPeak: live.colorPeak,
      twinkleSpeed: live.twinkleSpeed,
      twinkleS: live.twinkleS,
      twinkleL: live.twinkleL,
      saturation: live.saturation,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      accelChannel: live.accelChannel,
      accelDrive: live.accelDrive,
      camAccelChannel: live.camAccelChannel,
      camAccelDrive: live.camAccelDrive,
      colorDriveMax: BLUE002_COLOR_DRIVE_MAX,
      speedDriveMax: BLUE002_DRIVE_MAX,
      accelDriveMax: BLUE002_DRIVE_MAX,
      camAccelDriveMax: BLUE002_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCameraMode: (cameraMode: Blue002CameraMode) => commit({ cameraMode }),
      setYaw: (yaw: number) => commit({ yaw }),
      setPitch: (pitch: number) => commit({ pitch }),
      setCameraBank: (cameraBank: number) => commit({ cameraBank }),
      setColorMode: (colorMode: Blue002ColorMode) => commit({ colorMode }),
      setColor: (color: string) => commit({ color }),
      setColorPeak: (colorPeak: string) => commit({ colorPeak }),
      setTwinkleSpeed: (twinkleSpeed: number) => commit({ twinkleSpeed }),
      setTwinkleS: (twinkleS: number) => commit({ twinkleS }),
      setTwinkleL: (twinkleL: number) => commit({ twinkleL }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setColorChannel: (colorChannel: ReactiveChannel) =>
        commit({ colorChannel }),
      setColorDrive: (colorDrive: number) => commit({ colorDrive }),
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
