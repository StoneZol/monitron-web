/**
 * Port of Shadertoy https://www.shadertoy.com/view/WcdczB
 * “Dark Transit” — diatribes (MIT, golfed with @FabriceNeyret2)
 *
 * Changes from original:
 * - iTime → uFlyT (CPU flightSpeed × audio)
 * - Camera path kept 1:1 (stock P/T look-at march)
 * - uCinemaBars: letterbox on/off
 * - Wall / orb tints (idle→peak or twinkle) via uniforms
 * - uSaturation
 */

export const darktransitVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const darktransitFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float uFlyT;
/** 1 = cinema letterbox bars */
uniform float uCinemaBars;
uniform vec3 uWall;
uniform vec3 uWallPeak;
uniform float uWallMix;
uniform vec3 uOrb;
uniform vec3 uOrbPeak;
uniform float uOrbMix;
uniform float uSaturation;

#define T (uFlyT * 4.0 + 5.0 + 5.0 * sin(uFlyT * 0.3))
#define P(z) vec3(12.0 * cos((z) * vec2(0.1, 0.12)), (z))
/* Do NOT wrap F in parens — stock A(T+8.,.22,2.) relies on * binding
   tighter than +, i.e. sin(T + 8.*p*2.) not sin((T+8.)*p*2.). */
#define A(F, H, K) abs(dot(sin(F * p * K), vec3(H))) / K

vec3 applySat(vec3 c, float sat) {
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(g), c, sat);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec3 r = iResolution;
  vec2 u = (fragCoord - r.xy * 0.5) / r.y;

  if (uCinemaBars > 0.5 && abs(u.y) > 0.375) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float t = uFlyT;
  float s = 0.0;
  float i = 0.0;
  float d = 0.0;
  float e = 0.0;
  float wallAcc = 0.0;
  float orbAcc = 0.0;

  vec3 p = P(T);
  vec3 Z = normalize(P(T + 4.0) - p);
  vec3 X = normalize(vec3(Z.z, 0.0, -Z.x));
  vec3 D = vec3(u, 1.0) * mat3(-X, cross(X, Z), Z);

  for (; i++ < 28.0 && d < 3e1; ) {
    p += D * s;
    X = P(p.z);
    float st = sin(t);
    e = length(
      p -
        vec3(
          X.x + st,
          X.y + st * 2.0,
          6.0 + T + st * 2.0
        )
    ) - 0.01;
    s =
      cos(p.z * 0.6) * 2.0 +
      4.0 -
      min(length(p.xy - X.x - 6.0), length((p - X).xy)) +
      A(4.0, 0.25, 0.1) +
      A(T + 8.0, 0.22, 2.0);
    s = min(e, 0.01 + 0.3 * abs(s));
    d += s;
    wallAcc += 1.0 / s;
    orbAcc += 10.0 / max(e, 0.6);
  }

  vec3 wallTint = mix(uWall, uWallPeak, clamp(uWallMix, 0.0, 1.0));
  vec3 orbTint = mix(uOrb, uOrbPeak, clamp(uOrbMix, 0.0, 1.0));
  // Stock orb weight was vec3(1,2,5) — keep relative chroma on orb tint
  vec3 orbWeighted = orbTint * vec3(0.2, 0.4, 1.0);

  vec3 c = wallAcc * wallTint + orbAcc * orbWeighted;
  c = c * c / 1e6;
  c = applySat(c, uSaturation);
  c = clamp(c, 0.0, 1.0);
  gl_FragColor = vec4(c, 1.0);
}
`;
