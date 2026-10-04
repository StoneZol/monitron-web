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

  for (int step = 0; step < 80; step++) {
    vec3 p = z * normalize(vec3(I + I, 0.0) - iResolution.xyy);
    p.z += 5.0;
    d = 1.0;
    for (int oct = 0; oct < 16; oct++) {
      if (d >= 9.0) break;
      p += cos(p.yzx * d + t) / d;
      d /= 0.7;
    }
    d = 0.01 + abs(length(p) - 2.0) / 7.0;
    z += d;

    vec4 pal = cos(z + t + vec4(6.0, 1.0, 2.0, 0.0)) + 1.0;

    if (mode < 0.5) {
      // Original Himred phase rainbow (+ mild brightness punch)
      float punch = 1.0 + flicker * 0.55;
      O += pal * punch / d;
    } else {
      // Solid tint — keep volumetric weight from palette luminance, drop hue phase
      float dens = dot(pal.rgb, vec3(0.333333)) / d;
      O.rgb += tint * dens;
      O.a += dens;
    }
  }

  O = tanh(O / 3e3);
  O.rgb = satMix(O.rgb);
  gl_FragColor = vec4(O.rgb, 1.0);
}
`;
