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
