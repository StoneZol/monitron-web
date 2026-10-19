/**
 * Port of Shadertoy https://www.shadertoy.com/view/3l23Rh
 * “Protean clouds” — nimitz (@stormoid)
 * License: CC BY-NC-SA 3.0
 *
 * Changes from original:
 * - iTime / iResolution uniforms; flight via accumulated uCamZ (≈ iTime*3)
 * - uCamMode: 0 = stock path, 1 = manual X/Y (bsMo-style)
 * - uYaw / uPitch: manual look in bsMo units (−1…1); pitch also feeds density
 * - uMorph: extra prm1 bias; stock prm1 pulse still from iTime
 * - uColorMode: 0 original, 1 paletteTwinkle, 2 solid, 3 twinkle
 * - uPhase: stock palette phase walk (paletteTwinkle)
 * - uTint: solid / twinkle fill; uSaturation / uPeakFlicker
 * - March budget 100 (was 130) for web idle GPU
 */

export const proteanVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const proteanFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uCamZ;
uniform float uCamMode;
uniform float uYaw;
uniform float uPitch;
uniform float uMorph;
/** 0 original, 1 paletteTwinkle, 2 solid, 3 twinkle */
uniform float uColorMode;
uniform float uPhase;
uniform vec3 uTint;
uniform float uSaturation;
uniform float uPeakFlicker;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

const mat3 m3 = mat3(
  0.33338, 0.56034, -0.71817,
  -0.87887, 0.32651, -0.15323,
  0.15162, 0.69596, 0.61339
) * 1.93;

mat2 rot(in float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

float mag2(vec2 p) { return dot(p, p); }

float linstep(in float mn, in float mx, in float x) {
  return clamp((x - mn) / (mx - mn), 0.0, 1.0);
}

vec2 disp(float t) {
  return vec2(sin(t * 0.22) * 1.0, cos(t * 0.175) * 1.0) * 2.0;
}

vec2 map(vec3 p, float prm1, float bsMoY) {
  vec3 p2 = p;
  p2.xy -= disp(p.z).xy;
  p.xy *= rot(sin(p.z + iTime) * (0.1 + prm1 * 0.05) + iTime * 0.09);
  float cl = mag2(p2.xy);
  float d = 0.0;
  p *= 0.61;
  float z = 1.0;
  float trk = 1.0;
  float dspAmp = 0.1 + prm1 * 0.2;
  for (int i = 0; i < 5; i++) {
    p += sin(p.zxy * 0.75 * trk + iTime * trk * 0.8) * dspAmp;
    d -= abs(dot(cos(p), sin(p.yzx)) * z);
    z *= 0.57;
    trk *= 1.4;
    p = p * m3;
  }
  d = abs(d + prm1 * 3.0) + prm1 * 0.3 - 2.5 + bsMoY;
  return vec2(d + cl * 0.2 + 0.25, cl);
}

vec4 renderClouds(
  in vec3 ro,
  in vec3 rd,
  float time,
  float prm1,
  float bsMoY,
  float phase
) {
  vec4 rez = vec4(0.0);
  float t = 1.5;
  float fogT = 0.0;
  for (int i = 0; i < 100; i++) {
    if (rez.a > 0.99) break;

    vec3 pos = ro + t * rd;
    vec2 mpv = map(pos, prm1, bsMoY);
    float den = clamp(mpv.x - 0.3, 0.0, 1.0) * 1.12;
    float dn = clamp(mpv.x + 2.0, 0.0, 3.0);

    vec4 col = vec4(0.0);
    if (mpv.x > 0.6) {
      col = vec4(
        sin(
          vec3(5.0, 0.4, 0.2) +
            mpv.y * 0.1 +
            sin(pos.z * 0.4) * 0.5 +
            1.8 +
            phase
        ) *
          0.5 +
          0.5,
        0.08
      );
      col *= den * den * den;
      col.rgb *= linstep(4.0, -2.5, mpv.x) * 2.3;
      float dif = clamp((den - map(pos + 0.8, prm1, bsMoY).x) / 9.0, 0.001, 1.0);
      dif += clamp((den - map(pos + 0.35, prm1, bsMoY).x) / 2.5, 0.001, 1.0);
      col.xyz *= den * (vec3(0.005, 0.045, 0.075) + 1.5 * vec3(0.033, 0.07, 0.03) * dif);
    }

    float fogC = exp(t * 0.2 - 2.2);
    col.rgba += vec4(0.06, 0.11, 0.11, 0.1) * clamp(fogC - fogT, 0.0, 1.0);
    fogT = fogC;
    rez = rez + col * (1.0 - rez.a);
    t += clamp(0.5 - dn * dn * 0.05, 0.09, 0.3);
  }
  return clamp(rez, 0.0, 1.0);
}

float getsat(vec3 c) {
  float mi = min(min(c.x, c.y), c.z);
  float ma = max(max(c.x, c.y), c.z);
  return (ma - mi) / (ma + 1e-7);
}

vec3 iLerp(in vec3 a, in vec3 b, in float x) {
  vec3 ic = mix(a, b, x) + vec3(1e-6, 0.0, 0.0);
  float sd = abs(getsat(ic) - mix(getsat(a), getsat(b), x));
  vec3 dir = normalize(vec3(
    2.0 * ic.x - ic.y - ic.z,
    2.0 * ic.y - ic.x - ic.z,
    2.0 * ic.z - ic.y - ic.x
  ));
  float lgt = dot(vec3(1.0), ic);
  float ff = dot(dir, normalize(ic));
  ic += 1.5 * dir * sd * ff * lgt;
  return clamp(ic, 0.0, 1.0);
}

vec3 satMix(vec3 c) {
  float l = dot(c, LUMA);
  return mix(vec3(l), c, uSaturation);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 q = fragCoord.xy / iResolution.xy;
  vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  // Original: time = iTime * 3. — flight clock from accumulated cam Z
  float time = uCamZ;

  float bsMoX = 0.0;
  float bsMoY = 0.0;
  if (uCamMode > 0.5) {
    bsMoX = uYaw;
    bsMoY = uPitch * 0.85;
  }

  float prm1 = smoothstep(-0.4, 0.4, sin(iTime * 0.3));
  prm1 = clamp(prm1 + uMorph * 0.45, 0.0, 1.0);

  vec3 ro = vec3(0.0, 0.0, time);
  ro += vec3(sin(iTime) * 0.5, sin(iTime * 1.0) * 0.0, 0.0);

  float dspAmp = 0.85;
  ro.xy += disp(ro.z) * dspAmp;
  float tgtDst = 3.5;

  vec3 target = normalize(ro - vec3(disp(time + tgtDst) * dspAmp, time + tgtDst));
  ro.x -= bsMoX * 2.0;
  vec3 rightdir = normalize(cross(target, vec3(0.0, 1.0, 0.0)));
  vec3 updir = normalize(cross(rightdir, target));
  rightdir = normalize(cross(updir, target));
  vec3 rd = normalize((p.x * rightdir + p.y * updir) * 1.0 - target);
  rd.xy *= rot(-disp(time + 3.5).x * 0.2 + bsMoX);
  if (uCamMode > 0.5) {
    rd.y += uPitch * 0.35;
    rd = normalize(rd);
  }

  float mode = floor(uColorMode + 0.5);
  float phase = mode > 0.5 && mode < 1.5 ? uPhase : 0.0;

  vec4 scn = renderClouds(ro, rd, time, prm1, bsMoY, phase);

  vec3 col = scn.rgb;
  col = iLerp(col.bgr, col.rgb, clamp(1.0 - prm1, 0.05, 1.0));
  col = pow(col, vec3(0.55, 0.65, 0.6)) * vec3(1.0, 0.97, 0.9);

  // solid / twinkle — density-style tint (coral/fairysmoke): no floor, soft gate
  if (mode > 1.5) {
    float lum = max(dot(col, LUMA), 0.0);
    // Beat punch into cloud energy only — not a global wash after remapping
    lum *= 1.0 + uPeakFlicker * 0.28;
    // Soft gate: leave void/fog unpainted (old 0.35 floor stained everything)
    float mask = smoothstep(0.012, 0.11, lum);
    vec3 tinted = uTint * lum;
    // Soft knee so bright cores / bass pulses don't blow the frame
    tinted = tinted / (1.0 + max(tinted - vec3(0.85), 0.0) * 1.4);
    col = mix(vec3(0.0), tinted, mask);
  } else {
    col *= 1.0 + uPeakFlicker * 0.35;
  }

  col = satMix(col);

  col *= pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.12) * 0.7 + 0.3;

  gl_FragColor = vec4(col, 1.0);
}
`;
