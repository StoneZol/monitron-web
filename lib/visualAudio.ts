/**
 * Shared reactive-screen helpers: named EQ channels + tint math.
 * Used by Warpburst / Hexacore / Blackhole / Synthwave / Fairysmoke / Kalistarnest / Coralreef / Hexagons.
 */

import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { risingEdge } from "@/lib/audioDerive";

/** Named bus bands every reactive screen can bind a slot to. */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

export const REACTIVE_CHANNELS = [
  "off",
  "bass",
  "mid",
  "high",
  "beat",
] as const satisfies readonly ReactiveChannel[];

const BEAT_GAIN = 5;

/** Unclipped beat energy — derived onset × gain, crest fallback. */
export function beatRaw(viz: VizBands): number {
  if (typeof viz.beat === "number") return viz.beat * BEAT_GAIN;
  const crest = Math.max(0, viz.peak - viz.rms * 1.2);
  return Math.max(viz.peak, crest * 1.35) * BEAT_GAIN;
}

/** Soft-clip a raw level into ~0…1 (Peak gain stays in the tanh slope). */
export function softPeak01(x: number): number {
  return Math.tanh(Math.max(0, x));
}

/** 0…1 level for a named channel from the live bus. */
export function channelLevel(viz: VizBands, ch: ReactiveChannel): number {
  if (ch === "off") return 0;
  // Prefer page-derived punches from AudioDeriver (useAudioReactive).
  if (ch === "beat") return viz.beat;
  if (ch === "bass") return viz.bass;
  if (ch === "mid") return viz.mid;
  return viz.high;
}

/**
 * Scale a 0…1 channel envelope by drive.
 * Default ceiling 1.5 (motion/color punch); pass 1 for strict lerp levels.
 */
export function drivenLevel(
  level: number,
  drive: number,
  ceiling = 1.5,
): number {
  const d = Number.isFinite(drive) ? Math.max(0, drive) : 1;
  const cap = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 1.5;
  return Math.min(cap, Math.max(0, level) * d);
}

/** Kick envelope: rising-edge snap + exponential decay. */
export const MOTION_KICK_DECAY = 13;
export const MOTION_KICK_EDGE = 0.08;
export const MOTION_KICK_EDGE_MIN = 0.1;

export type MotionKickState = {
  env: number;
  prev: number;
};

export function createMotionKickState(): MotionKickState {
  return { env: 0, prev: 0 };
}

export type MotionSpeedMulInput = {
  cruiseRaw: number;
  cruiseDrive: number;
  cruiseArmed: boolean;
  kickRaw: number;
  kickDrive: number;
  kickArmed: boolean;
  kick: MotionKickState;
  dt: number;
  /** Extra weight on cruise punch (default 1). */
  cruiseWeight?: number;
  /** Extra weight on kick env × drive (default 1). */
  kickWeight?: number;
  decay?: number;
  edge?: number;
  edgeMin?: number;
};

/**
 * Split motion: smooth cruise mul × transient kick boost.
 * `rate = baseSpeed * speedMul` with
 * `speedMul = cruiseMul * (1 + kickEnv * kickDrive * kickWeight)`.
 */
export function motionSpeedMul(input: MotionSpeedMulInput): {
  cruiseMul: number;
  kickEnv: number;
  speedMul: number;
} {
  const cruiseWeight =
    input.cruiseWeight != null && Number.isFinite(input.cruiseWeight)
      ? Math.max(0, input.cruiseWeight)
      : 1;
  const kickWeight =
    input.kickWeight != null && Number.isFinite(input.kickWeight)
      ? Math.max(0, input.kickWeight)
      : 1;
  const decay = input.decay ?? MOTION_KICK_DECAY;
  const edge = input.edge ?? MOTION_KICK_EDGE;
  const edgeMin = input.edgeMin ?? MOTION_KICK_EDGE_MIN;
  const dt = Math.max(0, input.dt);

  const cruiseMul = input.cruiseArmed
    ? 1 + drivenLevel(input.cruiseRaw, input.cruiseDrive) * cruiseWeight
    : 1;

  const kickSense = input.kickArmed
    ? Math.min(1, Math.max(0, input.kickRaw))
    : 0;
  if (
    input.kickArmed &&
    risingEdge(kickSense, input.kick.prev, edge, edgeMin)
  ) {
    input.kick.env = Math.max(input.kick.env, kickSense);
  }
  input.kick.env *= Math.exp(-decay * dt);
  if (input.kick.env < 0.004) input.kick.env = 0;
  input.kick.prev = kickSense;

  const kickEnv = input.kickArmed ? input.kick.env : 0;
  const kickDrive = Number.isFinite(input.kickDrive)
    ? Math.max(0, input.kickDrive)
    : 1;
  const speedMul = cruiseMul * (1 + kickEnv * kickDrive * kickWeight);

  return { cruiseMul, kickEnv, speedMul };
}

export function hexToVec3(hex: string, target: THREE.Color): THREE.Color {
  return target.set(hex);
}

const _hsl = { h: 0, s: 0, l: 0 };
const _lerpA = new THREE.Color();
const _lerpB = new THREE.Color();

/** Idle dim when audio punches brightness (legacy pulseBrightness). */
export const TWINKLE_IDLE = 0.52;

/** Scale current color: idle dim → full on peaks (`level` 0…1). */
export function pulseBrightness(
  target: THREE.Color,
  level: number,
  idleMul = TWINKLE_IDLE,
): THREE.Color {
  const t = Math.min(1, Math.max(0, level));
  return target.multiplyScalar(idleMul + (1 - idleMul) * t);
}

/** Hex idle→peak lerp. */
export function lerpHex(
  idle: string,
  peak: string,
  level: number,
  target: THREE.Color,
): THREE.Color {
  const t = Math.min(1, Math.max(0, level));
  _lerpA.set(idle);
  _lerpB.set(peak);
  return target.copy(_lerpA).lerp(_lerpB, t);
}

/** Hue walk from a picked base (legacy garland). */
export function hueWalkHex(
  hex: string,
  hueOffsetDeg: number,
  target: THREE.Color,
): THREE.Color {
  target.set(hex);
  if (!hueOffsetDeg) return target;

  target.getHSL(_hsl);
  let h = (_hsl.h + hueOffsetDeg / 360) % 1;
  if (h < 0) h += 1;
  const achromatic = _hsl.s < 0.08 || _hsl.l < 0.06;
  const s = achromatic ? 0.85 : Math.max(_hsl.s, 0.55);
  const l = achromatic ? 0.5 : Math.max(_hsl.l, 0.12);
  return target.setHSL(h, s, l);
}
