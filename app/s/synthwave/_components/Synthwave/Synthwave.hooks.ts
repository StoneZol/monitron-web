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

/** Defaults match Wallpaper Engine neon_sunset material values */
export const SYNTHWAVE_DEFAULTS: SynthwaveLive = {
  roadColor: "#ff0033",
  roadFar: "#0000ff",
  roadFloor: "#1a001a",
  roadGlow: 14,
  roadSpeed: 1,
  sunRim: "#ffd90d",
  sunMid: "#ff4fa3",
  sunCore: "#ff0059",
  sunSize: 1,
  mountPeak: "#3a1470",
  wallAngle: 0,
  wallOffset: 4,
  wallPerspective: 0,
  roadLength: 0,
  terrainMode: "channel",
  skyTop: "#0d2666",
  skyHorizon: "#0d2666",
  roadChannel: "beat",
  mountChannel: "bass",
  sunChannel: "beat",
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
  const { cityColor: _c, mountIdle: _m, ...rest } = raw as SynthwaveLive & {
    cityColor?: string;
    mountIdle?: string;
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
  if (!CHANNELS.has(next.mountChannel))
    next.mountChannel = SYNTHWAVE_DEFAULTS.mountChannel;
  if (!CHANNELS.has(next.sunChannel))
    next.sunChannel = SYNTHWAVE_DEFAULTS.sunChannel;
  if (next.terrainMode !== "flat" && next.terrainMode !== "channel") {
    next.terrainMode = SYNTHWAVE_DEFAULTS.terrainMode;
  }
  // migrate: old 20–120 from horizontal → lean from vertical (−70…+90)
  const rawRec = raw as SynthwaveLive & { mountSpeed?: number };
  if (
    (typeof next.wallAngle !== "number" || !Number.isFinite(next.wallAngle)) &&
    typeof rawRec.mountSpeed === "number"
  ) {
    next.wallAngle = Math.min(
      90,
      Math.max(-70, 25 + rawRec.mountSpeed * 15 - 90),
    );
  }
  if (typeof next.wallAngle !== "number" || !Number.isFinite(next.wallAngle)) {
    next.wallAngle = SYNTHWAVE_DEFAULTS.wallAngle;
  }
  next.wallAngle = Math.min(90, Math.max(-70, next.wallAngle));
  if (typeof next.wallOffset !== "number" || !Number.isFinite(next.wallOffset)) {
    next.wallOffset = SYNTHWAVE_DEFAULTS.wallOffset;
  }
  next.wallOffset = Math.min(18, Math.max(1, next.wallOffset));
  if (
    typeof next.wallPerspective !== "number" ||
    !Number.isFinite(next.wallPerspective)
  ) {
    next.wallPerspective = SYNTHWAVE_DEFAULTS.wallPerspective;
  }
  next.wallPerspective = Math.min(12, Math.max(-12, next.wallPerspective));
  if (typeof next.roadLength !== "number" || !Number.isFinite(next.roadLength)) {
    next.roadLength = SYNTHWAVE_DEFAULTS.roadLength;
  }
  next.roadLength = Math.min(1, Math.max(0, next.roadLength));
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
    setRoadSpeed: (roadSpeed: number) => commit({ roadSpeed }),
    setSunRim: (sunRim: string) => commit({ sunRim }),
    setSunMid: (sunMid: string) => commit({ sunMid }),
    setSunCore: (sunCore: string) => commit({ sunCore }),
    setSunSize: (sunSize: number) => commit({ sunSize }),
    setMountPeak: (mountPeak: string) => commit({ mountPeak }),
    setWallAngle: (wallAngle: number) => commit({ wallAngle }),
    setWallOffset: (wallOffset: number) => commit({ wallOffset }),
    setWallPerspective: (wallPerspective: number) =>
      commit({ wallPerspective }),
    setRoadLength: (roadLength: number) => commit({ roadLength }),
    setTerrainMode: (terrainMode: SynthwaveLive["terrainMode"]) =>
      commit({ terrainMode }),
    setSkyTop: (skyTop: string) => commit({ skyTop }),
    setSkyHorizon: (skyHorizon: string) => commit({ skyHorizon }),
    setRoadChannel: (roadChannel: SynthwaveLive["roadChannel"]) =>
      commit({ roadChannel }),
    setMountChannel: (mountChannel: SynthwaveLive["mountChannel"]) =>
      commit({ mountChannel }),
    setSunChannel: (sunChannel: SynthwaveLive["sunChannel"]) =>
      commit({ sunChannel }),
    setDrive: (drive: number) => commit({ drive }),
    reset: () => commit({ ...SYNTHWAVE_DEFAULTS }),
    fullscreen: () => void toggleFullscreen(),
  };

  return { liveRef, controls, visualizer };
}
