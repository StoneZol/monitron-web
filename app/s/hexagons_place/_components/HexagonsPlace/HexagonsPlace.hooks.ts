"use client";

import { useSyncExternalStore } from "react";
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
import {
    TWINKLE_DEFAULT_L,
    TWINKLE_DEFAULT_S,
    TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";
import {
    HEXAGONS_COLOR_DRIVE_MAX,
    HEXAGONS_DRIVE_MAX,
    type HexagonsPlaceLive,
} from "./HexagonsPlace.types";

export const HEXAGONS_DEFAULTS: HexagonsPlaceLive = {
    edgeColor: "#ff9940",
    fogIdle: "#01317e",
    fogPeak: "#1a4a9e",
    fogFixed: false,
    fogParallel: false,
    fogParallelSpeed: 1,
    gridColor: "#ff9940",
    gridFixed: false,
    capGridIdle: "#1a4a20",
    capGridPeak: "#6dff4a",
    gridChannel: "beat",
    gridDrive: 1,
    gridScale: 1,
    twinkle: false,
    twinkleSpeed: TWINKLE_DEFAULT_SPEED,
    twinkleS: TWINKLE_DEFAULT_S,
    twinkleL: TWINKLE_DEFAULT_L,
    caps: false,
    capBassIdle: "#8f0070",
    capBassPeak: "#ff2ed2",
    capMidIdle: "#ccbb00",
    capMidPeak: "#fef606",
    capHighIdle: "#0644fe",
    capHighPeak: "#3496fe",
    capFogIdle: "#0c1a2e",
    capFogPeak: "#1a4a9e",
    fogChannel: "beat",
    fogDrive: 1,
    cameraAngle: 25,
    cameraHeight: 8,
    cameraOffset: 10,
    cameraZoom: 1,
    cameraRotate: -45,
    spin: true,
    spinLeft: true,
    spinSpeed: 1,
    spinChannel: "beat",
    spinDrive: 2,
    fogHeight: 2,
    fogDensity: 0.7,
    lightIntensity: 1,
    hexGrid: 81,
    hexSize: 0.5,
    hexHeightSpread: 1,
    audioSource: "off",
    micGate: MIC_GATE_DEFAULT,
    peakGain: PEAK_GAIN_DEFAULT,
    bandBounce: true,
    bandFlicker: true,
    bassBoost: 2,
};

const SCREEN_ID = "hexagons_place";

function clamp(n: number, min: number, max: number, fallback: number) {
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

/** Legacy colorSpeed deg/sec → twinkleSpeed × (1 ≈ 60°/s). */
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

let cached: HexagonsPlaceLive | null = null;

function readPrefs(): HexagonsPlaceLive {
    if (cached) return cached;
    const loaded = loadScreenPrefs(SCREEN_ID, { ...HEXAGONS_DEFAULTS });
    const {
        cameraRotation: _r,
        cameraFocus: _f,
        fogStrength: legacyStrength,
        fogColor: legacyFogColor,
        coloredFog: _coloredFog,
        capBeatFogIdle: legacyBeatFogIdle,
        capBeatFogPeak: legacyBeatFogPeak,
        reactive: legacyReactive,
        garland: legacyGarland,
        colorSpeed: legacyColorSpeed,
        ...rest
    } = loaded as HexagonsPlaceLive & {
        cameraRotation?: number;
        cameraFocus?: number;
        fogStrength?: number;
        fogColor?: string;
        coloredFog?: boolean;
        capBeatFogIdle?: string;
        capBeatFogPeak?: string;
        reactive?: boolean;
        garland?: boolean;
        colorSpeed?: number;
    };
    cached = {
        ...HEXAGONS_DEFAULTS,
        ...rest,
        audioSource: migrateAudioSource({
            audioSource: rest.audioSource,
            reactive: legacyReactive,
        }),
        micGate: normalizeMicGate(rest.micGate),
        peakGain: normalizePeakGain(rest.peakGain),
        twinkle: Boolean(
            rest.twinkle !== undefined ? rest.twinkle : legacyGarland,
        ),
        twinkleSpeed: migrateTwinkleSpeed(
            rest.twinkleSpeed,
            legacyColorSpeed,
        ),
        twinkleS: clamp(
            Number(rest.twinkleS),
            0,
            100,
            HEXAGONS_DEFAULTS.twinkleS,
        ),
        twinkleL: clamp(
            Number(rest.twinkleL),
            0,
            100,
            HEXAGONS_DEFAULTS.twinkleL,
        ),
    };
    delete (cached as { garland?: boolean }).garland;
    delete (cached as { colorSpeed?: number }).colorSpeed;
    // Legacy single fogColor → fogIdle
    if (
        cached.fogIdle === HEXAGONS_DEFAULTS.fogIdle &&
        typeof legacyFogColor === "string"
    ) {
        cached.fogIdle = legacyFogColor;
    }
    // Legacy caps beat-fog row → caps fog palette
    if (
        cached.capFogIdle === HEXAGONS_DEFAULTS.capFogIdle &&
        typeof legacyBeatFogIdle === "string"
    ) {
        cached.capFogIdle = legacyBeatFogIdle;
    }
    if (
        cached.capFogPeak === HEXAGONS_DEFAULTS.capFogPeak &&
        typeof legacyBeatFogPeak === "string"
    ) {
        cached.capFogPeak = legacyBeatFogPeak;
    }
    if (
        cached.gridChannel !== "off" &&
        cached.gridChannel !== "bass" &&
        cached.gridChannel !== "mid" &&
        cached.gridChannel !== "high" &&
        cached.gridChannel !== "beat"
    ) {
        cached.gridChannel = HEXAGONS_DEFAULTS.gridChannel;
    }
    if (
        cached.fogChannel !== "off" &&
        cached.fogChannel !== "bass" &&
        cached.fogChannel !== "mid" &&
        cached.fogChannel !== "high" &&
        cached.fogChannel !== "beat"
    ) {
        cached.fogChannel = HEXAGONS_DEFAULTS.fogChannel;
    }
    if (
        cached.spinChannel !== "off" &&
        cached.spinChannel !== "bass" &&
        cached.spinChannel !== "mid" &&
        cached.spinChannel !== "high" &&
        cached.spinChannel !== "beat"
    ) {
        cached.spinChannel = HEXAGONS_DEFAULTS.spinChannel;
    }
    cached.gridDrive = clamp(
        Number(cached.gridDrive),
        0,
        HEXAGONS_COLOR_DRIVE_MAX,
        HEXAGONS_DEFAULTS.gridDrive,
    );
    cached.fogDrive = clamp(
        Number(cached.fogDrive),
        0,
        HEXAGONS_COLOR_DRIVE_MAX,
        HEXAGONS_DEFAULTS.fogDrive,
    );
    const legacySpinAccel = (loaded as { spinAccel?: unknown }).spinAccel;
    cached.spinDrive = clamp(
        typeof cached.spinDrive === "number"
            ? cached.spinDrive
            : Number(legacySpinAccel),
        0,
        HEXAGONS_DRIVE_MAX,
        HEXAGONS_DEFAULTS.spinDrive,
    );
    // Caps mutex with twinkle
    if (cached.caps && cached.twinkle) cached.twinkle = false;
    delete (cached as { spinAccel?: number }).spinAccel;
    // Legacy dolly zoom was ~6–40; scene scale lives in 0.25–2.5
    if (cached.cameraZoom > 3) cached.cameraZoom = HEXAGONS_DEFAULTS.cameraZoom;
    if (
        cached.fogDensity === HEXAGONS_DEFAULTS.fogDensity &&
        typeof legacyStrength === "number"
    ) {
        cached.fogDensity = legacyStrength;
    }
    return cached;
}

function writePrefs(next: HexagonsPlaceLive) {
    cached = next;
    saveScreenPrefs(SCREEN_ID, next);
    emit();
}

export default function useHexagonsPlaceHook() {
    const live = useSyncExternalStore(
        subscribe,
        readPrefs,
        () => HEXAGONS_DEFAULTS,
    );

    const commit = (patch: Partial<HexagonsPlaceLive>) => {
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

    return {
        live,
        visualizer,
        controls: {
            edgeColor: live.edgeColor,
            setEdgeColor: (edgeColor: string) => commit({ edgeColor }),
            fogIdle: live.fogIdle,
            setFogIdle: (fogIdle: string) => commit({ fogIdle }),
            fogPeak: live.fogPeak,
            setFogPeak: (fogPeak: string) => commit({ fogPeak }),
            fogFixed: live.fogFixed,
            setFogFixed: (fogFixed: boolean) =>
                commit(
                    fogFixed
                        ? { fogFixed: true, fogParallel: false }
                        : { fogFixed: false },
                ),
            fogParallel: live.fogParallel,
            setFogParallel: (fogParallel: boolean) =>
                commit(
                    fogParallel
                        ? { fogParallel: true, fogFixed: false }
                        : { fogParallel: false },
                ),
            fogParallelSpeed: live.fogParallelSpeed,
            setFogParallelSpeed: (fogParallelSpeed: number) =>
                commit({ fogParallelSpeed }),
            gridColor: live.gridColor,
            setGridColor: (gridColor: string) => commit({ gridColor }),
            gridFixed: live.gridFixed,
            setGridFixed: (gridFixed: boolean) => commit({ gridFixed }),
            capGridIdle: live.capGridIdle,
            setCapGridIdle: (capGridIdle: string) => commit({ capGridIdle }),
            capGridPeak: live.capGridPeak,
            setCapGridPeak: (capGridPeak: string) => commit({ capGridPeak }),
            gridChannel: live.gridChannel,
            setGridChannel: (
                gridChannel: HexagonsPlaceLive["gridChannel"],
            ) => commit({ gridChannel }),
            gridDrive: live.gridDrive,
            setGridDrive: (gridDrive: number) =>
                commit({
                    gridDrive: clamp(
                        gridDrive,
                        0,
                        HEXAGONS_COLOR_DRIVE_MAX,
                        HEXAGONS_DEFAULTS.gridDrive,
                    ),
                }),
            gridScale: live.gridScale,
            setGridScale: (gridScale: number) => commit({ gridScale }),
            twinkle: live.twinkle,
            setTwinkle: (twinkle: boolean) =>
                commit(twinkle ? { twinkle: true, caps: false } : { twinkle }),
            twinkleSpeed: live.twinkleSpeed,
            setTwinkleSpeed: (twinkleSpeed: number) =>
                commit({ twinkleSpeed }),
            twinkleS: live.twinkleS,
            setTwinkleS: (twinkleS: number) => commit({ twinkleS }),
            twinkleL: live.twinkleL,
            setTwinkleL: (twinkleL: number) => commit({ twinkleL }),
            caps: live.caps,
            setCaps: (caps: boolean) =>
                commit(caps ? { caps: true, twinkle: false } : { caps }),
            capBassIdle: live.capBassIdle,
            setCapBassIdle: (capBassIdle: string) => commit({ capBassIdle }),
            capBassPeak: live.capBassPeak,
            setCapBassPeak: (capBassPeak: string) => commit({ capBassPeak }),
            capMidIdle: live.capMidIdle,
            setCapMidIdle: (capMidIdle: string) => commit({ capMidIdle }),
            capMidPeak: live.capMidPeak,
            setCapMidPeak: (capMidPeak: string) => commit({ capMidPeak }),
            capHighIdle: live.capHighIdle,
            setCapHighIdle: (capHighIdle: string) => commit({ capHighIdle }),
            capHighPeak: live.capHighPeak,
            setCapHighPeak: (capHighPeak: string) => commit({ capHighPeak }),
            capFogIdle: live.capFogIdle,
            setCapFogIdle: (capFogIdle: string) => commit({ capFogIdle }),
            capFogPeak: live.capFogPeak,
            setCapFogPeak: (capFogPeak: string) => commit({ capFogPeak }),
            fogChannel: live.fogChannel,
            setFogChannel: (fogChannel: HexagonsPlaceLive["fogChannel"]) =>
                commit({ fogChannel }),
            fogDrive: live.fogDrive,
            setFogDrive: (fogDrive: number) =>
                commit({
                    fogDrive: clamp(
                        fogDrive,
                        0,
                        HEXAGONS_COLOR_DRIVE_MAX,
                        HEXAGONS_DEFAULTS.fogDrive,
                    ),
                }),
            colorDriveMax: HEXAGONS_COLOR_DRIVE_MAX,
            speedDriveMax: HEXAGONS_DRIVE_MAX,
            cameraAngle: live.cameraAngle,
            setCameraAngle: (cameraAngle: number) => commit({ cameraAngle }),
            cameraHeight: live.cameraHeight,
            setCameraHeight: (cameraHeight: number) => commit({ cameraHeight }),
            cameraOffset: live.cameraOffset,
            setCameraOffset: (cameraOffset: number) => commit({ cameraOffset }),
            cameraZoom: live.cameraZoom,
            setCameraZoom: (cameraZoom: number) => commit({ cameraZoom }),
            cameraRotate: live.cameraRotate,
            setCameraRotate: (cameraRotate: number) => commit({ cameraRotate }),
            spin: live.spin,
            setSpin: (spin: boolean) => commit({ spin }),
            spinLeft: live.spinLeft,
            setSpinLeft: (spinLeft: boolean) => commit({ spinLeft }),
            spinSpeed: live.spinSpeed,
            setSpinSpeed: (spinSpeed: number) => commit({ spinSpeed }),
            spinChannel: live.spinChannel,
            setSpinChannel: (spinChannel: HexagonsPlaceLive["spinChannel"]) =>
                commit({ spinChannel }),
            spinDrive: live.spinDrive,
            setSpinDrive: (spinDrive: number) => commit({ spinDrive }),
            fogHeight: live.fogHeight,
            setFogHeight: (fogHeight: number) => commit({ fogHeight }),
            fogDensity: live.fogDensity,
            setFogDensity: (fogDensity: number) => commit({ fogDensity }),
            lightIntensity: live.lightIntensity,
            setLightIntensity: (lightIntensity: number) =>
                commit({ lightIntensity }),
            hexGrid: live.hexGrid,
            setHexGrid: (hexGrid: number) => commit({ hexGrid }),
            hexSize: live.hexSize,
            setHexSize: (hexSize: number) => commit({ hexSize }),
            hexHeightSpread: live.hexHeightSpread,
            setHexHeightSpread: (hexHeightSpread: number) =>
                commit({ hexHeightSpread }),
            bandBounce: live.bandBounce,
            setBandBounce: (bandBounce: boolean) => commit({ bandBounce }),
            bandFlicker: live.bandFlicker,
            setBandFlicker: (bandFlicker: boolean) => commit({ bandFlicker }),
            bassBoost: live.bassBoost,
            setBassBoost: (bassBoost: number) => commit({ bassBoost }),
            reset: () => writePrefs({ ...HEXAGONS_DEFAULTS }),
            fullscreen: () => void toggleFullscreen(),
        },
    };
}
