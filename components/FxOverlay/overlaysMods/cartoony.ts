import { FxOverlayPass } from "../FxOverlay.GlPass";
import type { FxModeMod, FxModePaintContext } from "./types";

/**
 * Transparent film stack derived from Shadertoy NXt3W4 (jonnycat “Cartoony filter”).
 *
 * Overlay-only: grain + vignette on a clear layer. Does not sample or replace
 * the scene — mounts inside the R3F shell so Document PiP takes it too.
 *
 * Knobs: intensity (overall), speed (grain clock), particles (grain amount).
 */

export const cartoonyFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uIntensity;
uniform float uSpeed;
uniform float uParticles;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 filmGrain(vec2 fragCoord, float time, float particles) {
  vec2 seed = fragCoord + fract(time) * 1000.0;
  float gR = hash21(seed);
  float gG = hash21(seed + 17.13);
  float gB = hash21(seed + 91.7);

  float cell = mix(0.35, 1.6, clamp(particles, 0.0, 2.0) * 0.5);
  vec2 seedCoarse = floor(fragCoord * cell) + fract(time) * 1000.0;
  float coarse = hash21(seedCoarse + 5.5);

  vec3 fine = vec3(gR, gG, gB) - 0.5;
  float coarseCentered = coarse - 0.5;
  return fine * 0.7 + coarseCentered * 0.3;
}

void main() {
  vec2 res = iResolution.xy;
  vec2 uv = vUv;
  vec2 fragCoord = uv * res;

  vec2 centered = uv * 2.0 - 1.0;
  centered.x *= res.x / max(res.y, 1.0);

  float intensity = clamp(uIntensity, 0.0, 1.0);
  float particles = max(0.0, uParticles);
  float t = iTime * max(0.0, uSpeed);

  // Dense film grain (additive speckles)
  float GRAIN_STRENGTH = 0.11 * particles;
  vec3 grain = filmGrain(fragCoord, t, particles);
  float grainA = length(grain) * GRAIN_STRENGTH * 1.4 * intensity;

  // Light vignette (darken edges)
  float vig = 1.0 - smoothstep(0.3, 1.3, length(centered));
  float vigA = (1.0 - mix(0.85, 1.0, vig)) * intensity;

  // Premultiplied-ish: grain tint + black vignette in rgb, combined alpha
  vec3 rgb = grain * GRAIN_STRENGTH * intensity;
  float a = clamp(max(grainA, vigA), 0.0, 1.0);
  gl_FragColor = vec4(rgb, a);
}
`;

const runners = new WeakMap<HTMLElement, FxOverlayPass>();

function applyCartoony(ctx: FxModePaintContext) {
  let pass = runners.get(ctx.root);
  if (!pass) {
    try {
      pass = new FxOverlayPass(cartoonyFragmentShader);
    } catch {
      return;
    }
    runners.set(ctx.root, pass);
  }
  pass.apply(ctx.root, {
    intensity: ctx.intensity,
    speed: ctx.speed,
    particles: ctx.particles,
  });
}

function clearCartoony(root: HTMLElement) {
  const pass = runners.get(root);
  if (!pass) return;
  pass.dispose();
  runners.delete(root);
}

export const cartoonyMod: FxModeMod = {
  id: "cartoony",
  label: "Cartoony",
  knobs: ["intensity", "speed", "particles"],
  defaults: {
    intensity: 1,
    contrast: 1,
    speed: 1,
    particles: 2,
    blend: "normal",
  },
  source: {
    href: "https://www.shadertoy.com/view/NXt3W4",
    author: "jonnycat",
    title: "Cartoony filter",
  },
  apply: applyCartoony,
  clear: clearCartoony,
};
