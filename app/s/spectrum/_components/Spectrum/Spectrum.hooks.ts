"use client";

import { useSyncExternalStore } from "react";
import {
  migrateAudioSource,
  normalizeMicGate,
  normalizePeakGain,
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
  SPECTRUM_DEFAULTS,
  SPECTRUM_RANGES,
  type SpectrumLive,
} from "./Spectrum.types";

const SCREEN_ID = "spectrum";

type Stored = SpectrumLive & {
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};

const STORED_DEFAULTS: Stored = {
  ...SPECTRUM_DEFAULTS,
  twinkleSpeed: TWINKLE_DEFAULT_SPEED,
  twinkleS: TWINKLE_DEFAULT_S,
  twinkleL: TWINKLE_DEFAULT_L,
  audioSource: "off",
  micGate: 0.02,
  peakGain: 1.5,
};

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#?[0-9a-fA-F]{6}$/.test(v);
}

function asHex(v: unknown, fallback: string): string {
  if (!isHex(v)) return fallback;
  return v.startsWith("#") ? v : `#${v}`;
}

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function migratePrefs(raw: Stored & Record<string, unknown>): Stored {
  return {
    ...STORED_DEFAULTS,
    ...raw,
    audioSource: migrateAudioSource(raw),
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    colorLow: asHex(raw.colorLow, STORED_DEFAULTS.colorLow),
    colorHigh: asHex(raw.colorHigh, STORED_DEFAULTS.colorHigh),
    twinkle: Boolean(raw.twinkle),
    twinkleSpeed: clamp(
      Number(raw.twinkleSpeed),
      0,
      4,
      STORED_DEFAULTS.twinkleSpeed,
    ),
    twinkleS: clamp(Number(raw.twinkleS), 0, 100, STORED_DEFAULTS.twinkleS),
    twinkleL: clamp(Number(raw.twinkleL), 0, 100, STORED_DEFAULTS.twinkleL),
    mirror: Boolean(raw.mirror),
    peakDecay: clamp(
      Number(raw.peakDecay),
      SPECTRUM_RANGES.peakDecay.min,
      SPECTRUM_RANGES.peakDecay.max,
      STORED_DEFAULTS.peakDecay,
    ),
    showRail: raw.showRail !== false,
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
const liveRef: { current: SpectrumLive } = { current: SPECTRUM_DEFAULTS };

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

export default function useSpectrumHook() {
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
      colorLow: live.colorLow,
      colorHigh: live.colorHigh,
      twinkle: live.twinkle,
      twinkleSpeed: live.twinkleSpeed,
      twinkleS: live.twinkleS,
      twinkleL: live.twinkleL,
      mirror: live.mirror,
      peakDecay: live.peakDecay,
      showRail: live.showRail,
      setColorLow: (colorLow: string) => commit({ colorLow }),
      setColorHigh: (colorHigh: string) => commit({ colorHigh }),
      setTwinkle: (twinkle: boolean) => commit({ twinkle }),
      setTwinkleSpeed: (twinkleSpeed: number) => commit({ twinkleSpeed }),
      setTwinkleS: (twinkleS: number) => commit({ twinkleS }),
      setTwinkleL: (twinkleL: number) => commit({ twinkleL }),
      setMirror: (mirror: boolean) => commit({ mirror }),
      setPeakDecay: (peakDecay: number) => commit({ peakDecay }),
      setShowRail: (showRail: boolean) => commit({ showRail }),
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        writePrefs({ ...STORED_DEFAULTS });
        resetFxOverlay(SCREEN_ID);
        window.location.reload();
      },
    },
  };
}
