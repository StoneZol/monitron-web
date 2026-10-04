import type { FxModeMod } from "./types";

/**
 * Port of Shadertoy https://www.shadertoy.com/view/NXt3W4
 * “Cartoony filter” — jonnycat
 *
 * Chromatic aberration + multi-tap bloom + dense film grain + vignette.
 * Knobs: uSpeed (grain clock), uParticles (grain density / strength).
 * uIntensity mixes dry scene ↔ wet filter.
 */

export const cartoonyFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D iChannel0;
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

// Dense animated film grain — per-channel fine + coarser clumps.
vec3 filmGrain(vec2 fragCoord, float time, float particles) {
  vec2 seed = fragCoord + fract(time) * 1000.0;

  float gR = hash21(seed);
  float gG = hash21(seed + 17.13);
  float gB = hash21(seed + 91.7);

  // More particles → finer / denser coarse cell grid
  float cell = mix(0.35, 1.6, clamp(particles, 0.0, 2.0) * 0.5);
  vec2 seedCoarse = floor(fragCoord * cell) + fract(time) * 1000.0;
  float coarse = hash21(seedCoarse + 5.5);

  vec3 fine = vec3(gR, gG, gB) - 0.5;
  float coarseCentered = coarse - 0.5;

  return fine * 0.7 + coarseCentered * 0.3;
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 sampleSource(vec2 uv, out float brightMask) {
  vec3 col = texture2D(iChannel0, uv).rgb;
  float BLOOM_THRESHOLD = 0.55;
  brightMask = smoothstep(BLOOM_THRESHOLD, 1.0, luma(col));
  return col;
}

void main() {
  vec2 res = iResolution.xy;
  vec2 uv = vUv;
  vec2 fragCoord = uv * res;

  vec2 centered = uv * 2.0 - 1.0;
  centered.x *= res.x / res.y;

  vec3 dry = texture2D(iChannel0, uv).rgb;

  // ---- chromatic aberration ----
  float ABERRATION_STRENGTH = 0.010;
  float ABERRATION_FALLOFF = 0.24;
  float ABERRATION_CENTER_MIN = 0.002;

  float edge = pow(length(centered) * ABERRATION_FALLOFF, 2.0);
  float amt = ABERRATION_STRENGTH * edge + ABERRATION_CENTER_MIN;

  vec2 dir = normalize(centered + 1e-5);
  vec2 uvR = uv + dir * amt;
  vec2 uvG = uv;
  vec2 uvB = uv - dir * amt;

  float bR, bG, bB;
  float r = sampleSource(uvR, bR).r;
  vec3 gCol = sampleSource(uvG, bG);
  float b = sampleSource(uvB, bB).b;

  vec3 col = vec3(r, gCol.g, b);

  // ---- bloom ----
  float BLOOM_RADIUS = 0.02;
  float BLOOM_STRENGTH = 1.1;
  const int TAPS = 12;
  const int RINGS = 3;

  vec3 bloom = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float a = float(i) / float(TAPS) * 6.2831853;
    for (int rg = 1; rg <= RINGS; rg++) {
      float rad = float(rg) * BLOOM_RADIUS / float(RINGS);
      vec2 off = vec2(cos(a), sin(a)) * rad;
      float bm;
      vec3 s = sampleSource(uvG + off, bm);
      float w = 1.0 / float(rg);
      bloom += s * bm * w;
      total += w;
    }
  }
  bloom /= max(total, 0.0001);

  col += bloom * BLOOM_STRENGTH;

  // gentle tonemap
  col = col / (1.0 + col * 0.6);

  // light vignette
  float vig = smoothstep(1.3, 0.3, length(centered));
  col *= mix(0.85, 1.0, vig);

  // film grain — speed clocks noise; particles scale strength + density
  float particles = max(0.0, uParticles);
  float GRAIN_STRENGTH = 0.11 * particles;
  float t = iTime * max(0.0, uSpeed);
  vec3 grain = filmGrain(fragCoord, t, particles);
  float grainVis = 1.0 - smoothstep(0.6, 1.3, luma(col));
  col += grain * GRAIN_STRENGTH * mix(0.5, 1.0, grainVis);

  float mixAmt = clamp(uIntensity, 0.0, 1.0);
  col = mix(dry, col, mixAmt);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const cartoonyMod: FxModeMod = {
  id: "cartoony",
  label: "Cartoony",
  kind: "shader",
  knobs: ["intensity", "speed", "particles"],
  defaults: {
    intensity: 1,
    contrast: 1,
    speed: 1,
    particles: 1,
    blend: "normal",
  },
  source: {
    href: "https://www.shadertoy.com/view/NXt3W4",
    author: "jonnycat",
    title: "Cartoony filter",
  },
  fragmentShader: cartoonyFragmentShader,
};
