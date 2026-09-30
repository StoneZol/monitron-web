"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  MIC_GATE_DEFAULT,
  migrateAudioSource,
  normalizeMicGate,
  normalizePeakGain,
  PEAK_GAIN_DEFAULT,
  useAudioReactive,
} from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import type { SynthwaveLive } from "./Synthwave.types";
import {
  PERSPECTIVE_DEFAULT,
  PERSPECTIVE_MAX,
  PERSPECTIVE_MIN,
} from "./Synthwave.constants";

/** Defaults match Wallpaper Engine neon_sunset material values */
export const SYNTHWAVE_DEFAULTS: SynthwaveLive = {
  roadColor: "#ff0033",
  roadFar: "#0000ff",
  roadFloor: "#1a001a",
  roadGlow: 14,
  roadThickness: 1,
  roadSpeed: 1,
  sunRim: "#ffd90d",
  sunMid: "#ff4fa3",
  sunCore: "#ff0059",
  sunSize: 1,
  sunBrightness: 1,
  sunGradientStart: 0.75,
  sunGlowBrightness: 1,
  mountPeak: "#3a1470",
  wallAngle: 0,
  wallOffset: 4,
  wallPerspective: PERSPECTIVE_DEFAULT,
  perspV2: true,
  roadLength: 0,
  skyTop: "#0d2666",
  skyHorizon: "#0d2666",
  roadChannel: "beat",
  glowChannel: "bass",
  sunChannel: "bass",
  sunTwinkle: false,
  sunGlowTwinkle: false,
  gridTwinkle: false,
  skyTwinkle: false,
  colorSpeed: 40,
  drive: 2,
  audioSource: "off",
  micGate: MIC_GATE_DEFAULT,
  peakGain: PEAK_GAIN_DEFAULT,
};

const SCREEN_ID = "synthwave";
const DRIVE_MAX = 8;
const CHANNELS = new Set(["off", "bass", "mid", "high", "beat"]);

function migratePrefs(
  raw: SynthwaveLive & Record<string, unknown>,
): SynthwaveLive {
  const audioSource = migrateAudioSource(raw);
  const {
    cityColor: _c,
    mountIdle: _m,
    terrainMode: legacyMode,
    ...rest
  } = raw as SynthwaveLive & {
    cityColor?: string;
    mountIdle?: string;
    terrainMode?: string;
  };

  const next: SynthwaveLive = {
    ...SYNTHWAVE_DEFAULTS,
    ...rest,
    roadFar:
      typeof rest.roadFar === "string"
        ? rest.roadFar
        : SYNTHWAVE_DEFAULTS.roadFar,
    audioSource,
    micGate: normalizeMicGate(raw.micGate),
    peakGain: normalizePeakGain(raw.peakGain),
    drive:
      typeof raw.drive === "number" && Number.isFinite(raw.drive)
        ? Math.min(DRIVE_MAX, Math.max(0, raw.drive))
        : SYNTHWAVE_DEFAULTS.drive,
  };
  if (!CHANNELS.has(next.roadChannel))
    next.roadChannel = SYNTHWAVE_DEFAULTS.roadChannel;
  if (!CHANNELS.has(next.glowChannel))
    next.glowChannel = SYNTHWAVE_DEFAULTS.glowChannel;
  if (!CHANNELS.has(next.sunChannel))
    next.sunChannel = SYNTHWAVE_DEFAULTS.sunChannel;
  next.sunTwinkle = Boolean(next.sunTwinkle);
  next.sunGlowTwinkle = Boolean(next.sunGlowTwinkle);
  delete (next as { sunGlow?: boolean }).sunGlow;
  next.gridTwinkle = Boolean(next.gridTwinkle);
  // migrate: fogTwinkle → skyTwinkle (no fog layer — sky + horizon)
  const rawFog = (raw as { fogTwinkle?: boolean }).fogTwinkle;
  next.skyTwinkle = Boolean(
    next.skyTwinkle || (rawFog !== undefined ? rawFog : false),
  );
  delete (next as { fogTwinkle?: boolean }).fogTwinkle;
  if (typeof next.colorSpeed !== "number" || !Number.isFinite(next.colorSpeed)) {
    next.colorSpeed = SYNTHWAVE_DEFAULTS.colorSpeed;
  }
  next.colorSpeed = Math.min(180, Math.max(0, next.colorSpeed));
  // migrate: old 20–120 from horizontal → lean from vertical (−90…+90)
  const rawRec = raw as SynthwaveLive & { mountSpeed?: number };
  if (
    (typeof next.wallAngle !== "number" || !Number.isFinite(next.wallAngle)) &&
    typeof rawRec.mountSpeed === "number"
  ) {
    next.wallAngle = Math.min(
      90,
      Math.max(-90, 25 + rawRec.mountSpeed * 15 - 90),
    );
  }
  if (typeof next.wallAngle !== "number" || !Number.isFinite(next.wallAngle)) {
    next.wallAngle = SYNTHWAVE_DEFAULTS.wallAngle;
  }
  // migrate: old "flat" shape → walls folded flat over the road
  if (legacyMode === "flat") {
    next.wallAngle = 90;
  }
  next.wallAngle = Math.min(90, Math.max(-90, next.wallAngle));
  if (typeof next.wallOffset !== "number" || !Number.isFinite(next.wallOffset)) {
    next.wallOffset = SYNTHWAVE_DEFAULTS.wallOffset;
  }
  next.wallOffset = Math.min(18, Math.max(1, next.wallOffset));
  if (
    typeof next.wallPerspective !== "number" ||
    !Number.isFinite(next.wallPerspective)
  ) {
    next.wallPerspective = SYNTHWAVE_DEFAULTS.wallPerspective;
  } else if (!raw.perspV2) {
    // Old signed −12…+12 (UI −10…10) → 0…40; mid 0 → 20
    const old = Math.min(12, Math.max(-12, next.wallPerspective));
    next.wallPerspective =
      ((old + 12) / 24) * (PERSPECTIVE_MAX - PERSPECTIVE_MIN) +
      PERSPECTIVE_MIN;
  }
  next.wallPerspective = Math.min(
    PERSPECTIVE_MAX,
    Math.max(PERSPECTIVE_MIN, next.wallPerspective),
  );
  next.perspV2 = true;
  if (typeof next.roadLength !== "number" || !Number.isFinite(next.roadLength)) {
    next.roadLength = SYNTHWAVE_DEFAULTS.roadLength;
  }
  next.roadLength = Math.min(1, Math.max(0, next.roadLength));
  if (typeof next.roadGlow !== "number" || !Number.isFinite(next.roadGlow)) {
    next.roadGlow = SYNTHWAVE_DEFAULTS.roadGlow;
  }
  next.roadGlow = Math.min(40, Math.max(0, next.roadGlow));
  if (
    typeof next.roadThickness !== "number" ||
    !Number.isFinite(next.roadThickness)
  ) {
    next.roadThickness = SYNTHWAVE_DEFAULTS.roadThickness;
  }
  next.roadThickness = Math.min(3, Math.max(0.5, next.roadThickness));
  if (
    typeof next.sunBrightness !== "number" ||
    !Number.isFinite(next.sunBrightness)
  ) {
    next.sunBrightness = SYNTHWAVE_DEFAULTS.sunBrightness;
  }
  next.sunBrightness = Math.min(3, Math.max(0, next.sunBrightness));
  if (
    typeof next.sunGradientStart !== "number" ||
    !Number.isFinite(next.sunGradientStart)
  ) {
    next.sunGradientStart = SYNTHWAVE_DEFAULTS.sunGradientStart;
  }
  next.sunGradientStart = Math.min(1, Math.max(0, next.sunGradientStart));
  if (
    typeof next.sunGlowBrightness !== "number" ||
    !Number.isFinite(next.sunGlowBrightness)
  ) {
    next.sunGlowBrightness = SYNTHWAVE_DEFAULTS.sunGlowBrightness;
  }
  next.sunGlowBrightness = Math.min(3, Math.max(0, next.sunGlowBrightness));
  return next;
}

function useWakeLock() {
  useLayoutEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* ignore */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, []);
}

export default function useSynthwaveHook() {
  const liveRef = useRef<SynthwaveLive>({ ...SYNTHWAVE_DEFAULTS });
  const prefsRef = useRef<SynthwaveLive>({ ...SYNTHWAVE_DEFAULTS });

  const [live, setLive] = useState<SynthwaveLive>({ ...SYNTHWAVE_DEFAULTS });
  const [sourcePref, setSourcePref] = useState(SYNTHWAVE_DEFAULTS.audioSource);
  const [micGatePref, setMicGatePref] = useState(SYNTHWAVE_DEFAULTS.micGate);
  const [peakGainPref, setPeakGainPref] = useState(
    SYNTHWAVE_DEFAULTS.peakGain,
  );

  const persistSourceRef = useRef(
    (audioSource: SynthwaveLive["audioSource"]) => {
      prefsRef.current = { ...prefsRef.current, audioSource };
      liveRef.current = { ...liveRef.current, audioSource };
      saveScreenPrefs(SCREEN_ID, prefsRef.current);
      setSourcePref(audioSource);
    },
  );
  const persistMicGateRef = useRef((micGate: number) => {
    prefsRef.current = { ...prefsRef.current, micGate };
    liveRef.current = { ...liveRef.current, micGate };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setMicGatePref(micGate);
  });
  const persistPeakGainRef = useRef((peakGain: number) => {
    prefsRef.current = { ...prefsRef.current, peakGain };
    liveRef.current = { ...liveRef.current, peakGain };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setPeakGainPref(peakGain);
  });

  const visualizer = useAudioReactive({
    preferredSource: sourcePref,
    onSourceChange: (source) => persistSourceRef.current(source),
    preferredMicGate: micGatePref,
    onMicGateChange: (gate) => persistMicGateRef.current(gate),
    preferredPeakGain: peakGainPref,
    onPeakGainChange: (gain) => persistPeakGainRef.current(gain),
  });

  useWakeLock();

  const commit = (patch: Partial<SynthwaveLive>) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    liveRef.current = next;
    saveScreenPrefs(SCREEN_ID, next);
    setLive(next);
    if (patch.audioSource !== undefined) setSourcePref(patch.audioSource);
    if (patch.micGate !== undefined) setMicGatePref(patch.micGate);
    if (patch.peakGain !== undefined) setPeakGainPref(patch.peakGain);
  };

  useLayoutEffect(() => {
    const saved = migratePrefs(
      loadScreenPrefs(SCREEN_ID, { ...SYNTHWAVE_DEFAULTS }),
    );
    prefsRef.current = saved;
    liveRef.current = saved;
    setLive(saved);
    setSourcePref(saved.audioSource);
    setMicGatePref(saved.micGate);
    setPeakGainPref(saved.peakGain);
  }, []);

  const controls = {
    ...live,
    driveMax: DRIVE_MAX,
    setRoadColor: (roadColor: string) => commit({ roadColor }),
    setRoadFar: (roadFar: string) => commit({ roadFar }),
    setRoadFloor: (roadFloor: string) => commit({ roadFloor }),
    setRoadGlow: (roadGlow: number) => commit({ roadGlow }),
    setRoadThickness: (roadThickness: number) => commit({ roadThickness }),
    setRoadSpeed: (roadSpeed: number) => commit({ roadSpeed }),
    setSunRim: (sunRim: string) => commit({ sunRim }),
    setSunMid: (sunMid: string) => commit({ sunMid }),
    setSunCore: (sunCore: string) => commit({ sunCore }),
    setSunSize: (sunSize: number) => commit({ sunSize }),
    setSunBrightness: (sunBrightness: number) => commit({ sunBrightness }),
    setSunGradientStart: (sunGradientStart: number) =>
      commit({ sunGradientStart }),
    setSunGlowBrightness: (sunGlowBrightness: number) =>
      commit({ sunGlowBrightness }),
    setMountPeak: (mountPeak: string) => commit({ mountPeak }),
    setWallAngle: (wallAngle: number) => commit({ wallAngle }),
    setWallOffset: (wallOffset: number) => commit({ wallOffset }),
    setWallPerspective: (wallPerspective: number) =>
      commit({ wallPerspective }),
    setRoadLength: (roadLength: number) => commit({ roadLength }),
    setSkyTop: (skyTop: string) => commit({ skyTop }),
    setSkyHorizon: (skyHorizon: string) => commit({ skyHorizon }),
    setRoadChannel: (roadChannel: SynthwaveLive["roadChannel"]) =>
      commit({ roadChannel }),
    setGlowChannel: (glowChannel: SynthwaveLive["glowChannel"]) =>
      commit({ glowChannel }),
    setSunChannel: (sunChannel: SynthwaveLive["sunChannel"]) =>
      commit({ sunChannel }),
    setSunTwinkle: (sunTwinkle: boolean) => commit({ sunTwinkle }),
    setSunGlowTwinkle: (sunGlowTwinkle: boolean) => commit({ sunGlowTwinkle }),
    setGridTwinkle: (gridTwinkle: boolean) => commit({ gridTwinkle }),
    setSkyTwinkle: (skyTwinkle: boolean) => commit({ skyTwinkle }),
    setColorSpeed: (colorSpeed: number) => commit({ colorSpeed }),
    setDrive: (drive: number) => commit({ drive }),
    reset: () => commit({ ...SYNTHWAVE_DEFAULTS }),
    fullscreen: () => void toggleFullscreen(),
  };

  return { liveRef, controls, visualizer };
}
