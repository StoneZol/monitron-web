/**
 * Port of Shadertoy https://www.shadertoy.com/view/N3tSDf
 * “Quaternion fractal” — asyncker
 *
 * Changes from original:
 * - iTime → uCameraT (CPU: cameraSpeed × audio mul)
 * - uColorMode: 0 original (idle/peak tint), 1 twinkle (solid HSL)
 * - uColor / uHighlight + uPeakFlicker for light reaction
 * - uSaturation look chroma
 * - Unused quat helpers from source omitted (only qsinh/qcosh used)
 */

export const quaternionfractalVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const quaternionfractalFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float uCameraT;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;
/** 0 original, 1 twinkle */
uniform float uColorMode;

vec4 qsinh(vec4 z) {
  float vlen = length(z.yzw);
  if (vlen < 1e-6) vlen = 1e-6;
  return vec4(
    sinh(z.x) * cos(vlen),
    cosh(z.x) * sin(vlen) / vlen * z.yzw
  );
}

vec4 qcosh(vec4 z) {
  float vlen = length(z.yzw);
  if (vlen < 1e-6) vlen = 1e-6;
  return vec4(
    cosh(z.x) * cos(vlen),
    sinh(z.x) * sin(vlen) / vlen * z.yzw
  );
}

vec3 hue(float h) {
  float angle = h * 0.0174532925199;
  float w = sin(angle);
  float u = cos(angle);
  vec3 ret;
  ret.x = 0.587 - 0.587 * u + 0.330 * w;
  ret.z = 0.587 - 0.587 * u - 1.050 * w;
  ret.y = 0.587 + 0.413 * u + 0.035 * w;
  return ret;
}

vec2 mandel_quaternion(
  float zx,
  float zy,
  float zz,
  float zw,
  float cx,
  float cy,
  float cz,
  float cw
) {
  int n = 0;
  float dr = 1.0, znorm = 0.0, range = 40.0;
  vec4 z = vec4(zx, zy, zz, zw);
  vec4 c = vec4(cx, cy, cz, cw);
  vec4 derv = z;
  for (int i = 0; i < 8; i++) {
    znorm = length(z);
    n = i;
    if (znorm > range) break;
    derv = qcosh(z);
    dr = length(derv) * dr + 1.0;
    z = qsinh(z) + c;
  }
  znorm = length(z);
  return vec2(0.5 * log(znorm) * znorm / dr, float(n));
}

vec3 applySat(vec3 c, float sat) {
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(g), c, sat);
}

void main() {
  float iTime = uCameraT;
  float zoommandel = 1.5 + 1.05 * sin(iTime * 0.2);
  float cosrotx = cos(iTime * 0.2);
  float sinrotx = sin(iTime * 0.2);
  float cosrotz = cos(iTime * 0.2);
  float sinrotz = sin(iTime * 0.2);

  vec2 fragCoord = vUv * iResolution.xy;
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  vec3 ro = vec3(0.0, 0.0, -zoommandel);
  vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));

  float rozy = cosrotx * ro.z - sinrotx * ro.y;
  vec4 c = vec4(
    cosrotz * ro.x + sinrotz * rozy,
    cosrotx * ro.y + sinrotx * ro.z,
    cosrotz * rozy - sinrotz * ro.x,
    0.0
  );
  vec4 z = c;

  float val = 0.0, dO = 0.0, maxDist = 200.0;
  const int raymarch_iterations = 100;
  int ot = raymarch_iterations - 1;
  float surDist =
    mandel_quaternion(z.x, z.y, z.z, z.w, c.x, c.y, c.z, c.w).x * 0.001;

  for (int i = 0; i < raymarch_iterations; i++) {
    vec2 dist = vec2(0.0);
    vec3 p = ro + rd * dO;
    float zz = cosrotx * p.z - sinrotx * p.y;
    z = vec4(
      cosrotz * p.x + sinrotz * zz,
      cosrotx * p.y + sinrotx * p.z,
      cosrotz * zz - sinrotz * p.x,
      z.w
    );
    c = z;
    dist = mandel_quaternion(z.x, z.y, z.z, z.w, c.x, c.y, c.z, c.w);
    dO += dist.x;
    if (dist.x < surDist) {
      ot = i;
      val = dist.y;
      break;
    }
    if (dO > maxDist) {
      ot = 0;
      break;
    }
  }

  float flicker = clamp(uPeakFlicker, 0.0, 1.0);
  float mode = floor(uColorMode + 0.5);
  vec3 col = vec3(0.0);

  if (ot != 0) {
    float bright = 1.0 - 1.5 * float(ot) / float(raymarch_iterations);
    bright *= 1.0 + flicker * 0.55;
    vec3 tint = mix(uColor, uHighlight, flicker);

    if (mode < 0.5) {
      // Original: stock hue × idle/peak pickers
      vec3 stock = hue(1.0 + clamp(val, 3.0, 20.0) * 80.0);
      col = mix(stock, tint, 0.72) * bright;
    } else {
      // Twinkle: solid HSL tint
      col = tint * bright;
    }
  }

  col = applySat(col, uSaturation);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;
