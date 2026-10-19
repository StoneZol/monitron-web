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

/** Kick envelope: rising-edge snap + exponential decay (in-time punches). */
export const MOTION_KICK_DECAY = 6.5;
export const MOTION_KICK_EDGE = 0.08;
export const MOTION_KICK_EDGE_MIN = 0.1;

/**
 * Cruise (base speed): average + hit-density sustain.
 * Rise is quick (~150–200ms) but not a snap; fall ~1s.
 */
export const MOTION_CRUISE_AVG_ATTACK = 6.5;
/** ~1s fall on the average floor (e^-2.3 ≈ 10% left at 1s). */
export const MOTION_CRUISE_AVG_RELEASE = 2.3;
/** Sustain mostly gone in ~1s so gaps at dense tempo still plateau. */
export const MOTION_CRUISE_SUSTAIN_DECAY = 2.3;
export const MOTION_CRUISE_INJECT = 0.14;
export const MOTION_CRUISE_PEAK_FRAC = 0.28;
export const MOTION_CRUISE_AVG_MIX = 0.55;
export const MOTION_CRUISE_SUSTAIN_MIX = 0.7;
/** Smooth climb when target rises — responsive, not jerky. */
export const MOTION_CRUISE_ATTACK = 7;
/** ~1s settle down (e^-2.3 ≈ 10% left at 1s). */
export const MOTION_CRUISE_RELEASE = 2.3;
export const MOTION_CRUISE_EDGE = 0.055;
export const MOTION_CRUISE_EDGE_MIN = 0.07;

export type MotionKickState = {
  /** Kick transient envelope */
  env: number;
  prev: number;
  /** Slow EMA of cruiseRaw */
  cruiseAvg: number;
  /** Hit-density energy (edge inject, slow decay) */
  cruiseSustain: number;
  /** Smoothed cruise level before drive (0…1) */
  cruiseSmooth: number;
  /** Previous cruiseRaw for rising-edge detect */
  cruisePrev: number;
};

export function createMotionKickState(): MotionKickState {
  return {
    env: 0,
    prev: 0,
    cruiseAvg: 0,
    cruiseSustain: 0,
    cruiseSmooth: 0,
    cruisePrev: 0,
  };
}

function ensureMotionCruiseFields(k: MotionKickState): void {
  if (!Number.isFinite(k.cruiseAvg)) k.cruiseAvg = 0;
  if (!Number.isFinite(k.cruiseSustain)) k.cruiseSustain = 0;
  if (!Number.isFinite(k.cruiseSmooth)) k.cruiseSmooth = 0;
  if (!Number.isFinite(k.cruisePrev)) k.cruisePrev = 0;
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
  /** Extra weight on cruise level (default 1). */
  cruiseWeight?: number;
  /** Extra weight on kick env × drive (default 1). */
  kickWeight?: number;
  /** Kick envelope decay (default MOTION_KICK_DECAY). */
  decay?: number;
  edge?: number;
  edgeMin?: number;
  /** Cruise sustain decay (default MOTION_CRUISE_SUSTAIN_DECAY). */
  cruiseDecay?: number;
};

/**
 * Split motion: continuous cruise × transient kick.
 * - Cruise = slow band average + sharpness-weighted hit sustain (no peak chasing).
 * - Kick = rising-edge punches for accel / in-time jerks.
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
  const cruiseDecay = input.cruiseDecay ?? MOTION_CRUISE_SUSTAIN_DECAY;
  const dt = Math.max(0, input.dt);
  const k = input.kick;
  ensureMotionCruiseFields(k);

  let cruiseMul = 1;
  if (input.cruiseArmed) {
    const x = Math.min(1, Math.max(0, input.cruiseRaw));

    // Asym average: climb fast when energy jumps, fall ~1s
    const avgFollow =
      x > k.cruiseAvg
        ? MOTION_CRUISE_AVG_ATTACK
        : MOTION_CRUISE_AVG_RELEASE;
    k.cruiseAvg += (x - k.cruiseAvg) * (1 - Math.exp(-avgFollow * dt));

    // Rising edge → inject sustain from how sharp the hit is vs the average
    if (risingEdge(x, k.cruisePrev, MOTION_CRUISE_EDGE, MOTION_CRUISE_EDGE_MIN)) {
      const over = Math.max(0, x - k.cruiseAvg);
      const sharpness = Math.min(
        1,
        over / Math.max(0.08, 1 - k.cruiseAvg * 0.85),
      );
      const hit = Math.min(1, Math.max(sharpness, x * 0.55));
      k.cruiseSustain = Math.min(
        1,
        k.cruiseSustain + hit * MOTION_CRUISE_INJECT,
      );
      k.cruiseSustain = Math.max(
        k.cruiseSustain,
        hit * MOTION_CRUISE_PEAK_FRAC,
      );
    }
    k.cruisePrev = x;

    k.cruiseSustain *= Math.exp(-cruiseDecay * dt);
    if (k.cruiseSustain < 0.004) k.cruiseSustain = 0;

    // Dense hits (e.g. 5/s) keep sustain up; gaps don't dig holes in the base
    const target = Math.min(
      1,
      k.cruiseAvg * MOTION_CRUISE_AVG_MIX +
        k.cruiseSustain * MOTION_CRUISE_SUSTAIN_MIX,
    );

    const follow =
      target > k.cruiseSmooth
        ? MOTION_CRUISE_ATTACK
        : MOTION_CRUISE_RELEASE;
    k.cruiseSmooth +=
      (target - k.cruiseSmooth) * (1 - Math.exp(-follow * dt));
    if (k.cruiseSmooth < 0.002) k.cruiseSmooth = 0;

    cruiseMul =
      1 + drivenLevel(k.cruiseSmooth, input.cruiseDrive) * cruiseWeight;
  } else {
    k.cruiseAvg = 0;
    k.cruiseSustain = 0;
    k.cruiseSmooth = 0;
    k.cruisePrev = 0;
  }

  const kickSense = input.kickArmed
    ? Math.min(1, Math.max(0, input.kickRaw))
    : 0;
  if (
    input.kickArmed &&
    risingEdge(kickSense, k.prev, edge, edgeMin)
  ) {
    k.env = Math.max(k.env, kickSense);
  }
  k.env *= Math.exp(-decay * dt);
  if (k.env < 0.004) k.env = 0;
  k.prev = kickSense;

  const kickEnv = input.kickArmed ? k.env : 0;
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
