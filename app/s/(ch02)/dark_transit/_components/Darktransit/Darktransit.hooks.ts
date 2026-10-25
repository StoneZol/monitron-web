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
  DARKTRANSIT_COLOR_DRIVE_MAX,
  DARKTRANSIT_DEFAULTS,
  DARKTRANSIT_DRIVE_MAX,
  DARKTRANSIT_RANGES,
  type DarktransitLive,
  type ReactiveChannel,
} from "./Darktransit.types";

const SCREEN_ID = "dark_transit";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);

type Stored = DarktransitLive & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...DARKTRANSIT_DEFAULTS,
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
      DARKTRANSIT_RANGES.flightSpeed.min,
      DARKTRANSIT_RANGES.flightSpeed.max,
      STORED_DEFAULTS.flightSpeed,
    ),
    cinemaBars: typeof raw.cinemaBars === "boolean"
      ? raw.cinemaBars
      : STORED_DEFAULTS.cinemaBars,
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
    orbColor: asHex(raw.orbColor, STORED_DEFAULTS.orbColor),
    orbColorPeak: asHex(raw.orbColorPeak, STORED_DEFAULTS.orbColorPeak),
    orbTwinkle: Boolean(raw.orbTwinkle),
    orbTwinkleSpeed: clamp(
      Number(raw.orbTwinkleSpeed),
      0,
      4,
      STORED_DEFAULTS.orbTwinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    orbTwinkleS: clamp(
      Number(raw.orbTwinkleS),
      0,
      100,
      STORED_DEFAULTS.orbTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    orbTwinkleL: clamp(
      Number(raw.orbTwinkleL),
      0,
      100,
      STORED_DEFAULTS.orbTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    saturation: clamp(
      Number(raw.saturation),
      DARKTRANSIT_RANGES.saturation.min,
      DARKTRANSIT_RANGES.saturation.max,
      STORED_DEFAULTS.saturation,
    ),
    wallChannel: channel(raw.wallChannel, STORED_DEFAULTS.wallChannel),
    wallDrive: clamp(
      Number(raw.wallDrive),
      0,
      DARKTRANSIT_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.wallDrive,
    ),
    orbChannel: channel(raw.orbChannel, STORED_DEFAULTS.orbChannel),
    orbDrive: clamp(
      Number(raw.orbDrive),
      0,
      DARKTRANSIT_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.orbDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      DARKTRANSIT_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
    accelChannel: channel(raw.accelChannel, STORED_DEFAULTS.accelChannel),
    accelDrive: clamp(
      Number(raw.accelDrive),
      0,
      DARKTRANSIT_DRIVE_MAX,
      STORED_DEFAULTS.accelDrive,
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
const liveRef: { current: DarktransitLive } = {
  current: DARKTRANSIT_DEFAULTS,
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

export default function useDarktransitHook() {
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
      cinemaBars: live.cinemaBars,
      wallColor: live.wallColor,
      wallColorPeak: live.wallColorPeak,
      wallTwinkle: live.wallTwinkle,
      wallTwinkleSpeed: live.wallTwinkleSpeed,
      wallTwinkleS: live.wallTwinkleS,
      wallTwinkleL: live.wallTwinkleL,
      orbColor: live.orbColor,
      orbColorPeak: live.orbColorPeak,
      orbTwinkle: live.orbTwinkle,
      orbTwinkleSpeed: live.orbTwinkleSpeed,
      orbTwinkleS: live.orbTwinkleS,
      orbTwinkleL: live.orbTwinkleL,
      saturation: live.saturation,
      wallChannel: live.wallChannel,
      wallDrive: live.wallDrive,
      orbChannel: live.orbChannel,
      orbDrive: live.orbDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      accelChannel: live.accelChannel,
      accelDrive: live.accelDrive,
      colorDriveMax: DARKTRANSIT_COLOR_DRIVE_MAX,
      speedDriveMax: DARKTRANSIT_DRIVE_MAX,
      accelDriveMax: DARKTRANSIT_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCinemaBars: (cinemaBars: boolean) => commit({ cinemaBars }),
      setWallColor: (wallColor: string) => commit({ wallColor }),
      setWallColorPeak: (wallColorPeak: string) => commit({ wallColorPeak }),
      setWallTwinkle: (wallTwinkle: boolean) => commit({ wallTwinkle }),
      setWallTwinkleSpeed: (wallTwinkleSpeed: number) =>
        commit({ wallTwinkleSpeed }),
      setWallTwinkleS: (wallTwinkleS: number) => commit({ wallTwinkleS }),
      setWallTwinkleL: (wallTwinkleL: number) => commit({ wallTwinkleL }),
      setOrbColor: (orbColor: string) => commit({ orbColor }),
      setOrbColorPeak: (orbColorPeak: string) => commit({ orbColorPeak }),
      setOrbTwinkle: (orbTwinkle: boolean) => commit({ orbTwinkle }),
      setOrbTwinkleSpeed: (orbTwinkleSpeed: number) =>
        commit({ orbTwinkleSpeed }),
      setOrbTwinkleS: (orbTwinkleS: number) => commit({ orbTwinkleS }),
      setOrbTwinkleL: (orbTwinkleL: number) => commit({ orbTwinkleL }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setWallChannel: (wallChannel: ReactiveChannel) => commit({ wallChannel }),
      setWallDrive: (wallDrive: number) => commit({ wallDrive }),
      setOrbChannel: (orbChannel: ReactiveChannel) => commit({ orbChannel }),
      setOrbDrive: (orbDrive: number) => commit({ orbDrive }),
      setSpeedChannel: (speedChannel: ReactiveChannel) =>
        commit({ speedChannel }),
      setSpeedDrive: (speedDrive: number) => commit({ speedDrive }),
      setAccelChannel: (accelChannel: ReactiveChannel) =>
        commit({ accelChannel }),
      setAccelDrive: (accelDrive: number) => commit({ accelDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
