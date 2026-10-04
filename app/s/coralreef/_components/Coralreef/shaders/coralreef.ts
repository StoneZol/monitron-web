/**
 * Port of Shadertoy https://www.shadertoy.com/view/7X3GRS
 * “Coral Reef Y28” — Yusef28
 *
 * Color modes (uColorMode):
 *  0 original       — stock cos palette
 *  1 paletteTwinkle — same palette, phase walks (twinkle on default palette)
 *  2 twinkle        — solid HSL fill; density from palette luminance
 *  3 palette        — solid idle→peak; density from palette luminance
 */

export const coralreefVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const coralreefFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uFlyT;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;
/** Radians — shifts the stock cos palette (paletteTwinkle) */
uniform float uPalettePhase;
/** 0 original, 1 paletteTwinkle, 2 twinkle, 3 palette */
uniform float uColorMode;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

#define r(a) mat2(cos((a) - vec4(0.0, 11.0, 33.0, 0.0)))

vec3 satMix(vec3 c) {
  float l = dot(c, LUMA);
  return mix(vec3(l), c, uSaturation);
}

void main() {
  vec2 F = vUv * iResolution.xy;
  vec2 R = iResolution.xy;

  vec3 P, Q;
  float i = 0.0;
  float g = 0.0;
  float d = 0.1;
  float a;

  vec4 o = vec4(0.0);
  float mode = floor(uColorMode + 0.5);
  float flicker = clamp(uPeakFlicker, 0.0, 1.0);
  float punch = 1.0 + flicker * 0.55;
  vec3 tint = mix(uColor, uHighlight, flicker);
  float phase = (mode > 0.5 && mode < 1.5) ? uPalettePhase : 0.0;

  for (; i < 99.0 && d > 1e-4; i++) {
    g += d * 0.3;
    P = vec3((F - 0.5 * R) / R.y * g, g);
    P.z += uFlyT;
    P.xy *= r(P.z * 0.8);
    d = 1.0 - abs(P.y);

    for (a = 2.0; a < 6e2; a += a) {
      Q = P * a;
      Q.z += d * 12.5;
      d -= abs(dot(sin(Q), vec3(1.0))) / (a * 3.0);
    }

    vec4 pal =
      (0.5 + 0.5 * cos(d * 40.0 + P.z * 2.0 + vec4(1.0, 4.4, 4.0, 0.0) + phase)) /
      (0.006 + abs(d) * 0.08);

    if (mode < 1.5) {
      // original + paletteTwinkle
      o += pal * punch;
    } else {
      float dens = dot(pal.rgb, LUMA);
      o.rgb += tint * dens;
      o.a += dens;
    }
  }

  float vignette = length((F - 0.5 * R) / R.y);
  o = tanh(o / (2e4 * max(vignette, 1e-3)));
  o.rgb = satMix(o.rgb);
  gl_FragColor = vec4(o.rgb, 1.0);
}
`;
