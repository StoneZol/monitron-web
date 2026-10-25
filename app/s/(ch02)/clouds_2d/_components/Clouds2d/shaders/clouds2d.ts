/**
 * Port of Shadertoy https://www.shadertoy.com/view/4tdSWr
 * “2D Clouds” — drift
 *
 * Extras (uniforms):
 * - uFlightSpeed — multiplies stock speed (0.03)
 * - uCover — cloudcover (stock 0.2)
 * - uHour — 0–24 civil hour (12 = noon / stock sky)
 *   Sky: sunrise 5–7 (2h), clean day 7–16, sunset 16–18 (2h), else night
 *   Night clouds gray down; stars masked by cloud opacity
 */

export const clouds2dVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const clouds2dFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uFlightSpeed;
uniform float uCover;
uniform float uHour;

const float cloudscale = 1.1;
const float speedStock = 0.03;
const float clouddark = 0.5;
const float cloudlight = 0.3;
const float cloudalpha = 8.0;
const float skytint = 0.5;

const mat2 m = mat2(1.6, 1.2, -1.2, 1.6);

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(in vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(
    dot(a, hash(i + 0.0)),
    dot(b, hash(i + o)),
    dot(c, hash(i + 1.0))
  );
  return dot(n, vec3(70.0));
}

float fbm(vec2 n) {
  float total = 0.0;
  float amplitude = 0.1;
  for (int i = 0; i < 7; i++) {
    total += noise(n) * amplitude;
    n = m * n;
    amplitude *= 0.4;
  }
  return total;
}

/** Soft 2h arc: ends A→C with warm B peaking at the midpoint. */
vec3 warmArc(vec3 a, vec3 warm, vec3 c, float t, float warmAmt) {
  float u = smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0));
  vec3 base = mix(a, c, u);
  float peak = sin(u * 3.14159265);
  return mix(base, warm, peak * warmAmt);
}

/**
 * Civil-hour sky.
 * Sunrise 05–07 (2h), clean day 07–16, sunset 16–18 (2h), else night.
 */
vec3 skyPalette(float hour, float y) {
  vec3 dayC = mix(vec3(0.4, 0.7, 1.0), vec3(0.2, 0.4, 0.6), y);
  vec3 dawnC = mix(vec3(1.0, 0.55, 0.35), vec3(0.35, 0.4, 0.65), y);
  // Dusk horizon muted — was too hot orange near the bottom
  vec3 duskC = mix(vec3(0.62, 0.36, 0.32), vec3(0.22, 0.18, 0.38), y);
  vec3 nightC = mix(vec3(0.05, 0.07, 0.14), vec3(0.02, 0.03, 0.08), y);

  float h = mod(hour, 24.0);

  if (h < 5.0) {
    return nightC;
  }
  if (h < 7.0) {
    return warmArc(nightC, dawnC, dayC, (h - 5.0) / 2.0, 0.85);
  }
  if (h < 16.0) {
    return dayC;
  }
  if (h < 18.0) {
    return warmArc(dayC, duskC, nightC, (h - 16.0) / 2.0, 0.55);
  }
  return nightC;
}

/** Stars: 1 deep night, 0 across the clean day window. */
float nightAmount(float hour) {
  float h = mod(hour, 24.0);
  float afterDusk = smoothstep(16.5, 18.0, h);
  float beforeDawn = 1.0 - smoothstep(5.0, 7.0, h);
  return max(afterDusk, beforeDawn);
}

/** 1 = daylight cloud fluff, 0 = night gray. Flat through 07–16. */
float dayCloudAmount(float hour) {
  float h = mod(hour, 24.0);
  float rise = smoothstep(5.0, 7.0, h);
  float set = 1.0 - smoothstep(16.0, 18.0, h);
  return clamp(min(rise, set), 0.0, 1.0);
}

float starField(vec2 uv, float t) {
  float s = 0.0;
  // two sparse layers
  for (int layer = 0; layer < 2; layer++) {
    float sc = mix(48.0, 92.0, float(layer));
    vec2 p = uv * sc;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float n = hash21(id + float(layer) * 17.0);
    float tw = 0.65 + 0.35 * sin(t * mix(1.7, 3.1, n) + n * 6.28);
    float d = length(f);
    float spark = smoothstep(0.09, 0.0, d) * step(0.992 - float(layer) * 0.004, n);
    s += spark * tw * mix(1.0, 0.55, float(layer));
  }
  return s;
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 p = fragCoord.xy / iResolution.xy;
  vec2 uv = p * vec2(iResolution.x / iResolution.y, 1.0);

  float spd = speedStock * max(uFlightSpeed, 0.0);
  float time = iTime * spd;
  float q = fbm(uv * cloudscale * 0.5);

  // ridged noise shape
  float r = 0.0;
  uv *= cloudscale;
  uv -= q - time;
  float weight = 0.8;
  for (int i = 0; i < 8; i++) {
    r += abs(weight * noise(uv));
    uv = m * uv + time;
    weight *= 0.7;
  }

  // noise shape
  float f = 0.0;
  uv = p * vec2(iResolution.x / iResolution.y, 1.0);
  uv *= cloudscale;
  uv -= q - time;
  weight = 0.7;
  for (int i = 0; i < 8; i++) {
    f += weight * noise(uv);
    uv = m * uv + time;
    weight *= 0.6;
  }

  f *= r + f;

  // noise colour
  float c = 0.0;
  time = iTime * spd * 2.0;
  uv = p * vec2(iResolution.x / iResolution.y, 1.0);
  uv *= cloudscale * 2.0;
  uv -= q - time;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c += weight * noise(uv);
    uv = m * uv + time;
    weight *= 0.6;
  }

  // noise ridge colour
  float c1 = 0.0;
  time = iTime * spd * 3.0;
  uv = p * vec2(iResolution.x / iResolution.y, 1.0);
  uv *= cloudscale * 3.0;
  uv -= q - time;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c1 += abs(weight * noise(uv));
    uv = m * uv + time;
    weight *= 0.6;
  }

  c += c1;

  float hour = uHour;
  vec3 skycolour = skyPalette(hour, p.y);

  float dayAmt = dayCloudAmount(hour);
  vec3 cloudDay = vec3(1.1, 1.1, 0.9);
  vec3 cloudNight = vec3(0.38, 0.40, 0.44);
  vec3 cloudBase = mix(cloudNight, cloudDay, dayAmt);
  vec3 cloudcolour = cloudBase * clamp(clouddark + cloudlight * c, 0.0, 1.0);

  float cover = clamp(uCover, 0.0, 1.0);
  f = cover + cloudalpha * f * r;
  float cloudMask = clamp(f + c, 0.0, 1.0);

  // Stars only in clear gaps — no shine through thick cloud
  float night = nightAmount(hour);
  if (night > 0.01) {
    vec2 starUv = p * vec2(iResolution.x / iResolution.y, 1.0);
    float stars = starField(starUv, iTime);
    float clearSky = 1.0 - smoothstep(0.04, 0.35, cloudMask);
    skycolour += vec3(0.95, 0.97, 1.0) * stars * night * clearSky;
  }

  vec3 result = mix(
    skycolour,
    clamp(skytint * skycolour + cloudcolour, 0.0, 1.0),
    cloudMask
  );

  gl_FragColor = vec4(result, 1.0);
}
`;
