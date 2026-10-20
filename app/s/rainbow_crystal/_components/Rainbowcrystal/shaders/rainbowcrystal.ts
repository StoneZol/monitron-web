/**
 * Port of Shadertoy https://www.shadertoy.com/view/sXtSzB
 * "Rainbow Crystal" - OldEclipse
 *
 * Color modes (uColorMode):
 *  0 original - exp(sin) phase (locked source palette)
 *  1 twinkle  - solid CPU tint (HSL walk)
 *  2 palette  - solid idle->peak tint
 *  3 flow     - original palette + drifting phase
 */

export const rainbowcrystalVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const rainbowcrystalFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float uCrystalT;
/** Bank clock for tan() only - crawls near asymptotes; flight stays on uCrystalT */
uniform float uBankT;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;
/** Radians phase for flow mode (original palette drift) */
uniform float uPalettePhase;
/** 0 = original, 1 = twinkle, 2 = palette, 3 = flow */
uniform float uColorMode;

vec3 satMix(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), c, uSaturation);
}

void main() {
  vec2 I = vUv * iResolution.xy;
  float iTime = uCrystalT;
  float t = 0.0;
  float v = 0.0;
  float D = 0.0;
  vec4 O = vec4(0.0);

  float mode = floor(uColorMode + 0.5);
  float flicker = clamp(uPeakFlicker, 0.0, 1.0);
  vec3 tint = mix(uColor, uHighlight, flicker);

  for (int step = 0; step < 80; step++) {
    float i = float(step + 1);
    vec3 P;
    vec3 p = t * normalize(vec3(I + I, 0.0) - iResolution.xyy);
    p.z += 0.06;
    D = dot(p, p);
    p /= D;
    // tan() bank angles; uBankT crawls only through cos~0 flips.
    // Flight / cells stay on linear iTime (uCrystalT).
    p = reflect(p, normalize(tan(uBankT * 0.2 + vec3(0.0, 2.0, 5.0))));
    p.z -= iTime * 8.0;
    P = ceil(p / 4.0);
    p = ceil(
      5.0 * reflect(
        mod(p, vec3(4.0, 4.0, 12.0)) - vec3(2.0, 2.0, 6.0),
        normalize(sin(iTime * 0.5 + P))
      )
    ) / 5.0;
    p += sin(3.0 * p) / 3.0;
    v = abs(length(p + sin(p * 2.0 + iTime + P) / 2.0) - 0.9) + 0.03;

    float punch = 1.0 + flicker * 0.45;
    if (mode < 0.5) {
      // Locked original palette
      O += exp(sin(i * 0.1 + t * 2e2 + vec4(0.0, 2.0, 4.0, 0.0))) / v * punch;
    } else if (mode > 2.5) {
      // Flow: same palette, drifting phase
      O += exp(sin(i * 0.1 + t * 2e2 + uPalettePhase + vec4(0.0, 2.0, 4.0, 0.0))) / v * punch;
    } else {
      float dens = 1.0 / v;
      O.rgb += tint * dens;
      O.a += dens;
    }

    t += v * 0.3 * min(D, 1.0);
  }

  O = tanh(O / 4e2);
  O *= O;
  O.rgb = satMix(O.rgb);
  gl_FragColor = vec4(O.rgb, 1.0);
}
`;
