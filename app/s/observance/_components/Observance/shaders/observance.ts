/**
 * Port of Shadertoy https://www.shadertoy.com/view/s3G3D1
 * “Observance” — diatribes
 *
 * Changes from original:
 * - iTime / iResolution / uCamZ (flight via accumulated cam Z)
 * - Camera: stock (ahead) / manual X/Y / flex bank (Dark Terrain look)
 * - Crosses always on (no-cross fork lives in Dark Terrain)
 * - uCrossesAir / uCrossesFlip: lift off terrain / slide crossbar down
 * - uCrossBaseLight / uCrossBaseColor: ground lamp in front of each cross
 * - uCrossSway: scale stock path rotation (1 = Shadertoy)
 * - uLightningRate: sharp flashes (0 = off, 1 = stock cadence)
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
/** Cross-path sway clock (always runs; amount = uCrossSway). */
uniform float uSwayT;
/** Flex look clock (Cam accel scales rate). */
uniform float uLookT;
/** 0 = stock ahead, 1 = manual X/Y, 2 = flex bank */
uniform float uCamMode;
uniform float uYaw;
uniform float uPitch;
uniform float uCamBank;
uniform float uCrossesAir;
uniform float uCrossesFlip;
uniform float uCrossBaseLight;
uniform vec3 uCrossBaseColor;
uniform float uCrossSway;
/** Flash clock rate (0 = off, 1 = Shadertoy, 2 = 2×). */
uniform float uLightningRate;
uniform vec3 uSunColor;

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

float hash11(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 u = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

  float t = iTime;
  float flashT = t * max(uLightningRate, 0.0);
  // One flash slot: random attack, always smooth decay to 0 before the next seed.
  float flashClock = flashT * 1.85;
  float beat = floor(flashClock);
  float slot = fract(flashClock);
  float r0 = hash11(beat + 17.13);
  float r1 = hash11(beat + 91.7);
  float r2 = hash11(beat + 53.31);
  float delay = r0 * 0.38;
  float life = clamp((slot - delay) / max(1.0 - delay, 1e-3), 0.0, 1.0);
  float peakAt = 0.08 + r1 * 0.22;
  float flashEnv = 0.0;
  if (life > 0.0 && life < 1.0) {
    if (life < peakAt) {
      // Randomized snap-in.
      flashEnv = pow(life / peakAt, 0.25 + r2 * 1.1);
    } else {
      // Always smooth cosine fall to silence at slot end.
      float x = (life - peakAt) / max(1.0 - peakAt, 1e-3);
      flashEnv = 0.5 + 0.5 * cos(x * 3.14159265);
    }
  }

  float dens = 0.0;
  float d = 0.0;
  float s = 0.0;
  float baseAcc = 0.0;
  vec3 p = vec3(0.0);
  vec3 q = vec3(0.0);

  bool lightningOn = uLightningRate > 0.001;
  bool baseLightOn = uCrossBaseLight > 0.5;
  float swayAmt = clamp(uCrossSway, 0.0, 2.0);

  float yaw = 0.0;
  float pitch = 0.0;
  if (uCamMode > 1.5) {
    // Flex — Dark Terrain bank wander
    float bank = clamp(uCamBank, 0.0, 2.0);
    float ft = uLookT;
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
    float lr = max(length(look), 1e-5);
    float diskR = lr / sqrt(1.0 + lr * lr);
    look *= diskR / lr;
    float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(ft * 0.037));
    float cone = 0.62 * bank * breath;
    yaw = look.x * cone;
    pitch = clamp(look.y * cone, -1.45, 1.45);
  } else if (uCamMode > 0.5) {
    // Manual X/Y (radians from CPU)
    yaw = uYaw;
    pitch = clamp(uPitch, -1.45, 1.45);
  }
  // else stock: yaw/pitch stay 0 — Shadertoy ahead

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
    float g;
    if (baseLightOn) {
      // Stock mods one cell — fine for crosses alone. Ground lamps sample q,
      // so the tile edge through the camera (p.x=0 → screen center) became a
      // hard glow crease. Neighbors keep SDF + lamp field continuous.
      g = 1e3;
      for (float ox = -4.0; ox <= 4.0; ox += 4.0) {
        for (float oz = -4.0; oz <= 4.0; oz += 4.0) {
          vec3 qq = q - vec3(ox, 0.0, oz);
          g = min(
            g,
            min(
              max(
                max(abs(qq.x) - 0.05, abs(qq.y - 0.45) - 0.6),
                abs(qq.z) - 0.02
              ),
              max(
                max(abs(qq.x) - 0.35, abs(qq.y - barY) - 0.04),
                abs(qq.z) - 0.02
              )
            )
          );
          vec3 lightQ = vec3(ox, -lift, oz - 0.57);
          float bd = length(q - lightQ);
          baseAcc += 0.035 / (0.02 + bd * bd);
        }
      }
    } else {
      g = min(
        max(max(abs(q.x) - 0.05, abs(q.y - 0.45) - 0.6), abs(q.z) - 0.02),
        max(max(abs(q.x) - 0.35, abs(q.y - barY) - 0.04), abs(q.z) - 0.02)
      );
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

  if (lightningOn && flashEnv > 0.001) {
    // Warp / chroma randomized per flash; intensity follows smooth envelope.
    float boltDenom = cos(
      t + p.y * (0.26 + r1 * 0.14) + r0 * 5.1 + u.x * (r2 - 0.5) * 1.1
    );
    float boltAd = abs(boltDenom);
    vec3 boltW = vec3(2.4 + r0 * 1.4, 1.6 + r1 * 1.2, 0.7 + r2 * 0.9);
    float sharp = 0.55 + r2 * 0.9;
    vec3 bolt = pow(abs(boltW / max(boltAd, 1e-3)), vec3(sharp));
    col += bolt * uSunColor * flashEnv;
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
