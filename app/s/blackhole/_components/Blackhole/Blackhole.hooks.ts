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
import { resetFxOverlay } from "@/components/FxOverlay";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import {
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";
import {
  BLACKHOLE_COLOR_DRIVE_MAX,
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

function asHex(v: unknown, fallback: string): string {
  if (!isHex(v)) return fallback;
  return v.startsWith("#") ? v : `#${v}`;
}

/** Old prefs used Shadertoy mouseY 0..1 — map to degrees once. */
function migratePitch(raw: Record<string, unknown>): number {
  const pitch = Number(raw.pitch);
  if (!Number.isFinite(pitch)) return STORED_DEFAULTS.pitch;
  if (pitch >= 0 && pitch <= 1 && !("pitchUnit" in raw)) {
    const angleY = 2 * pitch * Math.PI + 0.1 + Math.PI;
    let deg = (angleY * 180) / Math.PI;
    deg = ((deg + 180) % 360) - 180;
    return clamp(deg, 1, 179, STORED_DEFAULTS.pitch);
  }
  return clamp(pitch, 1, 179, STORED_DEFAULTS.pitch);
}

/** Legacy colorSpeed was deg/sec; twinkleSpeed is × (1 ≈ 60°/s). */
function migrateTwinkleSpeed(raw: unknown, legacyColorSpeed: unknown): number {
  if (raw !== undefined && Number.isFinite(Number(raw))) {
    return clamp(Number(raw), 0, 4, TWINKLE_DEFAULT_SPEED);
  }
  const deg = Number(legacyColorSpeed);
  if (Number.isFinite(deg) && deg > 0) {
    return clamp(deg / 60, 0, 4, TWINKLE_DEFAULT_SPEED);
  }
  return TWINKLE_DEFAULT_SPEED;
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  const channel = (v: unknown, fallback: ReactiveChannel): ReactiveChannel =>
    typeof v === "string" && CHANNELS.has(v as ReactiveChannel)
      ? (v as ReactiveChannel)
      : fallback;

  const { colorSpeed: legacyColorSpeed, ...rest } = raw as Record<
    string,
    unknown
  >;

  const holeColor = asHex(
    rest.holeColor ?? rest.diskInner,
    STORED_DEFAULTS.holeColor,
  );
  const holeColorPeak = asHex(
    rest.holeColorPeak ?? rest.diskOuter,
    STORED_DEFAULTS.holeColorPeak,
  );

  const yawChannel = channel(
    rest.yawChannel ?? rest.spaceChannel,
    STORED_DEFAULTS.yawChannel,
  );
  const yawDrive = clamp(
    Number(rest.yawDrive ?? rest.spaceDrive),
    0,
    BLACKHOLE_DRIVE_MAX,
    STORED_DEFAULTS.yawDrive,
  );

  return {
    ...STORED_DEFAULTS,
    ...rest,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    holeColor,
    holeColorPeak,
    holeTwinkle: Boolean(rest.holeTwinkle),
    holeTwinkleSpeed: migrateTwinkleSpeed(
      rest.holeTwinkleSpeed,
      legacyColorSpeed,
    ),
    holeTwinkleS: clamp(
      Number(rest.holeTwinkleS),
      0,
      100,
      STORED_DEFAULTS.holeTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    holeTwinkleL: clamp(
      Number(rest.holeTwinkleL),
      0,
      100,
      STORED_DEFAULTS.holeTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    nebulaEnabled:
      rest.nebulaEnabled === undefined
        ? STORED_DEFAULTS.nebulaEnabled
        : Boolean(rest.nebulaEnabled),
    nebulaTwinkle: Boolean(rest.nebulaTwinkle),
    nebulaTwinkleSpeed: migrateTwinkleSpeed(
      rest.nebulaTwinkleSpeed,
      legacyColorSpeed,
    ),
    nebulaTwinkleS: clamp(
      Number(rest.nebulaTwinkleS),
      0,
      100,
      STORED_DEFAULTS.nebulaTwinkleS ?? TWINKLE_DEFAULT_S,
    ),
    nebulaTwinkleL: clamp(
      Number(rest.nebulaTwinkleL),
      0,
      100,
      STORED_DEFAULTS.nebulaTwinkleL ?? TWINKLE_DEFAULT_L,
    ),
    nebulaColor: asHex(rest.nebulaColor, STORED_DEFAULTS.nebulaColor),
    nebulaColorPeak: asHex(
      rest.nebulaColorPeak,
      STORED_DEFAULTS.nebulaColorPeak,
    ),
    nebulaIntensity: clamp(
      Number(rest.nebulaIntensity),
      0,
      3,
      STORED_DEFAULTS.nebulaIntensity,
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
    beltAngle: clamp(
      Number(rest.beltAngle),
      -180,
      180,
      STORED_DEFAULTS.beltAngle,
    ),
    yawSpeed: (() => {
      const v = Number(raw.yawSpeed);
      if (!Number.isFinite(v)) return STORED_DEFAULTS.yawSpeed;
      if (v > 2)
        return clamp(v * (Math.PI / 180), 0, 2, STORED_DEFAULTS.yawSpeed);
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
      BLACKHOLE_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.holeDrive,
    ),
    yawChannel,
    yawDrive,
    nebulaChannel: channel(rest.nebulaChannel, STORED_DEFAULTS.nebulaChannel),
    nebulaDrive: clamp(
      Number(rest.nebulaDrive),
      0,
      BLACKHOLE_COLOR_DRIVE_MAX,
      STORED_DEFAULTS.nebulaDrive,
    ),
    scalePunch: Boolean(
      rest.scalePunch === undefined
        ? STORED_DEFAULTS.scalePunch
        : rest.scalePunch,
    ),
    scaleDrive: (() => {
      const v = Number(rest.scaleDrive);
      if (!Number.isFinite(v)) return STORED_DEFAULTS.scaleDrive;
      if (v < 1) return clamp(v / 0.01, 1, 16, STORED_DEFAULTS.scaleDrive);
      return clamp(v, 1, 16, STORED_DEFAULTS.scaleDrive);
    })(),
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
      beltAngle: live.beltAngle,
      blackHoleSize: live.blackHoleSize,
      diskRotationSpeed: live.diskRotationSpeed,
      holeColor: live.holeColor,
      holeColorPeak: live.holeColorPeak,
      holeTwinkle: live.holeTwinkle,
      holeTwinkleSpeed: live.holeTwinkleSpeed,
      holeTwinkleS: live.holeTwinkleS,
      holeTwinkleL: live.holeTwinkleL,
      nebulaEnabled: live.nebulaEnabled,
      nebulaTwinkle: live.nebulaTwinkle,
      nebulaTwinkleSpeed: live.nebulaTwinkleSpeed,
      nebulaTwinkleS: live.nebulaTwinkleS,
      nebulaTwinkleL: live.nebulaTwinkleL,
      nebulaColor: live.nebulaColor,
      nebulaColorPeak: live.nebulaColorPeak,
      nebulaIntensity: live.nebulaIntensity,
      holeChannel: live.holeChannel,
      holeDrive: live.holeDrive,
      yawChannel: live.yawChannel,
      yawDrive: live.yawDrive,
      nebulaChannel: live.nebulaChannel,
      nebulaDrive: live.nebulaDrive,
      scalePunch: live.scalePunch,
      scaleDrive: live.scaleDrive,
      colorDriveMax: BLACKHOLE_COLOR_DRIVE_MAX,
      speedDriveMax: BLACKHOLE_DRIVE_MAX,
      setYawSpeed: (yawSpeed: number) => commit({ yawSpeed }),
      setPitch: (pitch: number) => commit({ pitch }),
      setBeltAngle: (beltAngle: number) => commit({ beltAngle }),
      setBlackHoleSize: (blackHoleSize: number) => commit({ blackHoleSize }),
      setDiskRotationSpeed: (diskRotationSpeed: number) =>
        commit({ diskRotationSpeed }),
      setHoleColor: (holeColor: string) => commit({ holeColor }),
      setHoleColorPeak: (holeColorPeak: string) => commit({ holeColorPeak }),
      setHoleTwinkle: (holeTwinkle: boolean) => commit({ holeTwinkle }),
      setHoleTwinkleSpeed: (holeTwinkleSpeed: number) =>
        commit({ holeTwinkleSpeed }),
      setHoleTwinkleS: (holeTwinkleS: number) => commit({ holeTwinkleS }),
      setHoleTwinkleL: (holeTwinkleL: number) => commit({ holeTwinkleL }),
      setNebulaEnabled: (nebulaEnabled: boolean) => commit({ nebulaEnabled }),
      setNebulaTwinkle: (nebulaTwinkle: boolean) => commit({ nebulaTwinkle }),
      setNebulaTwinkleSpeed: (nebulaTwinkleSpeed: number) =>
        commit({ nebulaTwinkleSpeed }),
      setNebulaTwinkleS: (nebulaTwinkleS: number) => commit({ nebulaTwinkleS }),
      setNebulaTwinkleL: (nebulaTwinkleL: number) => commit({ nebulaTwinkleL }),
      setNebulaColor: (nebulaColor: string) => commit({ nebulaColor }),
      setNebulaColorPeak: (nebulaColorPeak: string) =>
        commit({ nebulaColorPeak }),
      setNebulaIntensity: (nebulaIntensity: number) =>
        commit({ nebulaIntensity }),
      setHoleChannel: (holeChannel: ReactiveChannel) => commit({ holeChannel }),
      setHoleDrive: (holeDrive: number) => commit({ holeDrive }),
      setYawChannel: (yawChannel: ReactiveChannel) => commit({ yawChannel }),
      setYawDrive: (yawDrive: number) => commit({ yawDrive }),
      setNebulaChannel: (nebulaChannel: ReactiveChannel) =>
        commit({ nebulaChannel }),
      setNebulaDrive: (nebulaDrive: number) => commit({ nebulaDrive }),
      setScalePunch: (scalePunch: boolean) => commit({ scalePunch }),
      setScaleDrive: (scaleDrive: number) => commit({ scaleDrive }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
