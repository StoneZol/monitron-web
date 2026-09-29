import * as THREE from "three";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

const _scratch = new THREE.Color();
const _fog = new THREE.Color();
const _fogPeak = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };

/**
 * Garland shifts hue from the picked base. Near-black / grey still cycles
 * (black has no hue — bump sat/light so the rainbow still runs).
 */
function resolveHueColor(hex: string, hueOffsetDeg: number, garland: boolean) {
  _scratch.set(hex);
  if (!garland) return _scratch;

  _scratch.getHSL(_hsl);
  let h = (_hsl.h + hueOffsetDeg / 360) % 1;
  if (h < 0) h += 1;
  // Achromatic / black: invent a vivid base so offset is visible
  const achromatic = _hsl.s < 0.08 || _hsl.l < 0.06;
  const s = achromatic ? 0.85 : Math.max(_hsl.s, 0.55);
  const l = achromatic ? 0.5 : Math.max(_hsl.l, 0.12);
  _scratch.setHSL(h, s, l);
  return _scratch;
}

/** Keep fog as haze, not a bright wash. */
function toneFog(src: THREE.Color, out: THREE.Color) {
  src.getHSL(_hsl);
  out.setHSL(
    _hsl.h,
    Math.min(_hsl.s * 0.4, 0.45),
    Math.min(_hsl.l * 0.4, 0.12),
  );
}

export type GlowAudio = {
  enabled: boolean;
  bass: number;
  mid: number;
  high: number;
  beat: number;
};

/**
 * Edge: garland / edgeColor, or black in caps mode.
 * Fog under garland:
 *   neither → follow edge hue
 *   fogFixed → static fogIdle/fogPeak
 *   fogParallel → hue-cycle fogIdle/fogPeak with edge
 * Reactive fog jumps use fogChannel (off | bass | mid | high | beat).
 */
export function applyGlow(
  edgeMaterial: THREE.LineBasicMaterial,
  fog: THREE.Fog,
  background: THREE.Color,
  accentLight: THREE.PointLight,
  live: HexagonsPlaceLive,
  hueOffsetDeg: number,
  fogHueOffsetDeg: number,
  audio?: GlowAudio | null,
) {
  const garland = live.garland && !live.caps;

  if (live.caps) {
    edgeMaterial.color.set(0x000000);
  } else {
    edgeMaterial.color.copy(
      resolveHueColor(live.edgeColor, hueOffsetDeg, garland),
    );
  }

  accentLight.color.set(0xffffff);
  accentLight.intensity =
    0.5 * Math.max(0, Math.min(2, live.lightIntensity));

  // Caps fog is driven in Canvas from fog palette + fogChannel — skip here
  if (live.caps) return;

  const fogLevel = (() => {
    if (!audio?.enabled || live.fogChannel === "off") return 0;
    const ch = live.fogChannel;
    const raw =
      ch === "beat"
        ? audio.beat
        : ch === "bass"
          ? audio.bass
          : ch === "mid"
            ? audio.mid
            : audio.high;
    return Math.max(0, Math.min(1, raw));
  })();

  if (garland && !live.fogFixed && !live.fogParallel) {
    // Default: haze follows edge rainbow
    toneFog(edgeMaterial.color, _fog);
  } else {
    const cycleFog = garland && live.fogParallel;
    toneFog(
      resolveHueColor(live.fogIdle, fogHueOffsetDeg, cycleFog),
      _fog,
    );
    toneFog(
      resolveHueColor(live.fogPeak, fogHueOffsetDeg, cycleFog),
      _fogPeak,
    );
    _fog.lerp(_fogPeak, fogLevel);
  }

  fog.color.copy(_fog);
  background.copy(_fog);
}
