import * as THREE from "three";
import { risingEdge } from "@/lib/audioDerive";

/** Defaults for S / L when unspecified (full chroma mid lightness). */
export const TWINKLE_DEFAULT_S = 100;
export const TWINKLE_DEFAULT_L = 50;
export const TWINKLE_DEFAULT_SPEED = 1;

/** Color / twinkle punch drive — keep the slider in 0…2. */
export const TWINKLE_COLOR_DRIVE_MAX = 2;

/** Deg/sec at speed ×1 — full hue lap ≈ 6s. */
const HUE_DEG_PER_SEC = 60;

/**
 * Shared audio light-pulse for twinkle mode (all screens).
 * Peak = user-chosen L; quiet = dimmer.
 * Color drive is a simple 0…2 boost (deeper idle + slightly snappier body).
 */
export const TWINKLE_PULSE = {
  decay: 9,
  edge: 0.035,
  edgeMin: 0.04,
  sustain: 0.75,
  /** Quiet L factor at drive ×1 */
  idleL: 0.4,
  /** Idle deepen across drive 0…2 */
  idleAt0: 0.55,
  idleAt2: 0.18,
  satBoost: 0.12,
} as const;

const _color = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };

export type TwinklePulseEnv = {
  value: number;
  prev: number;
};

export function createTwinklePulseEnv(): TwinklePulseEnv {
  return { value: 0, prev: 0 };
}

function clampDrive(drive: number): number {
  const d = Number.isFinite(drive) ? drive : 1;
  return Math.min(TWINKLE_COLOR_DRIVE_MAX, Math.max(0, d));
}

/**
 * Envelope from raw channel level (0…1). Drive does not multiply into a ceiling.
 */
export function updateTwinklePulseEnv(
  env: TwinklePulseEnv,
  level: number,
  _drive: number,
  dt: number,
): number {
  const x = Math.min(1, Math.max(0, level));
  if (risingEdge(x, env.prev, TWINKLE_PULSE.edge, TWINKLE_PULSE.edgeMin)) {
    env.value = Math.max(env.value, x);
  }
  env.value *= Math.exp(-TWINKLE_PULSE.decay * dt);
  if (env.value < 0.004) env.value = 0;
  env.prev = x;
  return Math.min(1, Math.max(env.value, x * TWINKLE_PULSE.sustain));
}

/**
 * HSL light pulse. `drive` 0…2 → how deep the quiet floor sits.
 */
export function pulseTwinkleLight(
  target: THREE.Color,
  amount: number,
  drive = 1,
): THREE.Color {
  const t = Math.min(1, Math.max(0, amount));
  const shaped = Math.pow(t, 0.7);
  const d = clampDrive(drive);
  // Lerp idle floor across 0…2
  const u = d / TWINKLE_COLOR_DRIVE_MAX;
  const idleFactor =
    TWINKLE_PULSE.idleAt0 +
    (TWINKLE_PULSE.idleAt2 - TWINKLE_PULSE.idleAt0) * u;

  target.getHSL(_hsl);
  const peakL = Math.max(0.08, _hsl.l);
  const idleL = peakL * idleFactor;
  const s = Math.min(1, _hsl.s * (1 + TWINKLE_PULSE.satBoost * shaped));
  return target.setHSL(_hsl.h, s, idleL + (peakL - idleL) * shaped);
}

/**
 * Pref key prefix from a TwinkleControls title.
 * Always contains `twinkle` (appended if missing).
 * `"twinkle"` → twinkle; `"sky twinkle"` → skyTwinkle; `"core"` → coreTwinkle
 */
export function twinklePrefPrefix(title: string): string {
  const words = title
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  let camel = words
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
  if (!camel) camel = "twinkle";
  if (!/twinkle/i.test(camel)) camel = `${camel}Twinkle`;
  return camel.charAt(0).toLowerCase() + camel.slice(1);
}

export type TwinklePrefKeys = {
  enabled: string;
  speed: string;
  s: string;
  l: string;
};

export function twinklePrefKeys(title: string): TwinklePrefKeys {
  const p = twinklePrefPrefix(title);
  return {
    enabled: p,
    speed: `${p}Speed`,
    s: `${p}S`,
    l: `${p}L`,
  };
}

export function advanceTwinkleHue(
  hueDeg: number,
  dt: number,
  speed: number,
): number {
  if (!(speed > 0) || !(dt > 0)) return ((hueDeg % 360) + 360) % 360;
  let next = hueDeg + dt * HUE_DEG_PER_SEC * speed;
  next %= 360;
  if (next < 0) next += 360;
  return next;
}

/** Write hsl(H S% L%) into target; returns target. */
export function resolveTwinkleColor(
  hueDeg: number,
  s: number,
  l: number,
  target: THREE.Color,
): THREE.Color {
  const h = (((hueDeg % 360) + 360) % 360) / 360;
  const sat = Math.min(1, Math.max(0, s / 100));
  const lit = Math.min(1, Math.max(0, l / 100));
  return target.setHSL(h, sat, lit);
}

/** `#rrggbb` for the current twinkle phase. */
export function resolveTwinkleHex(
  hueDeg: number,
  s: number,
  l: number,
): string {
  resolveTwinkleColor(hueDeg, s, l, _color);
  return `#${_color.getHexString()}`;
}

/** Hue degrees 0…360 from a hex (for multi-stop twinkle offsets). */
export function hueDegFromHex(hex: string): number {
  _color.set(hex);
  _color.getHSL(_hsl);
  return _hsl.h * 360;
}
