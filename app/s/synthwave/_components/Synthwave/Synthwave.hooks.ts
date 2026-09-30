"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
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
    PERSPECTIVE_MAX,
    PERSPECTIVE_MIN,
} from "./Synthwave.constants";

/** Ideal-start pack (tuned in-app; reset restores these). */
export const SYNTHWAVE_DEFAULTS: SynthwaveLive = {
    roadColor: "#ff0033",
    roadColorPeak: "#ff6699",
    roadFar: "#0000ff",
    roadFarPeak: "#66aaff",
    roadFloor: "#000000",
    roadGlow: 25,
    roadThickness: 1.5,
    roadSpeed: 2,
    sunRim: "#e69100",
    sunRimPeak: "#ff7b00",
    sunMid: "#aa00cc",
    sunMidPeak: "#ff00d0",
    sunCore: "#ff0059",
    sunSize: 2.5,
    sunBrightness: 1,
    sunGradientStart: 0.8,
    sunGlowBrightness: 1,
    mountPeak: "#3a1470",
    wallAngle: -90,
    wallOffset: 6,
    wallPerspective: 40,
    perspV2: true,
    roadLength: 0.2,
    skyTop: "#a202f7",
    skyTopPeak: "#ee00ff",
    skyHorizon: "#330028",
    skyHorizonPeak: "#5f006b",
    skySpeed: 2,
    skyDirection: 0,
    roadChannel: "bass",
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
    const legacy = raw as SynthwaveLive & {
        cityColor?: string;
        mountIdle?: string;
        terrainMode?: string;
        mountSpeed?: number;
        fogTwinkle?: boolean;
    };
    const legacyMode = legacy.terrainMode;
    const rest = { ...raw } as SynthwaveLive & Record<string, unknown>;
    delete rest.cityColor;
    delete rest.mountIdle;
    delete rest.terrainMode;

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
    next.skyTwinkle = Boolean(
        next.skyTwinkle ||
        (legacy.fogTwinkle !== undefined ? legacy.fogTwinkle : false),
    );
    delete (next as { fogTwinkle?: boolean }).fogTwinkle;
    if (typeof next.colorSpeed !== "number" || !Number.isFinite(next.colorSpeed)) {
        next.colorSpeed = SYNTHWAVE_DEFAULTS.colorSpeed;
    }
    next.colorSpeed = Math.min(180, Math.max(0, next.colorSpeed));
    if (typeof next.skySpeed !== "number" || !Number.isFinite(next.skySpeed)) {
        next.skySpeed = SYNTHWAVE_DEFAULTS.skySpeed;
    }
    next.skySpeed = Math.min(3, Math.max(0, next.skySpeed));
    if (
        typeof next.skyDirection !== "number" ||
        !Number.isFinite(next.skyDirection)
    ) {
        next.skyDirection = SYNTHWAVE_DEFAULTS.skyDirection;
    }
    // wrap to −180…180
    next.skyDirection = ((((next.skyDirection + 180) % 360) + 360) % 360) - 180;
    // idle→peak pairs (legacy single color = idle; peak defaults if missing)
    const peakOr = (v: unknown, fallback: string, idle: string) =>
        typeof v === "string" && v.length > 0 ? v : fallback || idle;
    next.sunRimPeak = peakOr(
        next.sunRimPeak,
        SYNTHWAVE_DEFAULTS.sunRimPeak,
        next.sunRim,
    );
    next.sunMidPeak = peakOr(
        next.sunMidPeak,
        SYNTHWAVE_DEFAULTS.sunMidPeak,
        next.sunMid,
    );
    next.roadColorPeak = peakOr(
        next.roadColorPeak,
        SYNTHWAVE_DEFAULTS.roadColorPeak,
        next.roadColor,
    );
    next.roadFarPeak = peakOr(
        next.roadFarPeak,
        SYNTHWAVE_DEFAULTS.roadFarPeak,
        next.roadFar,
    );
    next.skyTopPeak = peakOr(
        next.skyTopPeak,
        SYNTHWAVE_DEFAULTS.skyTopPeak,
        next.skyTop,
    );
    next.skyHorizonPeak = peakOr(
        next.skyHorizonPeak,
        SYNTHWAVE_DEFAULTS.skyHorizonPeak,
        next.skyHorizon,
    );
    // migrate: old 20–120 from horizontal → lean from vertical (−90…+90)
    if (
        (typeof next.wallAngle !== "number" || !Number.isFinite(next.wallAngle)) &&
        typeof legacy.mountSpeed === "number"
    ) {
        next.wallAngle = Math.min(
            90,
            Math.max(-90, 25 + legacy.mountSpeed * 15 - 90),
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

let cached: SynthwaveLive | null = null;
/** Stable bridge for R3F useFrame — updated only in read/writePrefs, never during render. */
const liveRef: { current: SynthwaveLive } = { current: SYNTHWAVE_DEFAULTS };

function readPrefs(): SynthwaveLive {
    if (cached) return cached;
    cached = migratePrefs(
        loadScreenPrefs(SCREEN_ID, { ...SYNTHWAVE_DEFAULTS }),
    );
    liveRef.current = cached;
    return cached;
}

function writePrefs(next: SynthwaveLive) {
    cached = next;
    liveRef.current = next;
    saveScreenPrefs(SCREEN_ID, next);
    emit();
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
    const live = useSyncExternalStore(
        subscribe,
        readPrefs,
        () => SYNTHWAVE_DEFAULTS,
    );

    const commit = (patch: Partial<SynthwaveLive>) => {
        writePrefs({ ...readPrefs(), ...patch });
    };

    const visualizer = useAudioReactive({
        preferredSource: live.audioSource,
        onSourceChange: (audioSource) => commit({ audioSource }),
        preferredMicGate: live.micGate,
        onMicGateChange: (micGate) => commit({ micGate }),
        preferredPeakGain: live.peakGain,
        onPeakGainChange: (peakGain) => commit({ peakGain }),
    });

    useWakeLock();

    const controls = {
        ...live,
        driveMax: DRIVE_MAX,
        setRoadColor: (roadColor: string) => commit({ roadColor }),
        setRoadColorPeak: (roadColorPeak: string) => commit({ roadColorPeak }),
        setRoadFar: (roadFar: string) => commit({ roadFar }),
        setRoadFarPeak: (roadFarPeak: string) => commit({ roadFarPeak }),
        setRoadFloor: (roadFloor: string) => commit({ roadFloor }),
        setRoadGlow: (roadGlow: number) => commit({ roadGlow }),
        setRoadThickness: (roadThickness: number) => commit({ roadThickness }),
        setRoadSpeed: (roadSpeed: number) => commit({ roadSpeed }),
        setSunRim: (sunRim: string) => commit({ sunRim }),
        setSunRimPeak: (sunRimPeak: string) => commit({ sunRimPeak }),
        setSunMid: (sunMid: string) => commit({ sunMid }),
        setSunMidPeak: (sunMidPeak: string) => commit({ sunMidPeak }),
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
        setSkyTopPeak: (skyTopPeak: string) => commit({ skyTopPeak }),
        setSkyHorizon: (skyHorizon: string) => commit({ skyHorizon }),
        setSkyHorizonPeak: (skyHorizonPeak: string) => commit({ skyHorizonPeak }),
        setSkySpeed: (skySpeed: number) => commit({ skySpeed }),
        setSkyDirection: (skyDirection: number) => commit({ skyDirection }),
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
        reset: () => writePrefs({ ...SYNTHWAVE_DEFAULTS }),
        fullscreen: () => void toggleFullscreen(),
    };

    return { liveRef, controls, visualizer };
}
