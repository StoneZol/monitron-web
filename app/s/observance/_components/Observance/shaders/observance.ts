/**
 * Port of Shadertoy https://www.shadertoy.com/view/s3G3D1
 * “Observance” — diatribes
 *
 * Changes from original:
 * - iTime / iResolution / uCamZ (flight via accumulated cam Z)
 * - Crosses always on (no-cross fork lives in Dark Terrain)
 * - uCrossesAir / uCrossesFlip: lift off terrain / slide crossbar down
 * - uCrossBaseLight / uCrossBaseColor: ground lamp in front of each cross
 * - uCrossSway: scale stock path rotation (1 = Shadertoy)
 * - uLightning: toggle sharp stripe / flash spikes only (sun stays)
 * - uSunColor: CPU twinkle or idle→peak tint for sun + stripes
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
/** Clock for cross-path sway (audio scales rate, not punches). */
uniform float uSwayT;
uniform float uCrossesAir;
uniform float uCrossesFlip;
uniform float uCrossBaseLight;
uniform vec3 uCrossBaseColor;
uniform float uCrossSway;
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
  float baseAcc = 0.0;
  vec3 p = vec3(0.0);
  vec3 q = vec3(0.0);

  bool lightningOn = uLightning > 0.5;
  bool baseLightOn = uCrossBaseLight > 0.5;
  float swayAmt = clamp(uCrossSway, 0.0, 2.0);

  // Stock look: D = vec3(u, 1)
  float yaw = 0.0;
  float pitch = 0.0;
  vec3 fwd = dirFrom(yaw, pitch);
  vec3 rt = vec3(cos(yaw), 0.0, -sin(yaw));
  vec3 up = cross(fwd, rt);
  vec3 D = u.x * rt + u.y * up + fwd;

  for (float i = 0.0; i < 64.0; i++) {
    p = D * d;
    p.z += uCamZ;

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
    float lift = uCrossesAir > 0.5 ? 1.85 : 0.0;
    q.y = terrain - lift;
    // Flip = mirror crossbar about stem mid (0.45): default 0.68 ↔ flip 0.22.
    float barY = uCrossesFlip > 0.5 ? 0.22 : 0.68;
    // ~75% of stock height; base still near terrain (q.y≈0) when air off.
    float g = min(
      max(max(abs(q.x) - 0.05, abs(q.y - 0.45) - 0.6), abs(q.z) - 0.02),
      max(max(abs(q.x) - 0.35, abs(q.y - barY) - 0.04), abs(q.z) - 0.02)
    );
    if (baseLightOn) {
      // Fixed on the ground in front of the cross (−Z face).
      vec3 lightQ = vec3(0.0, -lift, -0.57);
      float bd = length(q - lightQ);
      baseAcc += 0.035 / (0.02 + bd * bd);
    }
    s = 0.5 * min(min(g, terrain), 0.01 + 0.2 * abs(s));
    d += s;
    dens += s;
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

  if (baseLightOn) {
    vec3 lamp = pow(
      abs(vec3(3.0, 2.0, 1.0) * baseAcc),
      vec3(0.5)
    );
    col += tanh(lamp * uCrossBaseColor * 0.22);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
