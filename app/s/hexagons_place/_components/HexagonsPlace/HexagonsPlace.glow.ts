import * as THREE from "three";
import {
  hueDegFromHex,
  pulseTwinkleLight,
  resolveTwinkleColor,
} from "@/lib/twinkleHsl";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

const _scratch = new THREE.Color();
const _fog = new THREE.Color();
const _fogPeak = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };

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
  /** Shared twinkle light-pulse amount 0…1 (precomputed once per frame). */
  pulseAmt?: number;
};

function channelLevel(audio: GlowAudio, ch: HexagonsPlaceLive["fogChannel"]) {
  if (ch === "beat") return audio.beat;
  if (ch === "bass") return audio.bass;
  if (ch === "mid") return audio.mid;
  return audio.high;
}

/**
 * Edge: twinkle HSL / edgeColor, or black in caps mode.
 * Fog under twinkle:
 *   neither → follow edge hue
 *   fogFixed → static fogIdle/fogPeak
 *   fogParallel → hue-cycle fog with edge (offset from idle/peak)
 * Reactive fog jumps use fogChannel (off | bass | mid | high | beat).
 */
export function applyGlow(
  edgeMaterial: THREE.LineBasicMaterial,
  fog: THREE.Fog,
  background: THREE.Color,
  accentLight: THREE.PointLight,
  live: HexagonsPlaceLive,
  twinkleHueDeg: number,
  fogTwinkleHueDeg: number,
  audio?: GlowAudio | null,
) {
  const twinkleOn = live.twinkle && !live.caps;

  if (live.caps) {
    edgeMaterial.color.set(0x000000);
  } else if (twinkleOn) {
    resolveTwinkleColor(
      twinkleHueDeg,
      live.twinkleS,
      live.twinkleL,
      edgeMaterial.color,
    );
    if (audio?.enabled && audio.pulseAmt !== undefined) {
      pulseTwinkleLight(
        edgeMaterial.color,
        audio.pulseAmt,
        live.fogDrive,
      );
    }
  } else {
    edgeMaterial.color.set(live.edgeColor);
  }

  accentLight.color.set(0xffffff);
  accentLight.intensity =
    0.5 * Math.max(0, Math.min(2, live.lightIntensity));

  // Caps fog is driven in Canvas from fog palette + fogChannel — skip here
  if (live.caps) return;

  const fogLevel = (() => {
    if (!audio?.enabled || live.fogChannel === "off") return 0;
    const raw = channelLevel(audio, live.fogChannel);
    return Math.max(0, Math.min(1, raw * Math.max(0, live.fogDrive)));
  })();

  if (twinkleOn && !live.fogFixed && !live.fogParallel) {
    // Default: haze follows edge rainbow
    toneFog(edgeMaterial.color, _fog);
  } else if (twinkleOn && live.fogParallel) {
    resolveTwinkleColor(
      fogTwinkleHueDeg,
      live.twinkleS,
      live.twinkleL,
      _scratch,
    );
    const peakOff =
      hueDegFromHex(live.fogPeak) - hueDegFromHex(live.fogIdle);
    resolveTwinkleColor(
      fogTwinkleHueDeg + peakOff,
      live.twinkleS,
      live.twinkleL,
      _fogPeak,
    );
    if (audio?.enabled && audio.pulseAmt !== undefined) {
      pulseTwinkleLight(_scratch, audio.pulseAmt, live.fogDrive);
      pulseTwinkleLight(_fogPeak, audio.pulseAmt, live.fogDrive);
    }
    toneFog(_scratch, _fog);
    toneFog(_fogPeak, _fogPeak);
    _fog.lerp(_fogPeak, fogLevel);
  } else {
    _scratch.set(live.fogIdle);
    _fogPeak.set(live.fogPeak);
    toneFog(_scratch, _fog);
    toneFog(_fogPeak, _fogPeak);
    _fog.lerp(_fogPeak, fogLevel);
  }

  fog.color.copy(_fog);
  background.copy(_fog);
}
