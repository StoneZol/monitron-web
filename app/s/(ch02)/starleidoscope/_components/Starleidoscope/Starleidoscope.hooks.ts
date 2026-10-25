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
  STARLEIDOSCOPE_COLOR_DRIVE_MAX,
  STARLEIDOSCOPE_DEFAULTS,
  STARLEIDOSCOPE_DRIVE_MAX,
  STARLEIDOSCOPE_RANGES,
  type ReactiveChannel,
  type StarleidoscopeColorMode,
  type StarleidoscopeLive,
} from "./Starleidoscope.types";

const SCREEN_ID = "starleidoscope";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);
const COLOR_MODES = new Set<StarleidoscopeColorMode>([
  "original",
  "paletteTwinkle",
  "twinkle",
  "palette",
]);

type Stored = StarleidoscopeLive & {
  audioSource: AudioSource;
  micGate: number;
  micGain: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...STARLEIDOSCOPE_DEFAULTS,
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

function migrateColorMode(
  raw: Record<string, unknown>,
): StarleidoscopeColorMode {
  const mode = raw.colorMode;
  if (
    typeof mode === "string" &&
    COLOR_MODES.has(mode as StarleidoscopeColorMode)
  ) {
    return mode as StarleidoscopeColorMode;
  }
  return STORED_DEFAULTS.colorMode;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const colorSpeedRaw =
    raw.colorSpeed !== undefined ? raw.colorSpeed : raw.twinkleSpeed;
  return {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    micGain: normalizeMicGain(raw.micGain),
    peakGain: normalizePeakGain(raw.peakGain),
    patternSpeed: clamp(
      Number(raw.patternSpeed),
      STARLEIDOSCOPE_RANGES.patternSpeed.min,
      STARLEIDOSCOPE_RANGES.patternSpeed.max,
      STORED_DEFAULTS.patternSpeed,
    ),
    colorSpeed: clamp(
      Number(colorSpeedRaw),
      STARLEIDOSCOPE_RANGES.colorSpeed.min,
      STARLEIDOSCOPE_RANGES.colorSpeed.max,
      STORED_DEFAULTS.colorSpeed ?? TWINKLE_DEFAULT_SPEED,
    ),
    colorMode: migrateColorMode(raw),
    color: asHex(raw.color, STORED_DEFAULTS.color),
    colorPeak: asHex(raw.colorPeak, STORED_DEFAULTS.colorPeak),
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
      STARLEIDOSCOPE_RANGES.saturation.min,
      STARLEIDOSCOPE_RANGES.saturation.max,
      STORED_DEFAULTS.saturation,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      STARLEIDOSCOPE_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    colorAccelChannel: channel(
      raw.colorAccelChannel,
      STORED_DEFAULTS.colorAccelChannel,
    ),
    colorAccelDrive: clamp(
      Number(raw.colorAccelDrive),
      0,
      STARLEIDOSCOPE_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.colorAccelDrive,
    ),
    patternChannel: channel(
      raw.patternChannel,
      STORED_DEFAULTS.patternChannel,
    ),
    patternDrive: clamp(
      Number(raw.patternDrive),
      0,
      STARLEIDOSCOPE_DRIVE_MAX,
      STORED_DEFAULTS.patternDrive,
    ),
    patternAccelChannel: channel(
      raw.patternAccelChannel,
      STORED_DEFAULTS.patternAccelChannel,
    ),
    patternAccelDrive: clamp(
      Number(raw.patternAccelDrive),
      0,
      STARLEIDOSCOPE_DRIVE_MAX,
      STORED_DEFAULTS.patternAccelDrive,
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
const liveRef: { current: StarleidoscopeLive } = {
  current: STARLEIDOSCOPE_DEFAULTS,
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

export default function useStarleidoscopeHook() {
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
      patternSpeed: live.patternSpeed,
      colorSpeed: live.colorSpeed,
      colorMode: live.colorMode,
      color: live.color,
      colorPeak: live.colorPeak,
      twinkleS: live.twinkleS,
      twinkleL: live.twinkleL,
      saturation: live.saturation,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      colorAccelChannel: live.colorAccelChannel,
      colorAccelDrive: live.colorAccelDrive,
      patternChannel: live.patternChannel,
      patternDrive: live.patternDrive,
      patternAccelChannel: live.patternAccelChannel,
      patternAccelDrive: live.patternAccelDrive,
      colorDriveMax: STARLEIDOSCOPE_COLOR_DRIVE_MAX,
      colorAccelDriveMax: STARLEIDOSCOPE_COLOR_DRIVE_MAX,
      patternDriveMax: STARLEIDOSCOPE_DRIVE_MAX,
      patternAccelDriveMax: STARLEIDOSCOPE_DRIVE_MAX,
      setPatternSpeed: (patternSpeed: number) => commit({ patternSpeed }),
      setColorSpeed: (colorSpeed: number) => commit({ colorSpeed }),
      setColorMode: (colorMode: StarleidoscopeColorMode) =>
        commit({ colorMode }),
      setColor: (color: string) => commit({ color }),
      setColorPeak: (colorPeak: string) => commit({ colorPeak }),
      setTwinkleS: (twinkleS: number) => commit({ twinkleS }),
      setTwinkleL: (twinkleL: number) => commit({ twinkleL }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setColorChannel: (colorChannel: ReactiveChannel) =>
        commit({ colorChannel }),
      setColorDrive: (colorDrive: number) => commit({ colorDrive }),
      setColorAccelChannel: (colorAccelChannel: ReactiveChannel) =>
        commit({ colorAccelChannel }),
      setColorAccelDrive: (colorAccelDrive: number) =>
        commit({ colorAccelDrive }),
      setPatternChannel: (patternChannel: ReactiveChannel) =>
        commit({ patternChannel }),
      setPatternDrive: (patternDrive: number) => commit({ patternDrive }),
      setPatternAccelChannel: (patternAccelChannel: ReactiveChannel) =>
        commit({ patternAccelChannel }),
      setPatternAccelDrive: (patternAccelDrive: number) =>
        commit({ patternAccelDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
