/**
 * Port of Shadertoy https://www.shadertoy.com/view/f3y3DW
 * “kali star nest, free 360° flight” — aladiN (fork of Kali Star Nest)
 *
 * Changes from original:
 * - No mouse — freelook X/Y (manual) or center + bank flex; flight stays on +Z
 * - Accumulated flight clock (uFlyT) instead of iTime+33
 * - uColorMode: 0 = fractal fixedTint + dust (1:1), 1 = CPU star tint + stock dust
 * - uPeakFlicker / uSaturation for audio + look chroma
 * - AA = 1 (web); planes world-fixed; COLOR_MODE / DEPTH_MODE as aladiN defaults
 */

export const kalistarnestVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const kalistarnestFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uFlyT;
uniform float uYaw;
uniform float uPitch;
uniform float uCamBank;
/** 0 = manual X/Y look, 1 = center + flex scatter */
uniform float uCamMode;
/** 0 = original fractal palette + dust, 1 = CPU star tint + stock dust */
uniform float uColorMode;
uniform vec3 uStarColor;
uniform vec3 uStarHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;

const float FLY_SPEED = 0.10;
const float BLEND_POW = 32.0;
const float FAMILY_MIN = 0.05;
const float DEPTH_MAX = 2.0;
const float RED_AMOUNT = 0.7;
const int TEMP_ITER = 15;
const float COLOR_LO = 3.2;
const float COLOR_HI = 33.7;
const float COLOR_WARM = 0.57;
const float COLOR_COOL = 1.56;

const float strength = 1.2;
const float dust = 0.01;
const int iterations = 17;
const float formuparam = 0.53021;
const float stepsize = 0.11;
const float zoom = 0.800;
const float tile = 2.850;
const float brightness = 0.0015;
const float darkmatter = 0.300;
const float distfading = 0.730;
const float satAmt = 0.850;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 kaliAt(vec3 p) {
  p = abs(vec3(tile) - mod(p, vec3(tile * 2.0)));
  float pa = 0.0;
  float a = 0.0;
  float aT = 0.0;
  for (int i = 0; i < 17; i++) {
    if (i >= iterations) break;
    p = abs(p) / dot(p, p) - formuparam;
    a += abs(length(p) - pa);
    pa = length(p);
    if (i == TEMP_ITER - 1) aT = a;
  }
  return vec3(a, max(0.0, darkmatter - a * a * 0.005), aT);
}

vec3 lessRed(vec3 c) {
  float l = dot(c, LUMA);
  float extra = max(c.r - l, 0.0) * (1.0 - RED_AMOUNT);
  vec3 o = c - vec3(extra, 0.0, 0.0);
  return o * (l / max(dot(o, LUMA), 1e-6));
}

vec3 fixedTint(float aT) {
  float tau = clamp(
    log(max(aT, 1e-3) / COLOR_LO) / log(COLOR_HI / COLOR_LO),
    0.0,
    1.0
  );
  float c = mix(COLOR_WARM, COLOR_COOL, tau);
  vec3 k = vec3(c, c * c, c * c * c * c);
  return lessRed(k / dot(k, LUMA));
}

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

vec3 pathPos(float t) {
  float d = FLY_SPEED * t;
  return vec3(1.5, 0.75, -1.5) +
    vec3(1.6 * sin(d * 1.3), 0.9 * sin(d * 0.9 + 0.7), 4.0 * d);
}

vec3 family(
  vec3 ro,
  vec3 rd,
  vec3 fwd,
  vec3 e,
  float sMax,
  float colorMode,
  float flicker
) {
  const float dAx = 0.5 * stepsize;
  float re = dot(rd, e);
  float rz = 1.0; // DEPTH_MODE 1 — true distance
  if (abs(re) < 1e-3) return vec3(0.0);

  float wt = rz / abs(re);
  float oe = dot(ro, e);
  float tNear = 0.0;
  float tFar = 0.5 * sMax / rz;
  float c0 = oe + re * tNear;
  float c1 = oe + re * tFar;
  float kStep = re > 0.0 ? 1.0 : -1.0;
  float k0 = re > 0.0 ? floor(c0 / dAx) + 1.0 : ceil(c0 / dAx) - 1.0;
  int n = int(min(abs(c1 - c0) / dAx + 1.0, 64.0));

  vec3 v = vec3(0.0);
  float fade = 1.0;

  for (int j = 0; j < 64; j++) {
    if (j >= n) break;
    float t = ((k0 + kStep * float(j)) * dAx - oe) / re;
    float s = 2.0 * t * rz;
    if (s > sMax) break;

    vec3 q = kaliAt(ro + rd * t);
    float a = q.x * q.x * q.x;
    float dm = q.y;
    float w =
      wt *
      smoothstep(0.0, stepsize, s) *
      (1.0 - smoothstep(sMax - stepsize, sMax, s));
    fade *= max(1.0 - dm * w * smoothstep(0.7, 0.8, s), 0.0);
    float fd = pow(distfading, s / stepsize - 1.0);

    // Stock yellow dust always (no separate fog controls)
    v += w * lessRed(vec3(dm, dm * 0.5, 0.0));
    float depthLum = dot(vec3(s, s * s, s * s * s * s), LUMA);
    float core = a * brightness * fade * fd * (1.0 + flicker * 0.55);

    if (colorMode < 0.5) {
      v += w * fixedTint(q.z) * depthLum * core;
    } else {
      float tau = clamp(
        log(max(q.z, 1e-3) / COLOR_LO) / log(COLOR_HI / COLOR_LO),
        0.0,
        1.0
      );
      vec3 starTint = mix(
        uStarColor,
        uStarHighlight,
        clamp(tau * 0.65 + flicker * 0.5, 0.0, 1.0)
      );
      v += w * starTint * depthLum * core;
    }
  }
  return v;
}

vec3 satMix(vec3 c) {
  float l = dot(c, LUMA);
  return mix(vec3(l), c, uSaturation);
}

void main() {
  float t = uFlyT;
  float bank = clamp(uCamBank, 0.0, 2.0);

  // Flight along +Z — look 0/0 = down the barrel; X/Y freelook is independent
  vec3 flyDir = dirFrom(0.0, 0.0);
  vec3 ro = pathPos(0.0) + flyDir * (4.0 * FLY_SPEED * t);

  float yaw = uYaw;
  float pitch = uPitch;
  if (uCamMode > 0.5) {
    // Flex: multi-rate wander (incommensurate) + center bias.
    // Raw sum alone sits off-axis at high bank; cubic + glance pull it home often.
    float yRaw =
      sin(t * 0.11) * 0.42 +
      sin(t * 0.27 + 1.7) * 0.28 +
      sin(t * 0.053 + 4.1) * 0.22 +
      sin(t * 0.41 + 2.3) * 0.12;
    float pRaw =
      cos(t * 0.14) * 0.28 +
      sin(t * 0.19 + 0.9) * 0.22 +
      cos(t * 0.07 + 3.4) * 0.18 +
      sin(t * 0.33 + 5.2) * 0.10;
    // Odd power → most time near 0; peaks still scale with bank
    float yCub = yRaw * yRaw * yRaw;
    float pCub = pRaw * pRaw * pRaw;
    // Slow envelope: wide glances, then collapse toward center
    float glance = 0.20 + 0.80 * abs(sin(t * 0.041) * sin(t * 0.067 + 1.3));
    yaw = yCub * 1.35 * bank * glance;
    pitch = pCub * 1.15 * bank * glance;
  }
  pitch = clamp(pitch, -1.45, 1.45);

  vec3 fwd = dirFrom(yaw, pitch);
  vec3 worldUp = abs(fwd.y) > 0.95 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 rt = normalize(cross(worldUp, fwd));
  vec3 up = cross(fwd, rt);

  vec3 e0 = vec3(1.0, 0.0, 0.0);
  vec3 e1 = vec3(0.0, 1.0, 0.0);
  vec3 e2 = vec3(0.0, 0.0, 1.0);

  vec2 fragCoord = vUv * iResolution.xy;
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.x;

  float colorMode = floor(uColorMode + 0.5);
  float flicker = clamp(uPeakFlicker, 0.0, 1.0);

  vec3 d =
    uv.x * zoom * rt +
    uv.y * zoom * up +
    fwd;
  vec3 rd = normalize(d);

  vec3 bw = pow(
    abs(vec3(dot(rd, e0), dot(rd, e1), dot(rd, e2))),
    vec3(BLEND_POW)
  );
  bw /= bw.x + bw.y + bw.z;

  vec3 v = vec3(0.0);
  if (bw.x > FAMILY_MIN) v += bw.x * family(ro, rd, fwd, e0, DEPTH_MAX, colorMode, flicker);
  if (bw.y > FAMILY_MIN) v += bw.y * family(ro, rd, fwd, e1, DEPTH_MAX, colorMode, flicker);
  if (bw.z > FAMILY_MIN) v += bw.z * family(ro, rd, fwd, e2, DEPTH_MAX, colorMode, flicker);

  float wSum =
    bw.x * step(FAMILY_MIN, bw.x) +
    bw.y * step(FAMILY_MIN, bw.y) +
    bw.z * step(FAMILY_MIN, bw.z);
  v /= max(wSum, 1e-6);
  v = mix(vec3(length(v)), v, satAmt);
  vec3 col = 1.0 - exp(-pow(v, vec3(strength)) * dust);
  col = satMix(col);

  gl_FragColor = vec4(col, 1.0);
}
`;
