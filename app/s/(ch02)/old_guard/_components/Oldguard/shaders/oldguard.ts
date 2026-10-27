/**
 * Author port inspired by Shadertoy https://www.shadertoy.com/view/3lyGRd
 * “Old Guard” — waving empire flag (piyushslayer doodle → fabric + iChannel0).
 *
 * - iTime → uWaveT × waveSpeed
 * - uWaveAmount scales displace + shade
 * - iChannel0 = selected flag texture
 */

export const oldguardVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const oldguardFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float uWaveT;
uniform float uWaveAmount;
uniform float uSaturation;
uniform sampler2D iChannel0;

#define PI 3.1415926535

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 applySat(vec3 c, float sat) {
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(g), c, sat);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  vec2 st = fragCoord / iResolution.xy;

  float amt = max(uWaveAmount, 0.0);
  // Stock uses iTime*.75 — a touch slower reads better on photo flags
  float t = uWaveT * 0.55;

  // Same waviness factor as piyushslayer
  float w = sin(
    (uv.x + uv.y - t + sin(1.5 * uv.x + 4.5 * uv.y) * PI * 0.3) * PI * 0.6
  );

  // Original soft scale-warp (not hard st offset — that looked too snappy)
  float warp = 1.0 + (0.036 - 0.036 * w) * amt;
  vec2 uvW = uv * warp;
  float minSide = min(iResolution.x, iResolution.y);
  vec2 fragW = uvW * minSide * 0.5 + iResolution.xy * 0.5;
  vec2 flagTexCoord = clamp(fragW / iResolution.xy, 0.001, 0.999);

  vec3 col = texture2D(iChannel0, flagTexCoord).xyz;
  col += w * 0.225 * amt;

  float v = 16.0 * st.x * (1.0 - st.x) * st.y * (1.0 - st.y);
  col *= 1.0 - 0.6 * exp2(-1.75 * v);
  col = clamp(col - hash(fragCoord) * 0.004, 0.0, 1.0);
  col = applySat(col, uSaturation);
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
