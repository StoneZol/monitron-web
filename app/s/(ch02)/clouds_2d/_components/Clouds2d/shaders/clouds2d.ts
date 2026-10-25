/**
 * Port of Shadertoy https://www.shadertoy.com/view/4tdSWr
 * “2D Clouds” — drift
 *
 * Extras (uniforms):
 * - uFlightSpeed — multiplies stock speed (0.03)
 * - uCover — cloudcover (stock 0.2)
 * - uOvercast — sky/cloud gray wash + slight cover lift
 * - uHour — 0–24 civil hour (12 = noon / stock sky)
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
uniform float uOvercast;
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

/** hour 0–24 → sky. 0 night, 6 dawn, 12 noon (stock), 18 dusk, 24 night. */
vec3 skyPalette(float hour, float y) {
  vec3 dayBot = vec3(0.4, 0.7, 1.0);
  vec3 dayTop = vec3(0.2, 0.4, 0.6);

  vec3 dawnBot = vec3(1.0, 0.55, 0.35);
  vec3 dawnTop = vec3(0.35, 0.4, 0.65);

  vec3 duskBot = vec3(0.95, 0.4, 0.25);
  vec3 duskTop = vec3(0.25, 0.2, 0.45);

  vec3 nightBot = vec3(0.05, 0.07, 0.14);
  vec3 nightTop = vec3(0.02, 0.03, 0.08);

  float t = fract(hour / 24.0);
  vec3 bot;
  vec3 top;
  if (t < 0.25) {
    float k = smoothstep(0.0, 0.25, t);
    bot = mix(nightBot, dawnBot, k);
    top = mix(nightTop, dawnTop, k);
  } else if (t < 0.5) {
    float k = smoothstep(0.25, 0.5, t);
    bot = mix(dawnBot, dayBot, k);
    top = mix(dawnTop, dayTop, k);
  } else if (t < 0.75) {
    float k = smoothstep(0.5, 0.75, t);
    bot = mix(dayBot, duskBot, k);
    top = mix(dayTop, duskTop, k);
  } else {
    float k = smoothstep(0.75, 1.0, t);
    bot = mix(duskBot, nightBot, k);
    top = mix(duskTop, nightTop, k);
  }
  return mix(bot, top, y);
}

/** 1 in deep night, 0 by mid-morning / mid-afternoon. */
float nightAmount(float hour) {
  float h = mod(hour, 24.0);
  float late = smoothstep(18.0, 21.5, h);
  float early = 1.0 - smoothstep(4.5, 7.0, h);
  return max(late, early);
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

  float oc = clamp(uOvercast, 0.0, 1.0);
  float hour = uHour;
  vec3 skycolour = skyPalette(hour, p.y);
  vec3 graySky = vec3(mix(0.55, 0.28, p.y));
  skycolour = mix(skycolour, graySky, oc);

  // stars behind clouds — night only, washed out by overcast
  float night = nightAmount(hour) * (1.0 - oc * 0.92);
  if (night > 0.01) {
    vec2 starUv = p * vec2(iResolution.x / iResolution.y, 1.0);
    float stars = starField(starUv, iTime);
    skycolour += vec3(0.95, 0.97, 1.0) * stars * night;
  }

  vec3 cloudWarm = vec3(1.1, 1.1, 0.9);
  vec3 cloudGray = vec3(0.72);
  vec3 cloudBase = mix(cloudWarm, cloudGray, oc);
  vec3 cloudcolour = cloudBase * clamp(clouddark + cloudlight * c, 0.0, 1.0);

  float cover = clamp(uCover + oc * 0.35, 0.0, 1.2);
  f = cover + cloudalpha * f * r;

  vec3 result = mix(
    skycolour,
    clamp(skytint * skycolour + cloudcolour, 0.0, 1.0),
    clamp(f + c, 0.0, 1.0)
  );

  gl_FragColor = vec4(result, 1.0);
}
`;
