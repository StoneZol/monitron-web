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
  FAIRYSMOKE_COLOR_DRIVE_MAX,
  FAIRYSMOKE_DEFAULTS,
  FAIRYSMOKE_DRIVE_MAX,
  type FairysmokeColorMode,
  type FairysmokeLive,
  type ReactiveChannel,
} from "./Fairysmoke.types";

const SCREEN_ID = "fairysmoke";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);
const COLOR_MODES = new Set<FairysmokeColorMode>([
  "original",
  "twinkle",
  "palette",
]);

type Stored = FairysmokeLive & {
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...FAIRYSMOKE_DEFAULTS,
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

function migrateColorMode(
  raw: Record<string, unknown>,
): FairysmokeColorMode {
  const mode = raw.colorMode;
  if (typeof mode === "string" && COLOR_MODES.has(mode as FairysmokeColorMode)) {
    return mode as FairysmokeColorMode;
  }
  // Legacy boolean twinkle → twinkle mode; else original (the good default)
  if (raw.twinkle === true) return "twinkle";
  return STORED_DEFAULTS.colorMode;
}

/** Density is ×40 multiplier (1…8). Legacy absolute step counts (>8) → /40. */
function migrateDensity(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return STORED_DEFAULTS.density;
  if (n > 8) return clamp(n / 40, 1, 8, STORED_DEFAULTS.density);
  return clamp(n, 1, 8, STORED_DEFAULTS.density);
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const next: Stored = {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    smokeSpeed: clamp(
      Number(raw.smokeSpeed),
      0.1,
      3,
      STORED_DEFAULTS.smokeSpeed,
    ),
    chaos: clamp(Number(raw.chaos), 0, 2, STORED_DEFAULTS.chaos),
    density: migrateDensity(raw.density),
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
      0,
      2,
      STORED_DEFAULTS.saturation,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      FAIRYSMOKE_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      FAIRYSMOKE_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
    ),
  };
  delete (next as { twinkle?: boolean }).twinkle;
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
const liveRef: { current: FairysmokeLive } = {
  current: FAIRYSMOKE_DEFAULTS,
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

export default function useFairysmokeHook() {
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
      smokeSpeed: live.smokeSpeed,
      chaos: live.chaos,
      density: live.density,
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
      colorDriveMax: FAIRYSMOKE_COLOR_DRIVE_MAX,
      speedDriveMax: FAIRYSMOKE_DRIVE_MAX,
      setSmokeSpeed: (smokeSpeed: number) => commit({ smokeSpeed }),
      setChaos: (chaos: number) => commit({ chaos }),
      setDensity: (density: number) => commit({ density }),
      setColorMode: (colorMode: FairysmokeColorMode) => commit({ colorMode }),
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
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        window.location.reload();
      },
    },
  };
}
