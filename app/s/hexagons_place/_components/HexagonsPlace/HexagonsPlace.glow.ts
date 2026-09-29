import * as THREE from "three";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";
import { FOG_NEUTRAL } from "./HexagonsPlace.fog";

const _scratch = new THREE.Color();
const _fog = new THREE.Color(FOG_NEUTRAL);
const _hsl = { h: 0, s: 0, l: 0 };
const _hue = { h: 0, s: 0, l: 0 };

function resolveHueColor(hex: string, hueOffsetDeg: number, garland: boolean) {
  if (!garland) {
    _scratch.set(hex);
    return _scratch;
  }
  _scratch.set(hex);
  _scratch.getHSL(_hsl);
  let h = (_hsl.h + hueOffsetDeg / 360) % 1;
  if (h < 0) h += 1;
  _scratch.setHSL(h, Math.max(_hsl.s, 0.75), _hsl.l);
  return _scratch;
}

/** Keep colored fog as haze, not a bright wash. */
function toneFog(hex: string, out: THREE.Color) {
  out.set(hex);
  out.getHSL(_hsl);
  out.setHSL(_hsl.h, Math.min(_hsl.s * 0.4, 0.45), Math.min(_hsl.l * 0.4, 0.12));
}

export type GlowAudio = {
  enabled: boolean;
  bass: number;
};

/**
 * Edge always follows edgeColor (± garland).
 * Fog tint is separate — does not bump scene lights.
 * When reactive: fog is dimmer, saturation rises with bass.
 */
export function applyGlow(
  edgeMaterial: THREE.LineBasicMaterial,
  fog: THREE.Fog,
  background: THREE.Color,
  accentLight: THREE.PointLight,
  live: HexagonsPlaceLive,
  hueOffsetDeg: number,
  audio?: GlowAudio | null,
) {
  const edge = resolveHueColor(live.edgeColor, hueOffsetDeg, live.garland);
  edgeMaterial.color.copy(edge);

  accentLight.color.set(0xffffff);
  accentLight.intensity = 0.5;

  if (!live.coloredFog) {
    fog.color.set(FOG_NEUTRAL);
    background.set(FOG_NEUTRAL);
  } else if (live.garland) {
    edge.getHSL(_hsl);
    _fog.setHSL(_hsl.h, Math.min(0.4, _hsl.s * 0.3), 0.1);
    fog.color.copy(_fog);
    background.copy(_fog);
  } else {
    toneFog(live.fogColor, _fog);
    fog.color.copy(_fog);
    background.copy(_fog);
  }

  if (!audio?.enabled) return;

  // Dim haze + bass pushes chroma (hue from edge / fog picker)
  fog.color.getHSL(_hsl);
  if (live.coloredFog && live.garland) {
    edge.getHSL(_hue);
  } else if (live.coloredFog) {
    _scratch.set(live.fogColor);
    _scratch.getHSL(_hue);
  } else {
    edge.getHSL(_hue);
  }
  const bass = Math.max(0, Math.min(1, audio.bass));
  const l = Math.min(_hsl.l * 0.55, 0.07);
  const s = Math.min(0.75, _hsl.s * 0.25 + bass * 0.65);
  _fog.setHSL(_hue.h, s, l);
  fog.color.copy(_fog);
  background.copy(_fog);
}
