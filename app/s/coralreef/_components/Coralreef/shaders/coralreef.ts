/**
 * Port of Shadertoy https://www.shadertoy.com/view/7X3GRS
 * “Coral Reef Y28” — Yusef28
 *
 * Color modes (uColorMode):
 *  0 original       — stock cos palette
 *  1 paletteTwinkle — same palette, phase walks (twinkle on default palette)
 *  2 twinkle        — solid HSL fill; density from palette luminance
 *  3 palette        — solid idle→peak; density from palette luminance
 *  4 duo            — stock cos wave, lerp uColor→uHighlight
 *  5 duoTwinkle     — same duo, phase walks (twinkle twin of duo)
 *
 * Tunnel sun (uLightMode):
 *  0 original — stock bloom from the reef accumulation (1:1)
 *  1 custom   — recolor bright +Z core with uLight / uLightHighlight
 *
 * Camera: flight scrolls along +Z; look is freelook X/Y or flex bank wander.
 *
 * Smoothing vs original: soft-abs glow, slightly finer march, 2-tap AA
 * (cuts stair-step “shadow” edges on large screens).
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
uniform float uYaw;
uniform float uPitch;
uniform float uCamBank;
/** 0 = manual X/Y look, 1 = center + flex scatter */
uniform float uCamMode;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;
/** Radians — shifts stock cos / duo wave (paletteTwinkle + duoTwinkle) */
uniform float uPalettePhase;
/** 0 original, 1 paletteTwinkle, 2 twinkle, 3 palette, 4 duo, 5 duoTwinkle */
uniform float uColorMode;
/** 0 = stock tunnel sun, 1 = custom light tint on bright core */
uniform float uLightMode;
uniform vec3 uLight;
uniform vec3 uLightHighlight;
uniform float uLightFlicker;
/** Shadow / edge smooth — 0 = stock, 1 = default soft, 2 = 2× softer */
uniform float uShadowSmooth;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

#define r(a) mat2(cos((a) - vec4(0.0, 11.0, 33.0, 0.0)))

vec3 satMix(vec3 c) {
  float l = dot(c, LUMA);
  return mix(vec3(l), c, uSaturation);
}

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

vec4 traceReef(
  vec3 rd,
  float flyT,
  float mode,
  float phase,
  float punch,
  vec3 tint,
  float smoothAmt
) {
  vec3 P, Q;
  float i = 0.0;
  float g = 0.0;
  float d = 0.1;
  float a;
  vec4 o = vec4(0.0);
  // 0 = stock Yusef28, 1 = default soft, 2 = 2× softer
  float s = clamp(smoothAmt, 0.0, 2.0);
  float t01 = clamp(s, 0.0, 1.0);       // stock → default
  float t12 = clamp(s - 1.0, 0.0, 1.0); // default → 2×

  float stepMul = mix(0.30, mix(0.22, 0.11, t12), t01);
  float minStep = mix(0.0, mix(0.0012, 0.0006, t12), t01);
  float softEps = mix(0.0, mix(4e-5, 8e-5, t12), t01);
  float glowBase = mix(0.006, mix(0.009, 0.018, t12), t01);
  float glowK = mix(0.08, mix(0.10, 0.135, t12), t01);
  float maxIter = mix(99.0, mix(110.0, 150.0, t12), t01);
  float hitEps = mix(1e-4, 5e-5, t01);

  for (; i < 150.0 && d > hitEps; i++) {
    if (i >= maxIter) break;
    float step = d * stepMul;
    g += minStep > 0.0 ? max(step, minStep) : step;
    P = rd * g;
    P.z += flyT;
    P.xy *= r(P.z * 0.8);
    d = 1.0 - abs(P.y);

    for (a = 2.0; a < 6e2; a += a) {
      Q = P * a;
      Q.z += d * 12.5;
      d -= abs(dot(sin(Q), vec3(1.0))) / (a * 3.0);
    }

    float ad = softEps > 0.0 ? sqrt(d * d + softEps) : abs(d);
    vec4 pal =
      (0.5 + 0.5 * cos(d * 40.0 + P.z * 2.0 + vec4(1.0, 4.4, 4.0, 0.0) + phase)) /
      (glowBase + ad * glowK);

    if (mode < 1.5) {
      o += pal * punch;
    } else if (mode > 3.5) {
      // Duo / duoTwinkle: stock cos wave, lerp A→B (phase walks in duoTwinkle)
      float wave =
        0.5 + 0.5 * cos(d * 40.0 + P.z * 2.0 + 1.0 + phase);
      float w = 1.0 / (glowBase + ad * glowK);
      vec3 duo = mix(uColor, uHighlight, wave);
      o.rgb += duo * w * punch;
      o.a += w * punch;
    } else {
      float dens = dot(pal.rgb, LUMA);
      o.rgb += tint * dens;
      o.a += dens;
    }
  }
  return o;
}

void main() {
  vec2 F = vUv * iResolution.xy;
  vec2 R = iResolution.xy;
  vec2 uv = (F - 0.5 * R) / R.y;

  float t = uFlyT;
  float bank = clamp(uCamBank, 0.0, 2.0);
  float yaw = uYaw;
  float pitch = uPitch;

  if (uCamMode > 0.5) {
    // Flex look: isotropic wander inside a unit disk; bank scales the cone radius.
    // (No cubic remap — that crushed bank < 1 and snapped hard on the +yaw side.)
    float ax =
      sin(t * 0.097) * 0.50 +
      sin(t * 0.173 + 2.15) * 0.32 +
      sin(t * 0.281 + 5.10) * 0.22 +
      sin(t * 0.041 + 1.30) * 0.18;
    float ay =
      cos(t * 0.113) * 0.50 +
      sin(t * 0.197 + 0.90) * 0.32 +
      cos(t * 0.251 + 3.70) * 0.22 +
      cos(t * 0.053 + 4.40) * 0.18;
    vec2 look = vec2(ax, ay);
    float r = max(length(look), 1e-5);
    // Soft unit disk: linear near center, asymptote to rim
    float diskR = r / sqrt(1.0 + r * r);
    look *= diskR / r;
    // Gentle radius breath — no directional bias
    float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(t * 0.037));
    float cone = 0.62 * bank * breath;
    yaw = look.x * cone;
    pitch = look.y * cone;
  }
  pitch = clamp(pitch, -1.45, 1.45);

  vec3 fwd = dirFrom(yaw, pitch);
  vec3 rt = vec3(cos(yaw), 0.0, -sin(yaw));
  vec3 up = cross(rt, fwd);

  float mode = floor(uColorMode + 0.5);
  float flicker = clamp(uPeakFlicker, 0.0, 1.0);
  float punch = 1.0 + flicker * 0.55;
  vec3 tint = mix(uColor, uHighlight, flicker);
  // Phase walk: paletteTwinkle (1) or duoTwinkle (5)
  float phase =
    (mode > 0.5 && mode < 1.5) || mode > 4.5 ? uPalettePhase : 0.0;

  // AA: 0 → 1 tap (stock), 1 → 2, 2 → 4
  float s = clamp(uShadowSmooth, 0.0, 2.0);
  float aaN = s <= 0.0 ? 1.0 : (s <= 1.0 ? 2.0 : 4.0);
  vec4 o = vec4(0.0);
  for (int k = 0; k < 4; k++) {
    if (float(k) >= aaN) break;
    vec2 offs = vec2(0.0);
    if (aaN > 1.5 && aaN < 2.5) {
      offs = k == 0 ? vec2(-0.25) : vec2(0.25);
    } else if (aaN > 2.5) {
      float fx = mod(float(k), 2.0);
      float fy = floor(float(k) / 2.0);
      offs = vec2(fx - 0.5, fy - 0.5) * 0.35;
    }
    vec2 uva = uv + offs / R.y;
    vec3 rd = uva.x * rt + uva.y * up + fwd;
    vec4 sampleCol = traceReef(rd, uFlyT, mode, phase, punch, tint, s);
    // Stock used screen-center bloom (length(uv)) — that sticks the “sun” to the camera.
    // Use angle off the tunnel axis (+Z) so the light lives down the tunnel instead.
    float offAxis = length(normalize(rd).xy);
    sampleCol = tanh(sampleCol / (2e4 * max(offAxis, 1e-3)));

    // Custom tunnel sun: recolor the bright +Z core, keep stock energy.
    if (uLightMode > 0.5) {
      vec3 L = mix(uLight, uLightHighlight, clamp(uLightFlicker, 0.0, 1.0));
      float e = max(dot(sampleCol.rgb, LUMA), 0.0);
      float sun =
        smoothstep(0.06, 0.5, e) * (1.0 - smoothstep(0.0, 0.42, offAxis));
      float lRef = max(dot(L, LUMA), 1e-3);
      sampleCol.rgb = mix(sampleCol.rgb, L * (e / lRef), sun);
    }
    o += sampleCol;
  }
  o /= aaN;

  o.rgb = satMix(o.rgb);
  gl_FragColor = vec4(o.rgb, 1.0);
}
`;
