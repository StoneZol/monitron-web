/**
 * Port of Shadertoy https://www.shadertoy.com/view/s3G3D1
 * “Observance” — diatribes
 *
 * Changes from original:
 * - iTime / iResolution / uCamZ (flight via accumulated cam Z)
 * - uCrosses: toggle cross SDF (stock black bodies)
 * - uCrossesAir / uCrossesFlip: lift off terrain / invert local Y
 * - uCrossSway: scale stock path rotation when crosses on (1 = Shadertoy)
 * - uCamBank: coral-style flex look when crosses off
 * - uLightning: toggle sharp stripe / flash spikes only (sun stays)
 * - uSunColor: CPU twinkle or idle→peak tint for sun + stripes
 *
 * Terrain without crosses follows the simpler fork (no cross SDF).
 */

export const observanceVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const observanceFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uCamZ;
/** Clock for cross-path sway / flex look (audio scales rate, not punches). */
uniform float uSwayT;
uniform float uCrosses;
uniform float uCrossesAir;
uniform float uCrossesFlip;
uniform float uCrossSway;
uniform float uCamBank;
uniform float uLightning;
uniform vec3 uSunColor;

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 u = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

  float t = iTime;
  float f = sin(t + sin(t * 10.0 + cos(t * 20.0)));

  float dens = 0.0;
  float d = 0.0;
  float s = 0.0;
  vec3 p = vec3(0.0);
  vec3 q = vec3(0.0);

  bool crossesOn = uCrosses > 0.5;
  bool lightningOn = uLightning > 0.5;
  float swayAmt = clamp(uCrossSway, 0.0, 2.0);

  // Ray basis: stock D = vec3(u, 1). Without crosses, flex-wander like coral.
  float yaw = 0.0;
  float pitch = 0.0;
  if (!crossesOn) {
    float bank = clamp(uCamBank, 0.0, 2.0);
    float ft = uSwayT;
    float ax =
      sin(ft * 0.097) * 0.50 +
      sin(ft * 0.173 + 2.15) * 0.32 +
      sin(ft * 0.281 + 5.10) * 0.22 +
      sin(ft * 0.041 + 1.30) * 0.18;
    float ay =
      cos(ft * 0.113) * 0.50 +
      sin(ft * 0.197 + 0.90) * 0.32 +
      cos(ft * 0.251 + 3.70) * 0.22 +
      cos(ft * 0.053 + 4.40) * 0.18;
    vec2 look = vec2(ax, ay);
    float r = max(length(look), 1e-5);
    float diskR = r / sqrt(1.0 + r * r);
    look *= diskR / r;
    float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(ft * 0.037));
    float cone = 0.62 * bank * breath;
    yaw = look.x * cone;
    pitch = look.y * cone;
    pitch = clamp(pitch, -1.45, 1.45);
  }
  vec3 fwd = dirFrom(yaw, pitch);
  vec3 rt = vec3(cos(yaw), 0.0, -sin(yaw));
  // cross(fwd, rt) → +Y when yaw/pitch = 0 (stock D = vec3(u, 1))
  vec3 up = cross(fwd, rt);
  vec3 D = u.x * rt + u.y * up + fwd;

  for (float i = 0.0; i < 64.0; i++) {
    p = D * d;
    p.z += uCamZ;

    if (crossesOn) {
      q.xz = mod(p.xz, 4.0) - 2.0;
      vec4 c = cos(
        p.x * 0.01 +
          cos(uSwayT * 0.2) * 0.2 * swayAmt +
          vec4(0.0, 33.0, 11.0, 0.0)
      );
      p.xy *= mat2(c.x, c.y, c.z, c.w);
      s = 2.2 - p.y;
      for (float n = 0.01; n < 0.4; n += n) {
        s -= abs(dot(sin(0.1 * p / n), vec3(n)));
      }

      q += cos(t + q.yzx) * 0.2;
      // Lower hills = terrain plane at s≈3. Air = fixed lift toward canopy.
      float terrain = 3.0 - s;
      float lift =
        (uCrossesAir > 0.5 ? 1.85 : 0.0) + (uCrossesFlip > 0.5 ? 0.35 : 0.0);
      float along = terrain - lift;
      q.y = uCrossesFlip > 0.5 ? -along : along;
      // ~75% of stock height; base still near terrain (q.y≈0) when air/flip off.
      float g = min(
        max(max(abs(q.x) - 0.05, abs(q.y - 0.45) - 0.6), abs(q.z) - 0.02),
        max(max(abs(q.x) - 0.28, abs(q.y - 0.82) - 0.04), abs(q.z) - 0.02)
      );
      s = 0.5 * min(min(g, terrain), 0.01 + 0.2 * abs(s));
      d += s;
      dens += s;
    } else {
      s = 2.2 - p.y + cos(p.x * 0.3) * 0.3;
      for (float n = 0.01; n < 0.4; n += n) {
        s -= abs(dot(sin(0.23 * p / n), vec3(n)));
      }
      s = 0.4 * min(2.9 - s, 0.01 + 0.2 * abs(s));
      d += s;
      dens += s;
    }
  }

  vec3 col = dens * vec3(1.0);

  float denom = cos(t + p.y * 0.325);
  float ad = abs(denom);
  vec3 sun = pow(
    abs(vec3(3.0, 2.0, 1.0) / max(ad, 0.42)),
    vec3(0.5)
  );
  col += sun * uSunColor;

  if (lightningOn) {
    vec3 bolt = pow(
      abs(vec3(3.0, 2.0, 1.0) / max(ad, 1e-3)),
      vec3(f)
    );
    col += bolt * uSunColor;
  }

  vec3 sunW = vec3(0.6, 0.6, 1.0);
  float sunZ = max(dot(sunW, fwd), 0.05);
  vec2 sunUV = vec2(dot(sunW, rt), dot(sunW, up)) / sunZ;
  float falloff = length(u - sunUV);
  col = tanh(col / max(falloff, 1e-3) / 20.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
