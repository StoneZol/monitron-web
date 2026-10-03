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
  WARPBURST_DEFAULTS,
  WARPBURST_DRIVE_MAX,
  type WarpburstLive,
  type ReactiveChannel,
} from "./Warpburst.types";

const SCREEN_ID = "warpburst";
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);

type Stored = WarpburstLive & {
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...WARPBURST_DEFAULTS,
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

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  // Old garland* → twinkle* (title "twinkle" keys); drop legacy keys from save blob
  const {
    garland: legacyGarland,
    garlandSpeed: legacyGarlandSpeed,
    ...rest
  } = raw;

  const twinkleRaw =
    rest.twinkle !== undefined ? rest.twinkle : legacyGarland;
  const twinkleSpeedRaw =
    rest.twinkleSpeed !== undefined ? rest.twinkleSpeed : legacyGarlandSpeed;

  return {
    ...STORED_DEFAULTS,
    ...rest,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
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
    color: asHex(raw.color, STORED_DEFAULTS.color),
    colorPeak: asHex(raw.colorPeak, STORED_DEFAULTS.colorPeak),
    twinkle:
      twinkleRaw === undefined
        ? STORED_DEFAULTS.twinkle
        : Boolean(twinkleRaw),
    twinkleSpeed: clamp(
      Number(twinkleSpeedRaw),
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
    fogDetail: clamp(
      Number(raw.fogDetail),
      0,
      4,
      STORED_DEFAULTS.fogDetail,
    ),
    colorChannel: channel(raw.colorChannel, STORED_DEFAULTS.colorChannel),
    colorDrive: clamp(
      Number(raw.colorDrive),
      0,
      WARPBURST_DRIVE_MAX,
      STORED_DEFAULTS.colorDrive,
    ),
    speedChannel: channel(raw.speedChannel, STORED_DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(raw.speedDrive),
      0,
      WARPBURST_DRIVE_MAX,
      STORED_DEFAULTS.speedDrive,
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
const liveRef: { current: WarpburstLive } = { current: WARPBURST_DEFAULTS };

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

export default function useWarpburstHook() {
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
      cameraBank: live.cameraBank,
      color: live.color,
      colorPeak: live.colorPeak,
      twinkle: live.twinkle,
      twinkleSpeed: live.twinkleSpeed,
      twinkleS: live.twinkleS,
      twinkleL: live.twinkleL,
      saturation: live.saturation,
      fogDetail: live.fogDetail,
      colorChannel: live.colorChannel,
      colorDrive: live.colorDrive,
      speedChannel: live.speedChannel,
      speedDrive: live.speedDrive,
      driveMax: WARPBURST_DRIVE_MAX,
      setFlightSpeed: (flightSpeed: number) => commit({ flightSpeed }),
      setCameraBank: (cameraBank: number) => commit({ cameraBank }),
      setColor: (color: string) => commit({ color }),
      setColorPeak: (colorPeak: string) => commit({ colorPeak }),
      setTwinkle: (twinkle: boolean) => commit({ twinkle }),
      setTwinkleSpeed: (twinkleSpeed: number) => commit({ twinkleSpeed }),
      setTwinkleS: (twinkleS: number) => commit({ twinkleS }),
      setTwinkleL: (twinkleL: number) => commit({ twinkleL }),
      setSaturation: (saturation: number) => commit({ saturation }),
      setFogDetail: (fogDetail: number) => commit({ fogDetail }),
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
