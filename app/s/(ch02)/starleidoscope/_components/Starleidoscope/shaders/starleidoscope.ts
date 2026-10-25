/**
 * Port of Shadertoy https://www.shadertoy.com/view/ftt3R7
 * “Starleidoscope” — DanielXMoore
 *
 * Changes from original:
 * - iChannel0 kept for stock audio hue (FFT.r / wave.g @ 0.25)
 * - Mouse look frozen at center (no iMouse)
 * - uPatternT: geometry clock (dt × patternSpeed × audio mul)
 * - uShimmerT: wall-clock seconds for star pulse (stock iTime, not patternSpeed)
 * - Geometry uses t = uPatternT * 0.05 (stock was 0.01; ×5 so folds/tunnel match feel)
 * - uColorMode: 0 original, 1 paletteTwinkle, 2 twinkle, 3 palette
 * - uPalettePhase: HSL hue rotate of stock RGB (2π = full cycle)
 * - uColor / uHighlight: CPU tint (twinkle / palette)
 * - uColorMix: idle→peak blend (palette)
 * - uSaturation: look chroma
 */

export const starleidoscopeVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const starleidoscopeFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float uPatternT;
uniform float uShimmerT;
/** Stock palette phase — used in paletteTwinkle */
uniform float uPalettePhase;
/** 0 original, 1 paletteTwinkle, 2 twinkle, 3 palette */
uniform float uColorMode;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uColorMix;
uniform float uSaturation;
/** Shadertoy-style audio strip: R = FFT, G = wave proxy */
uniform sampler2D iChannel0;

#define NUM_LAYERS 10.

mat2 Rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = 0.02 / d;

  float rays = max(0., 1. - abs(uv.x * uv.y * 1000.));
  m += rays * flare;
  uv *= Rot(3.1415 / 4.);
  rays = max(0., 1. - abs(uv.x * uv.y * 1000.));
  m += rays * 0.3 * flare;

  m *= smoothstep(1., 0.2, d);
  return m;
}

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 applySat(vec3 c, float sat) {
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(g), c, sat);
}

/** RGB → HSL (h,s,l in 0…1). */
vec3 rgb2hsl(vec3 c) {
  float maxc = max(c.r, max(c.g, c.b));
  float minc = min(c.r, min(c.g, c.b));
  float l = (maxc + minc) * 0.5;
  float d = maxc - minc;
  if (d < 1e-5) return vec3(0.0, 0.0, l);
  float s = l > 0.5 ? d / (2.0 - maxc - minc) : d / (maxc + minc);
  float h;
  if (maxc == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if (maxc == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
  return vec3(h / 6.0, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s < 1e-5) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0 / 3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0 / 3.0)
  );
}

/** Rotate stock RGB hue by radians (2π = full HSL lap). */
vec3 hueRotateRgb(vec3 c, float rad) {
  vec3 hsl = rgb2hsl(clamp(c, 0.0, 1.0));
  hsl.x = fract(hsl.x + rad / (2.0 * 3.14159265));
  return hsl2rgb(hsl);
}

/** Stock DanielXMoore star tint (+ FFT@0.25). */
vec3 stockStarColor(vec2 uv, float n, float size) {
  vec3 hueShift =
    fract(
      n * 2345.2 +
        dot(uv / 420., texture(iChannel0, vec2(0.25, 0.)).rg)
    ) *
    vec3(0.2, 0.3, 0.9) *
    123.2;
  vec3 color = sin(hueShift) * 0.5 + 0.5;
  return color * vec3(1., 0.25, 1. + size);
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offs = vec2(float(x), float(y));
      float n = Hash21(id + offs);
      float size = fract(n * 345.32);
      vec2 p = vec2(n, fract(n * 34.));
      float star = Star(
        gv - offs - p + 0.5,
        smoothstep(0.8, 1., size) * 0.6
      );

      vec3 color;
      float mode = floor(uColorMode + 0.5);
      if (mode < 0.5) {
        color = stockStarColor(uv, n, size);
      } else if (mode < 1.5) {
        // Stock look, HSL hue walks full cycle (greens/yellows included)
        color = hueRotateRgb(stockStarColor(uv, n, size), uPalettePhase);
      } else if (mode < 2.5) {
        color = uColor * (0.65 + 0.55 * size);
      } else {
        color = mix(uColor, uHighlight, clamp(uColorMix, 0., 1.)) *
          (0.65 + 0.55 * size);
      }

      // Same clock as Shadertoy iTime
      star *= sin(uShimmerT * 3. + n * 6.2831) * 0.4 + 1.;
      col += star * size * color;
    }
  }
  return col;
}

vec2 N(float angle) {
  return vec2(sin(angle), cos(angle));
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  // Stock Shadertoy used 0.01; ×5 so kaleidoscope/tunnel (not just center shimmer) moves
  float t = uPatternT * 0.05;

  uv.x = abs(uv.x);
  uv.y += tan((5. / 6.) * 3.1415) * 0.5;

  vec2 n = N((5. / 6.) * 3.1415);
  float d = dot(uv - vec2(0.5, 0.), n);
  uv -= n * max(0., d) * 2.;

  n = N((2. / 3.) * 3.1415);
  uv.x += 1.5 / 1.25;
  for (int i = 0; i < 5; i++) {
    uv *= 1.25;
    uv.x -= 1.5;
    uv.x = abs(uv.x);
    uv.x -= 0.5;
    uv -= n * min(0., dot(uv, n)) * 2.;
  }

  uv *= Rot(t);
  vec3 col = vec3(0.);

  for (float i = 0.; i < 1.; i += 1. / NUM_LAYERS) {
    float depth = fract(i + t);
    float scale = mix(20., 0.5, depth);
    float fade = depth * smoothstep(1., 0.9, depth);
    col += StarLayer(uv * scale + i * 453.2) * fade;
  }

  col = applySat(col, uSaturation);
  col = clamp(col, 0., 1.);
  gl_FragColor = vec4(col, 1.0);
}
`;
