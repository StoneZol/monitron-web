"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  migrateAudioSource,
  MIC_GAIN_DEFAULT,
  MIC_GATE_DEFAULT,
  normalizeMicGain,
  normalizeMicGate,
  normalizePeakGain,
  PEAK_GAIN_DEFAULT,
  useAudioReactive,
  type AudioSource,
} from "@/hooks/useAudioReactive";
import { resetFxOverlay } from "@/components/FxOverlay";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import { onTabSyncApply } from "@/lib/tabSyncHotApply";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";
import {
  DARKTERRAIN_COLOR_DRIVE_MAX,
  DARKTERRAIN_DEFAULTS,
  DARKTERRAIN_DRIVE_MAX,
  type DarkterrainLive,
  type ReactiveChannel,
} from "./Darkterrain.types";

const SCREEN_ID = "darkterrain";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);

type Stored = DarkterrainLive & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...DARKTERRAIN_DEFAULTS,
  audioSource: "off",
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

function twinkleSpeed(v: unknown, fallback: number): number {
  return clamp(Number(v), 0, 4, fallback);
}

function twinklePct(v: unknown, fallback: number): number {
  return clamp(Number(v), 0, 100, fallback);
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
      0.1,
      3,
      STORED_DEFAULTS.flightSpeed,
    ),
    cameraBank: clamp(
      Number(raw.cameraBank),
      0,
      2,
      STORED_DEFAULTS.cameraBank,
    ),
    sunColor: asHex(raw.sunColor, STORED_DEFAULTS.sunColor),
    sunColorPeak: asHex(raw.sunColorPeak, STORED_DEFAULTS.sunColorPeak),
    sunTwinkle:
      raw.sunTwinkle === undefined
        ? STORED_DEFAULTS.sunTwinkle
        : Boolean(raw.sunTwinkle),
    sunTwinkleSpeed: twinkleSpeed(
      raw.sunTwinkleSpeed,
      STORED_DEFAULTS.sunTwinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    sunTwinkleS: twinklePct(
      raw.sunTwinkleS,
      STORED_DEFAULTS.sunTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    sunTwinkleL: twinklePct(
      raw.sunTwinkleL,
      STORED_DEFAULTS.sunTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    lightningRate: clamp(
      Number(raw.lightningRate),
      0,
      2,
      raw.lightning === false ? 0 : STORED_DEFAULTS.lightningRate,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      DARKTERRAIN_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      DARKTERRAIN_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
    accelChannel: channel(raw.accelChannel, STORED_DEFAULTS.accelChannel),
    accelDrive: clamp(
      Number(raw.accelDrive),
      0,
      DARKTERRAIN_DRIVE_MAX,
      STORED_DEFAULTS.accelDrive,
    ),
    camAccelChannel: channel(
      raw.camAccelChannel,
      STORED_DEFAULTS.camAccelChannel,
    ),
    camAccelDrive: clamp(
      Number(raw.camAccelDrive),
      0,
      DARKTERRAIN_DRIVE_MAX,
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
const liveRef: { current: DarkterrainLive } = {
  current: DARKTERRAIN_DEFAULTS,
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

export default function useDarkterrainHook() {
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
      cameraBank: live.cameraBank,
      sunColor: live.sunColor,
      sunColorPeak: live.sunColorPeak,
      sunTwinkle: live.sunTwinkle,
      sunTwinkleSpeed: live.sunTwinkleSpeed,
      sunTwinkleS: live.sunTwinkleS,
      sunTwinkleL: live.sunTwinkleL,
      lightningRate: live.lightningRate,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      accelChannel: live.accelChannel,
      accelDrive: live.accelDrive,
      camAccelChannel: live.camAccelChannel,
      camAccelDrive: live.camAccelDrive,
      colorDriveMax: DARKTERRAIN_COLOR_DRIVE_MAX,
      speedDriveMax: DARKTERRAIN_DRIVE_MAX,
      accelDriveMax: DARKTERRAIN_DRIVE_MAX,
      camAccelDriveMax: DARKTERRAIN_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCameraBank: (cameraBank: number) => commit({ cameraBank }),
      setSunColor: (sunColor: string) => commit({ sunColor }),
      setSunColorPeak: (sunColorPeak: string) => commit({ sunColorPeak }),
      setSunTwinkle: (sunTwinkle: boolean) => commit({ sunTwinkle }),
      setSunTwinkleSpeed: (sunTwinkleSpeed: number) =>
        commit({ sunTwinkleSpeed }),
      setSunTwinkleS: (sunTwinkleS: number) => commit({ sunTwinkleS }),
      setSunTwinkleL: (sunTwinkleL: number) => commit({ sunTwinkleL }),
      setLightningRate: (lightningRate: number) => commit({ lightningRate }),
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
