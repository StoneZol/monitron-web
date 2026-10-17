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
  OBSERVANCE_COLOR_DRIVE_MAX,
  OBSERVANCE_DEFAULTS,
  OBSERVANCE_DRIVE_MAX,
  type CrossBaseLightMode,
  type ObservanceLive,
  type ReactiveChannel,
} from "./Observance.types";

const SCREEN_ID = "observance";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);
const BASE_LIGHT_MODES = new Set<CrossBaseLightMode>([
  "off",
  "sun",
  "custom",
  "twinkle",
]);

type Stored = ObservanceLive & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...OBSERVANCE_DEFAULTS,
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

function baseLightMode(
  raw: Record<string, unknown>,
  fallback: CrossBaseLightMode,
): CrossBaseLightMode {
  const mode = raw.crossBaseLightMode;
  if (typeof mode === "string" && BASE_LIGHT_MODES.has(mode as CrossBaseLightMode)) {
    return mode as CrossBaseLightMode;
  }
  // Migrate old boolean toggle → sun when on.
  if (raw.crossBaseLight === true) return "sun";
  if (raw.crossBaseLight === false) return "off";
  return fallback;
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
    crosses:
      raw.crosses === undefined ? STORED_DEFAULTS.crosses : Boolean(raw.crosses),
    crossesAir:
      raw.crossesAir === undefined
        ? STORED_DEFAULTS.crossesAir
        : Boolean(raw.crossesAir),
    crossesFlip:
      raw.crossesFlip === undefined
        ? STORED_DEFAULTS.crossesFlip
        : Boolean(raw.crossesFlip),
    crossBaseLightMode: baseLightMode(raw, STORED_DEFAULTS.crossBaseLightMode),
    crossBaseColor: asHex(raw.crossBaseColor, STORED_DEFAULTS.crossBaseColor),
    crossBaseColorPeak: asHex(
      raw.crossBaseColorPeak,
      STORED_DEFAULTS.crossBaseColorPeak,
    ),
    crossBaseTwinkleSpeed: twinkleSpeed(
      raw.crossBaseTwinkleSpeed,
      STORED_DEFAULTS.crossBaseTwinkleSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    crossBaseTwinkleS: twinklePct(
      raw.crossBaseTwinkleS,
      STORED_DEFAULTS.crossBaseTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    crossBaseTwinkleL: twinklePct(
      raw.crossBaseTwinkleL,
      STORED_DEFAULTS.crossBaseTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    crossSway: clamp(
      Number(raw.crossSway),
      0,
      2,
      STORED_DEFAULTS.crossSway,
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
    lightning:
      raw.lightning === undefined
        ? STORED_DEFAULTS.lightning
        : Boolean(raw.lightning),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      OBSERVANCE_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      OBSERVANCE_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
    accelChannel: channel(raw.accelChannel, STORED_DEFAULTS.accelChannel),
    accelDrive: clamp(
      Number(raw.accelDrive),
      0,
      OBSERVANCE_DRIVE_MAX,
      STORED_DEFAULTS.accelDrive,
    ),
    camAccelChannel: channel(
      raw.camAccelChannel,
      STORED_DEFAULTS.camAccelChannel,
    ),
    camAccelDrive: clamp(
      Number(raw.camAccelDrive),
      0,
      OBSERVANCE_DRIVE_MAX,
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
const liveRef: { current: ObservanceLive } = { current: OBSERVANCE_DEFAULTS };

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

export default function useObservanceHook() {
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
      crosses: live.crosses,
      crossesAir: live.crossesAir,
      crossesFlip: live.crossesFlip,
      crossBaseLightMode: live.crossBaseLightMode,
      crossBaseColor: live.crossBaseColor,
      crossBaseColorPeak: live.crossBaseColorPeak,
      crossBaseTwinkleSpeed: live.crossBaseTwinkleSpeed,
      crossBaseTwinkleS: live.crossBaseTwinkleS,
      crossBaseTwinkleL: live.crossBaseTwinkleL,
      crossSway: live.crossSway,
      cameraBank: live.cameraBank,
      sunColor: live.sunColor,
      sunColorPeak: live.sunColorPeak,
      sunTwinkle: live.sunTwinkle,
      sunTwinkleSpeed: live.sunTwinkleSpeed,
      sunTwinkleS: live.sunTwinkleS,
      sunTwinkleL: live.sunTwinkleL,
      lightning: live.lightning,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      accelChannel: live.accelChannel,
      accelDrive: live.accelDrive,
      camAccelChannel: live.camAccelChannel,
      camAccelDrive: live.camAccelDrive,
      colorDriveMax: OBSERVANCE_COLOR_DRIVE_MAX,
      speedDriveMax: OBSERVANCE_DRIVE_MAX,
      accelDriveMax: OBSERVANCE_DRIVE_MAX,
      camAccelDriveMax: OBSERVANCE_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCrosses: (crosses: boolean) => commit({ crosses }),
      setCrossesAir: (crossesAir: boolean) => commit({ crossesAir }),
      setCrossesFlip: (crossesFlip: boolean) => commit({ crossesFlip }),
      setCrossBaseLightMode: (crossBaseLightMode: CrossBaseLightMode) =>
        commit({ crossBaseLightMode }),
      setCrossBaseColor: (crossBaseColor: string) =>
        commit({ crossBaseColor }),
      setCrossBaseColorPeak: (crossBaseColorPeak: string) =>
        commit({ crossBaseColorPeak }),
      setCrossBaseTwinkleSpeed: (crossBaseTwinkleSpeed: number) =>
        commit({ crossBaseTwinkleSpeed }),
      setCrossBaseTwinkleS: (crossBaseTwinkleS: number) =>
        commit({ crossBaseTwinkleS }),
      setCrossBaseTwinkleL: (crossBaseTwinkleL: number) =>
        commit({ crossBaseTwinkleL }),
      setCrossSway: (crossSway: number) => commit({ crossSway }),
      setCameraBank: (cameraBank: number) => commit({ cameraBank }),
      setSunColor: (sunColor: string) => commit({ sunColor }),
      setSunColorPeak: (sunColorPeak: string) => commit({ sunColorPeak }),
      setSunTwinkle: (sunTwinkle: boolean) => commit({ sunTwinkle }),
      setSunTwinkleSpeed: (sunTwinkleSpeed: number) =>
        commit({ sunTwinkleSpeed }),
      setSunTwinkleS: (sunTwinkleS: number) => commit({ sunTwinkleS }),
      setSunTwinkleL: (sunTwinkleL: number) => commit({ sunTwinkleL }),
      setLightning: (lightning: boolean) => commit({ lightning }),
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
