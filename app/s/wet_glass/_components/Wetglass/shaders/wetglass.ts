/**
 * Rain on glass — ref: Shadertoy https://www.shadertoy.com/view/ltffzl
 * BigWings (Martijn Steinrucken), CC BY-NC-SA 3.0
 *
 * Monitron: no heart story; cover bg + slideshow. Drop Y is fall-only (no bounce).
 * GLSL3 textureLod for glass fog vs sharp drops.
 */

export const wetglassVertexShader = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const wetglassFragmentShader = /* glsl */ `
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
/** Background texture sizes (px) — for object-fit: cover */
uniform vec2 iChannelResolution0;
uniform vec2 iChannelResolution1;
/** 0 = fully channel0, 1 = fully channel1 (crossfade) */
uniform float uCrossfade;
/** Cover object-position: x 0…1 left→right, y 0…1 top→bottom */
uniform vec2 uBgAlign;
uniform float uRainAmount;
uniform float uDropSpeed;
/** 0 = clear glass, 1 = foggy / heavy blur */
uniform float uGlass;
/** Lightning flash amount 0…1 */
uniform float uLightning;

#define S(a, b, t) smoothstep(a, b, t)

/**
 * object-fit: cover + object-position (uBgAlign).
 * 0.5/0.5 = center; y=0 prefers top when cropping height, etc.
 */
vec2 coverUV(vec2 uv, vec2 texRes) {
  float sA = iResolution.x / max(iResolution.y, 1.0);
  float tA = texRes.x / max(texRes.y, 1.0);
  vec2 align = clamp(uBgAlign, vec2(0.0), vec2(1.0));
  if (sA > tA) {
    float vis = tA / sA;
    uv.y = uv.y * vis + align.y * (1.0 - vis);
  } else {
    float vis = sA / tA;
    uv.x = uv.x * vis + align.x * (1.0 - vis);
  }
  return uv;
}

vec3 N13(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float N(float t) {
  return fract(sin(t * 12345.564) * 7658.76);
}

float Saw(float b, float t) {
  return S(0.0, b, t) * S(1.0, b, t);
}

vec2 DropLayer2(vec2 uv, float t) {
  vec2 UV = uv;

  // Faster scroll — closer to original Heartfelt big-drop pace
  uv.y += t * 1.15;
  vec2 a = vec2(6.0, 1.0);
  vec2 grid = a * 2.0;
  vec2 id = floor(uv * grid);

  float colShift = N(id.x);
  uv.y += colShift;

  id = floor(uv * grid);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);

  float x = n.x - 0.5;

  float y = UV.y * 20.0;
  float wiggle = sin(y + sin(y));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;
  // Slightly faster life cycle than layer scroll
  float ti = fract(t * 1.35 + n.z);
  // Fall only: top → past bottom (no mid-cell wall), mild ease-out
  float fall = 1.0 - pow(max(0.0, 1.0 - ti), 1.35);
  y = mix(0.98, -0.18, fall);
  vec2 p = vec2(x, y);

  float d = length((st - p) * a.yx);

  float life = S(0.0, 0.04, ti) * S(1.0, 0.9, ti);
  float mainDrop = S(0.4, 0.0, d) * life;

  float r = sqrt(S(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = S(0.23 * r, 0.15 * r * r, cd);
  float trailFront = S(-0.02, 0.02, st.y - y);
  trail *= trailFront * r * r * life;

  y = UV.y;
  float trail2 = S(0.2 * r, 0.0, cd);
  float droplets = max(0.0, (sin(y * (1.0 - y) * 120.0) - st.y)) * trail2 * trailFront * n.z;
  y = fract(y * 10.0) + (st.y - 0.5);
  float dd = length(st - vec2(x, y));
  droplets = S(0.3, 0.0, dd);
  float m = mainDrop + droplets * r * trailFront * life;

  return vec2(m, trail);
}

float StaticDrops(vec2 uv, float t) {
  uv *= 40.0;

  vec2 id = floor(uv);
  uv = fract(uv) - 0.5;
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.7;
  float d = length(uv - p);

  float fade = Saw(0.025, fract(t + n.z));
  float c = S(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
  return c;
}

vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
  float s = StaticDrops(uv, t) * l0;
  vec2 m1 = DropLayer2(uv, t) * l1;
  vec2 m2 = DropLayer2(uv * 1.85, t) * l2;

  float c = s + m1.x + m2.x;
  c = S(0.3, 1.0, c);

  return vec2(c, max(m1.y * l0, m2.y * l1));
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  vec2 UV = fragCoord / iResolution.xy;

  float T = iTime;
  float t = T * 0.2 * max(0.05, uDropSpeed);

  float rainAmount = clamp(uRainAmount, 0.0, 1.0);
  float glass = clamp(uGlass, 0.0, 1.0);

  float maxBlur = mix(3.0, 6.0, rainAmount);
  float minBlur = 2.0;
  minBlur = mix(0.4, minBlur, glass);
  maxBlur = mix(1.2, maxBlur, glass);

  float zoom = 1.0;
  uv *= 0.7;
  UV = (UV - 0.5) * (0.9 + zoom * 0.1) + 0.5;

  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);

  vec2 c = Drops(uv, t, staticDrops, layer1, layer2);

  // Pixel-sized derivative — resolution-stable normals (full-res realism)
  vec2 e = vec2(1.0 / iResolution.y, 0.0);
  float cx = Drops(uv + e, t, staticDrops, layer1, layer2).x;
  float cy = Drops(uv + e.yx, t, staticDrops, layer1, layer2).x;
  vec2 n = vec2(cx - c.x, cy - c.x);

  float focus = mix(maxBlur - c.y, minBlur, S(0.1, 0.2, c.x));
  // Cover per texture; crossfade by opacity between slides
  vec2 uv0 = coverUV(UV, iChannelResolution0) + n;
  vec2 uv1 = coverUV(UV, iChannelResolution1) + n;
  vec3 col0 = textureLod(iChannel0, uv0, focus).rgb;
  vec3 col1 = textureLod(iChannel1, uv1, focus).rgb;
  float xf = clamp(uCrossfade, 0.0, 1.0);
  vec3 col = mix(col0, col1, xf);

  // Soft frost via blur only — no gray/sepia color wash on the photo
  float dry = 1.0 - S(0.05, 0.35, c.x);
  col = mix(col, col * 0.97, dry * glass * 0.2);

  float fadeT = (T + 3.0) * 0.5;
  float lightning = sin(fadeT * sin(fadeT * 10.0));
  lightning *= pow(max(0.0, sin(fadeT + sin(fadeT))), 10.0);
  col *= 1.0 + lightning * clamp(uLightning, 0.0, 1.0);

  vec2 vig = UV - 0.5;
  col *= 1.0 - dot(vig, vig);

  fragColor = vec4(col, 1.0);
}
`;
