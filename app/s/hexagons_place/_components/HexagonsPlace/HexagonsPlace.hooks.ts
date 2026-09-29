"use client";

import { useSyncExternalStore } from "react";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

export const HEXAGONS_DEFAULTS: HexagonsPlaceLive = {
    edgeColor: "#ff9940",
    fogIdle: "#01317e",
    fogPeak: "#1a4a9e",
    fogFixed: false,
    fogParallel: false,
    fogParallelSpeed: 1,
    garland: false,
    caps: false,
    capBassIdle: "#8f0070",
    capBassPeak: "#ff2ed2",
    capMidIdle: "#ccbb00",
    capMidPeak: "#fef606",
    capHighIdle: "#0644fe",
    capHighPeak: "#3496fe",
    capBeatFogIdle: "#1a0c14",
    capBeatFogPeak: "#4a1830",
    colorSpeed: 40,
    cameraAngle: 25,
    cameraHeight: 8,
    cameraOffset: 10,
    cameraZoom: 1,
    cameraRotate: -45,
    spin: true,
    spinLeft: true,
    spinSpeed: 1,
    fogHeight: 2,
    fogDensity: 0.7,
    hexGrid: 81,
    hexSize: 0.5,
    hexHeightSpread: 1,
    reactive: false,
    bandBounce: true,
    bassBoost: 2,
};

const BASS_BOOST_MAX = 8;

const SCREEN_ID = "hexagons_place";

/** All bands drive hex groups; bass also colors fog / garland speed */
const HEX_VIZ_BANDS = {
    bass: true,
    mid: true,
    high: true,
    beat: true,
} as const;

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
        ...rest
    } = loaded as HexagonsPlaceLive & {
        cameraRotation?: number;
        cameraFocus?: number;
        fogStrength?: number;
        fogColor?: string;
        coloredFog?: boolean;
    };
    cached = { ...HEXAGONS_DEFAULTS, ...rest };
    // Legacy single fogColor → fogIdle
    if (
        cached.fogIdle === HEXAGONS_DEFAULTS.fogIdle &&
        typeof legacyFogColor === "string"
    ) {
        cached.fogIdle = legacyFogColor;
    }
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
        bands: HEX_VIZ_BANDS,
        preferredReactive: live.reactive,
        onReactiveChange: (reactive) => commit({ reactive }),
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
            garland: live.garland,
            setGarland: (garland: boolean) =>
                commit(garland ? { garland: true, caps: false } : { garland }),
            caps: live.caps,
            setCaps: (caps: boolean) =>
                commit(caps ? { caps: true, garland: false } : { caps }),
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
            capBeatFogIdle: live.capBeatFogIdle,
            setCapBeatFogIdle: (capBeatFogIdle: string) =>
                commit({ capBeatFogIdle }),
            capBeatFogPeak: live.capBeatFogPeak,
            setCapBeatFogPeak: (capBeatFogPeak: string) =>
                commit({ capBeatFogPeak }),
            colorSpeed: live.colorSpeed,
            setColorSpeed: (colorSpeed: number) => commit({ colorSpeed }),
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
            fogHeight: live.fogHeight,
            setFogHeight: (fogHeight: number) => commit({ fogHeight }),
            fogDensity: live.fogDensity,
            setFogDensity: (fogDensity: number) => commit({ fogDensity }),
            hexGrid: live.hexGrid,
            setHexGrid: (hexGrid: number) => commit({ hexGrid }),
            hexSize: live.hexSize,
            setHexSize: (hexSize: number) => commit({ hexSize }),
            hexHeightSpread: live.hexHeightSpread,
            setHexHeightSpread: (hexHeightSpread: number) =>
                commit({ hexHeightSpread }),
            bandBounce: live.bandBounce,
            setBandBounce: (bandBounce: boolean) => commit({ bandBounce }),
            bassBoost: live.bassBoost,
            setBassBoost: (bassBoost: number) => commit({ bassBoost }),
            bassBoostMax: BASS_BOOST_MAX,
            reset: () => writePrefs({ ...HEXAGONS_DEFAULTS }),
            fullscreen: () => void toggleFullscreen(),
        },
    };
}
