/**
 * Port of Shadertoy https://www.shadertoy.com/view/fXG3Ww
 * “Fairy smoke” — Himred (variation of Nebula dive)
 *
 * Color modes (uColorMode):
 *  0 original — Himred cos(z+t) phase palette
 *  1 twinkle  — solid CPU tint (HSL walk); density from palette luminance
 *  2 palette  — solid idle→peak tint; density from palette luminance
 */

export const fairysmokeVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fairysmokeFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uSmokeT;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;
/** Breaks cyclic cos lock — secondary phase warp (0 = Himred) */
uniform float uChaos;
/** Raymarch samples = 40 × density (Himred ≈ 80) */
uniform float uSteps;
/** 0 = original, 1 = twinkle, 2 = palette */
uniform float uColorMode;

vec3 satMix(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), c, uSaturation);
}

void main() {
  vec2 I = vUv * iResolution.xy;
  float t = uSmokeT;
  float z = 0.0;
  float d = 0.0;
  vec4 O = vec4(0.0);

  float mode = floor(uColorMode + 0.5);
  float flicker = clamp(uPeakFlicker, 0.0, 1.0);
  vec3 tint = mix(uColor, uHighlight, flicker);

  float chaos = max(0.0, uChaos);
  float steps = clamp(uSteps, 40.0, 320.0);
  // Old density-40 punch was really a 2× tone boost — bake that into chaos instead
  float chaosGain = 1.0 + chaos;
  // ×2 (80) = Himred step size; higher density = finer march through the same shell
  float stepScale = 80.0 / steps;

  for (int step = 0; step < 320; step++) {
    if (float(step) >= steps) break;
    vec3 p = z * normalize(vec3(I + I, 0.0) - iResolution.xyy);
    p.z += 5.0;
    d = 1.0;
    for (int oct = 0; oct < 16; oct++) {
      if (d >= 9.0) break;
      // Secondary incommensurate warp — kills the perfect cos(t) loop
      vec3 warp = sin(p.zxy * vec3(1.17, 0.83, 1.41) + t * vec3(0.31, -0.19, 0.23));
      float amp = 1.0 + chaos * 0.55;
      p += cos(p.yzx * d + t + warp * chaos * 1.8) * amp / d;
      d /= 0.7;
    }
    d = 0.01 + abs(length(p) - 2.0) / 7.0;
    z += d * stepScale;

    vec4 pal = cos(z + t + vec4(6.0, 1.0, 2.0, 0.0)) + 1.0;
    // Mild energy keep — still denser at high ×, but not a flat tanh wall after ×4
    float w = chaosGain * mix(1.0, stepScale, 0.35);

    if (mode < 0.5) {
      // Original Himred phase rainbow (+ mild brightness punch)
      float punch = 1.0 + flicker * 0.55;
      O += pal * punch * w / d;
    } else {
      // Solid tint — keep volumetric weight from palette luminance, drop hue phase
      float dens = dot(pal.rgb, vec3(0.333333)) * w / d;
      O.rgb += tint * dens;
      O.a += dens;
    }
  }

  // Himred tone map; chaosGain already restores the first-iter pop
  O = tanh(O / 3e3);
  O.rgb = satMix(O.rgb);
  gl_FragColor = vec4(O.rgb, 1.0);
}
`;
