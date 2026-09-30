import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { sliceBands } from "@/lib/audioDerive";
import type { ReactiveChannel } from "./Synthwave.types";

const BEAT_GAIN = 5;

function beatRaw(viz: VizBands) {
    const crest = Math.max(0, viz.peak - viz.rms * 1.2);
    return Math.max(viz.peak, crest * 1.35) * BEAT_GAIN;
}

function softPeak01(x: number) {
    return Math.tanh(Math.max(0, x));
}

export function channelLevel(viz: VizBands, ch: ReactiveChannel): number {
    if (ch === "off") return 0;
    if (ch === "beat") return softPeak01(beatRaw(viz));
    if (ch === "bass") return sliceBands(viz.bands, 30, 180);
    if (ch === "mid") return sliceBands(viz.bands, 200, 2000);
    return sliceBands(viz.bands, 2000, 10000);
}

export function hexToVec3(hex: string, target: THREE.Color) {
    return target.set(hex);
}

const _hsl = { h: 0, s: 0, l: 0 };

/** Hue walk from the picked base (Matrix / Hexagons garland). */
export function hueWalkHex(
    hex: string,
    hueOffsetDeg: number,
    target: THREE.Color,
) {
    target.set(hex);
    if (!hueOffsetDeg) return target;

    target.getHSL(_hsl);
    let h = (_hsl.h + hueOffsetDeg / 360) % 1;
    if (h < 0) h += 1;
    // Achromatic / black: invent a vivid base so the walk is visible
    const achromatic = _hsl.s < 0.08 || _hsl.l < 0.06;
    const s = achromatic ? 0.85 : Math.max(_hsl.s, 0.55);
    const l = achromatic ? 0.5 : Math.max(_hsl.l, 0.12);
    return target.setHSL(h, s, l);
}
