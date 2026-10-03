import * as THREE from "three";

/** Defaults for S / L when unspecified (full chroma mid lightness). */
export const TWINKLE_DEFAULT_S = 100;
export const TWINKLE_DEFAULT_L = 50;
export const TWINKLE_DEFAULT_SPEED = 1;

/** Deg/sec at speed ×1 — full hue lap ≈ 6s. */
const HUE_DEG_PER_SEC = 60;

const _color = new THREE.Color();

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
