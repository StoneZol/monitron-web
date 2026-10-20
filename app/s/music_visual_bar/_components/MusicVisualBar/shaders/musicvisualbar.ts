/**
 * Port of Shadertoy https://www.shadertoy.com/view/sXtSDS
 * “Music Visual Bar” — beetom
 *
 * iChannel0 = 1D FFT (Monitron bus bands packed into a strip texture).
 * uHueShift / uColorPunch = classic colorChannel drive.
 * uSpin = non-linear spectrum spin (CPU); uCenter = smooth drift position.
 */

export const musicVisualBarVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const musicVisualBarFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;
uniform float uBloomGain;
uniform float uStreakGain;
uniform float uHueShift;
uniform float uColorPunch;
uniform vec2 uCenter;
uniform float uSpin;

#define BLOOM_TAPS   10
#define BLOOM_PX     42.0
#define STREAK_TAPS  7
#define STREAK_PX    110.0
#define CA           0.0038
#define INNER_GAMMA  1.45
#define INNER_MIN    0.008
#define INNER_MAX    0.046
#define NEON_SAT     0.90
#define NEON_VAL     1.00
#define NEON_HUE_BASE 0.46
#define NEON_HUE_SPAN 0.40
#define SAT          1.35
#define SAT2         1.25
#define CONTRAST     0.30
#define SHADOW_TINT  0.030
#define LENS_R       0.508
#define LENS_DIFF    1.00
#define LENS_VEIL    1.00
#define LENS_GRAIN   1.00
#define LENS_RIM     1.00
#define EXPOSURE     1.15
#define RAYS         128.0

const float PI = 3.1415926535;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 3; k++) {
    v += a * vnoise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

float tickAt(float x, float w) {
  return smoothstep(w, 0.0, abs(fract(x + 0.5) - 0.5));
}

vec3 tonemap(vec3 x) {
  return vec3(1.0) - exp(-x);
}

vec3 saturate3(vec3 c, float s) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), c, s);
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

vec4 sector(vec2 uv, vec2 o, float rays) {
  vec2 p = uv + vec2(0.01, 0.0);
  float den = max(length(p) * length(o), 1e-6);
  float cosA = clamp((p.x * o.x + p.y * o.y) / den, -1.0, 1.0);
  float rad = mod(abs(acos(cosA)), 2.0 * PI);
  float crad = 2.0 * PI / rays;
  float fi = floor(rad / crad);
  return vec4(rad, fi * crad, floor((rad + crad * 0.5) / crad), crad);
}

vec3 palette(float fi, float rays, float chase) {
  float sed = sin(fi / rays * 2.0 * PI + iTime * 3.0) * 0.5 + 0.5;
  float h = fract(
    NEON_HUE_BASE + uHueShift
    + fi / rays * NEON_HUE_SPAN
    + iTime * 0.03
    + chase * sed * 0.12
    + uColorPunch * 0.08
  );
  float sat = clamp(NEON_SAT + uColorPunch * 0.12, 0.0, 1.0);
  float val = NEON_VAL + uColorPunch * 0.15;
  return hsv2rgb(vec3(h, sat, val));
}

vec3 starLayer(vec2 uv, float scale, float dens, float amp) {
  vec2 p = uv * scale;
  vec2 id = floor(p), f = fract(p) - 0.5;
  float h = hash21(id);
  if (h < dens) return vec3(0.0);

  vec2 o = (vec2(hash21(id + 11.3), hash21(id + 27.7)) - 0.5) * 0.75;
  float d = length(f - o);
  float mag = pow(hash21(id + 5.1), 6.0);
  float twk = 0.70 + 0.30 * sin(iTime * 2.6 + h * 61.0);
  float pt = smoothstep(0.055 * (0.45 + mag), 0.0, d);
  float halo = exp(-d * d * 90.0) * 0.35;
  float spk =
    (pow(max(0.0, 1.0 - abs(f.x - o.x) * 26.0), 3.0)
    + pow(max(0.0, 1.0 - abs(f.y - o.y) * 26.0), 3.0)) * mag;
  vec3 tint = mix(vec3(0.30, 0.62, 1.00), vec3(1.00, 0.58, 0.22), hash21(id + 9.7));
  return tint * (pt + halo + spk * 0.45) * (0.16 + mag * 2.6) * twk * (0.75 + amp * 0.5);
}

vec3 deepSpace(vec2 uv, vec2 o, float amp) {
  vec3 col = vec3(0.0);

  float ca = cos(-0.62), sa = sin(-0.62);
  vec2 g = mat2(ca, sa, -sa, ca) * uv;
  float gb = exp(-pow(g.y * 2.6, 2.0));
  float dust = fbm(g * 2.4 + vec2(iTime * 0.006, 0.0));
  col += vec3(0.045, 0.022, 0.105) * gb * (0.30 + dust);
  col += vec3(0.012, 0.052, 0.090) * gb * pow(dust, 2.0);

  float n1 = fbm(uv * 1.9 + vec2(iTime * 0.010, -iTime * 0.008));
  float n2 = fbm(uv * 3.7 - vec2(iTime * 0.014, iTime * 0.006));
  col += vec3(0.290, 0.015, 0.400) * pow(n1, 3.0) * 0.95;
  col += vec3(0.015, 0.230, 0.330) * pow(n2, 3.0) * 0.60;

  col += starLayer(uv - o * 0.03, 3.0, 0.900, amp);
  col += starLayer(uv - o * 0.09, 6.5, 0.930, amp);
  col += starLayer(uv - o * 0.16, 13.0, 0.955, amp);

  float fog = exp(-pow(length(uv - o) / 0.55, 2.0));
  col += vec3(0.090, 0.015, 0.210) * fog * (0.12 + amp * 1.15);

  return col;
}

vec4 band(
  vec2 uv, vec2 o, vec4 sec,
  float iner, float outer, float rays,
  float amp, float taps
) {
  float n = length(uv - o);
  float crad = sec.w;
  float u = sec.z / rays;

  float cd = max(texture(iChannel0, vec2(u, 0.0)).x, 0.0) / (3.0 - u) * 6.0 + 0.2;
  if (taps > 1.5) {
    cd += max(texture(iChannel0, vec2((sec.z + 1.0) / rays, 0.0)).x, 0.0) / (3.0 - u) * 6.0 + 0.2;
    cd += max(texture(iChannel0, vec2((sec.z - 1.0) / rays, 0.0)).x, 0.0) / (3.0 - u) * 6.0 + 0.2;
    cd /= 3.0;
  }

  float rout = iner + (outer - iner) * cd;
  float d2 = smoothstep(0.0, 0.1, abs(0.5 - (sec.x - sec.y) / crad) - 0.25);
  float d0 = smoothstep(0.0, 0.001 + pow(amp, 0.5) * 0.25, n - iner);
  float d = smoothstep(0.0, 0.001 + pow(amp, 3.0) * 0.5, min(d0, rout - n)) * d2;
  return vec4(d, sec.y / crad, rout, cd);
}

float innerLen(float cd) {
  return INNER_MIN + (INNER_MAX - INNER_MIN) * pow(clamp(cd / 2.6, 0.0, 1.0), INNER_GAMMA);
}

float innerCover(float n, vec4 sec, float cd) {
  float rin = 0.500 - innerLen(cd);
  return smoothstep(0.0, 0.005, min(0.500 - n, n - rin))
    * smoothstep(0.0, 0.1, abs(0.5 - (sec.x - sec.y) / sec.w) - 0.25);
}

vec3 innerSpec(vec2 uv, vec2 o, vec4 sec, vec4 b, float rays, float amp) {
  float n = length(uv - o);
  float d = innerCover(n, sec, b.w);
  return palette(b.y, rays, 1.0) * d * (0.55 + amp * 0.50);
}

vec3 frostLens(
  vec2 uv, vec2 o, float n,
  vec4 sec, vec4 b, float amp, float detail
) {
  float m = smoothstep(LENS_R, LENS_R - 0.012, n);

  float frost = 0.5;
  if (detail > 0.5)
    frost = 0.6 * vnoise(uv * 42.0 + vec2(iTime * 0.05, -iTime * 0.04))
      + 0.4 * vnoise(uv * 115.0 - vec2(iTime * 0.03, iTime * 0.05));

  float cov = innerCover(n, sec, b.w);
  vec3 tint = palette(b.y, RAYS, 1.0);

  float dd = (n - 0.480) / 0.075;
  float diff = exp(-dd * dd) * cov * 1.30;

  vec3 veil = vec3(0.42, 0.62, 1.00) * (0.022 + frost * 0.026) * m * LENS_VEIL;
  vec3 grain = vec3(0.62, 0.82, 1.00) * pow(frost, 3.0) * 0.060 * m * (0.40 + amp) * LENS_GRAIN;

  vec3 rimc = palette(b.y, RAYS, 1.0);
  float rim = smoothstep(0.016, 0.0, abs(n - LENS_R));
  float leak = smoothstep(0.050, 0.0, abs(n - LENS_R - 0.024));

  vec3 c = tint * diff * 0.95 * LENS_DIFF;
  c += veil + grain;
  c += rimc * rim * (0.50 + amp * 0.9) * LENS_RIM;
  c += rimc * leak * 0.32 * LENS_RIM;
  return c;
}

vec3 neonTube(
  vec2 uv, vec2 o, vec4 b, float iner,
  float rays, float amp, float hot
) {
  float n = length(uv - o);
  float k = clamp((n - iner) / max(b.z - iner, 0.0001), 0.0, 1.0);
  float e = k - 0.42;
  float tube = exp(-e * e / 0.0361);
  float core = exp(-e * e / 0.0072);
  float haze = exp(-e * e / 0.3844);

  vec3 neon = palette(b.y, rays, 1.0);

  return neon * haze * b.x * (0.30 + amp * 0.35)
    + neon * tube * b.x * 1.35
    + vec3(1.00, 0.86, 0.94) * core * b.x * hot;
}

vec3 hud(vec2 uv, vec2 o, vec4 sec, float rays, float amp, vec2 suv) {
  float n = length(uv - o);
  float x = sec.x / sec.w;
  float fi = sec.y / sec.w;
  vec3 col = vec3(0.0);

  col += vec3(0.10, 0.78, 0.95) * smoothstep(0.0018, 0.0, abs(n - 0.452)) * 0.45;
  col += vec3(0.10, 0.78, 0.95) * smoothstep(0.0018, 0.0, abs(n - 0.436)) * 0.16;

  float minor = tickAt(x, 0.10) * smoothstep(0.014, 0.0, abs(n - 0.430));
  float major = tickAt(x / 8.0, 0.05) * smoothstep(0.030, 0.0, abs(n - 0.428));
  float lit = texture(iChannel0, vec2(sec.z / rays, 0.0)).x;
  col += palette(fi, rays, 1.0) * minor * (0.18 + amp * 0.40);
  col += mix(vec3(0.55, 0.95, 1.00), vec3(1.00, 1.00, 1.00), lit) * major * (0.40 + lit * 3.0);

  float pulse = exp(-pow((n - (0.150 + amp * 0.09)) / 0.020, 2.0));
  col += vec3(1.00, 0.35, 0.70) * pulse * 0.40;

  float bar = exp(-pow((fract(suv.y - iTime * 0.06) - 0.5) / 0.035, 2.0));
  col += vec3(0.05, 0.38, 0.48) * bar * 0.26;

  vec2 e = min(suv, 1.0 - suv);
  float lw = 0.0022, bl = 0.030;
  col += vec3(0.10, 0.82, 0.95) * ((step(e.y, lw) + step(e.x, lw)) * 0.18
    + (step(e.x, bl) * step(e.y, lw * 2.4) + step(e.y, bl * 0.8) * step(e.x, lw * 2.4)) * 0.60);

  return col;
}

vec2 spinRef() {
  return vec2(cos(uSpin), sin(uSpin));
}

vec3 proxy(vec2 uv, vec2 o, float rays, float amp) {
  vec4 sec = sector(uv, spinRef(), rays);
  float iner = 0.52 + amp * 0.1;
  vec4 b = band(uv, o, sec, iner, 0.6 + amp * 0.4, rays, amp, 1.0);
  vec3 c = neonTube(uv, o, b, iner, rays, amp, 1.20);
  c += innerSpec(uv, o, sec, b, rays, amp) * 0.8;
  c += frostLens(uv, o, length(uv - o), sec, b, amp, 0.0) * 0.55;
  return c;
}

vec3 bloom(vec2 uv, vec2 o, float rays, float amp, float rad) {
  vec3 s = vec3(0.0);
  for (int k = 0; k < BLOOM_TAPS; k++) {
    float t = float(k);
    float a = t * 2.39996323;
    float rr = rad * sqrt((t + 0.5) / float(BLOOM_TAPS));
    s += proxy(uv + vec2(cos(a), sin(a)) * rr, o, rays, amp);
  }
  return s / float(BLOOM_TAPS);
}

vec3 streak(vec2 uv, vec2 o, float rays, float amp, float rad) {
  vec3 s = vec3(0.0);
  float wsum = 0.0;
  for (int k = 0; k < STREAK_TAPS; k++) {
    float f = (float(k) - float(STREAK_TAPS - 1) * 0.5) / float(STREAK_TAPS - 1);
    float w = exp(-f * f * 3.0);
    s += proxy(uv + vec2(f * rad, 0.0), o, rays, amp) * w;
    wsum += w;
  }
  return s / wsum;
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 uv = fragCoord / iResolution.xy;
  uv = (vec2(0.5) - uv) / vec2(0.5);
  uv.x *= (iResolution.x / iResolution.y);
  vec2 suv = fragCoord / iResolution.xy;

  float amp = max(texture(iChannel0, vec2(0.1, 0.0)).x, texture(iChannel0, vec2(0.2, 0.0)).x);
  amp = max(amp, texture(iChannel0, vec2(0.4, 0.0)).x);
  amp = max(amp, texture(iChannel0, vec2(0.05, 0.0)).x);
  amp = max(amp, texture(iChannel0, vec2(0.6, 0.0)).x);
  amp = max(amp, uColorPunch * 0.35);

  vec2 center = uCenter;
  vec2 oRef = spinRef();
  float iner = 0.52 + amp * 0.1;

  vec4 sec = sector(uv, oRef, RAYS);
  vec4 b = band(uv, center, sec, iner, 0.6 + amp * 0.4, RAYS, amp, 3.0);

  vec3 col = deepSpace(uv, center, amp);
  col += innerSpec(uv, center, sec, b, RAYS, amp);
  col += hud(uv, center, sec, RAYS, amp, suv);
  col += frostLens(uv, center, length(uv - center), sec, b, amp, 1.0);

  vec3 ring = neonTube(uv, center, b, iner, RAYS, amp, 1.70);
  if (CA > 0.0) {
    vec2 uR = center + (uv - center) * (1.0 + CA);
    vec2 uB = center + (uv - center) * (1.0 - CA);
    vec4 bR = band(uR, center, sector(uR, oRef, RAYS), iner, 0.6 + amp * 0.4, RAYS, amp, 1.0);
    vec4 bB = band(uB, center, sector(uB, oRef, RAYS), iner, 0.6 + amp * 0.4, RAYS, amp, 1.0);
    ring.r = neonTube(uR, center, bR, iner, RAYS, amp, 1.70).r;
    ring.b = neonTube(uB, center, bB, iner, RAYS, amp, 1.70).b;
  }
  col += ring;

  float px2uv = 2.0 / iResolution.y;
  if (uBloomGain > 0.001)
    col += bloom(uv, center, RAYS, amp, BLOOM_PX * px2uv) * uBloomGain;
  if (uStreakGain > 0.001)
    col += streak(uv, center, RAYS, amp, STREAK_PX * px2uv) * vec3(0.35, 0.72, 1.00) * uStreakGain;

  col *= EXPOSURE;
  col = max(saturate3(col, SAT), 0.0);
  col = tonemap(col);
  col = mix(col, col * col * (3.0 - 2.0 * col), CONTRAST);
  vec3 inv = clamp(1.0 - col, 0.0, 1.0);
  col += vec3(0.30, 0.75, 1.00) * SHADOW_TINT * inv * inv * inv * inv;
  col = clamp(saturate3(col, SAT2), 0.0, 1.0);

  col *= 0.90 + 0.10 * sin(suv.y * iResolution.y * 3.14159265);
  col += (hash21(fragCoord + fract(iTime) * 137.0) - 0.5) * 0.022;
  col *= smoothstep(2.0, 0.45, length(uv));
  gl_FragColor = vec4(col, 1.0);
}
`;
