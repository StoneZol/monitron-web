import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { sliceBands } from "@/lib/audioDerive";
import type { ReactiveChannel } from "./Fairysmoke.types";

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

export function drivenLevel(level: number, drive: number): number {
  const d = Number.isFinite(drive) ? Math.max(0, drive) : 1;
  return Math.min(1.5, Math.max(0, level) * d);
}

export function hexToVec3(hex: string, target: THREE.Color) {
  return target.set(hex);
}

const _lerpA = new THREE.Color();
const _lerpB = new THREE.Color();

export function lerpHex(
  idle: string,
  peak: string,
  level: number,
  target: THREE.Color,
) {
  const t = Math.min(1, Math.max(0, level));
  _lerpA.set(idle);
  _lerpB.set(peak);
  return target.copy(_lerpA).lerp(_lerpB, t);
}
