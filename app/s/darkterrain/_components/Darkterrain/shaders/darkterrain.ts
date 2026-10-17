/**
 * Port of Shadertoy https://www.shadertoy.com/view/WcccRl
 * “Dark Terrain” — diatribes
 *
 * Changes from original:
 * - iTime / iResolution / uCamZ (flight via accumulated cam Z)
 * - Coral-style camera bank flex look (from Observance no-cross fork)
 * - uLightning + uSunColor: optional sharp stripes (not in stock)
 * - Sun fixed in world (projected into view); matches stock u-.5 when looking ahead
 */

export const darkterrainVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const darkterrainFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uCamZ;
/** Clock for flex look (audio scales rate, not punches). */
uniform float uSwayT;
uniform float uCamBank;
uniform float uLightning;
uniform vec3 uSunColor;

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 u = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

  float t = iTime;
  float f = sin(t + sin(t * 10.0 + cos(t * 20.0)));

  float dens = 0.0;
  float sunAcc = 0.0;
  float d = 0.0;
  float s = 0.0;
  vec3 p = vec3(0.0);

  bool lightningOn = uLightning > 0.5;

  float bank = clamp(uCamBank, 0.0, 2.0);
  float ft = uSwayT;
  float ax =
    sin(ft * 0.097) * 0.50 +
    sin(ft * 0.173 + 2.15) * 0.32 +
    sin(ft * 0.281 + 5.10) * 0.22 +
    sin(ft * 0.041 + 1.30) * 0.18;
  float ay =
    cos(ft * 0.113) * 0.50 +
    sin(ft * 0.197 + 0.90) * 0.32 +
    cos(ft * 0.251 + 3.70) * 0.22 +
    cos(ft * 0.053 + 4.40) * 0.18;
  vec2 look = vec2(ax, ay);
  float r = max(length(look), 1e-5);
  float diskR = r / sqrt(1.0 + r * r);
  look *= diskR / r;
  float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(ft * 0.037));
  float cone = 0.62 * bank * breath;
  float yaw = look.x * cone;
  float pitch = clamp(look.y * cone, -1.45, 1.45);

  vec3 fwd = dirFrom(yaw, pitch);
  vec3 rt = vec3(cos(yaw), 0.0, -sin(yaw));
  vec3 up = cross(fwd, rt);
  vec3 D = u.x * rt + u.y * up + fwd;

  // World-fixed sun (≈ stock u-.5 on screen when yaw/pitch = 0).
  vec3 sunW = normalize(vec3(0.5, 0.5, 1.0));
  float sunZ = max(dot(sunW, fwd), 0.05);
  vec2 sunUV = vec2(dot(sunW, rt), dot(sunW, up)) / sunZ;
  float sunGlow = 0.01 / max(length(u - sunUV), 1e-3);

  for (float i = 0.0; i < 64.0; i++) {
    p = D * d;
    p.z += uCamZ;

    s = 2.2 - p.y + cos(p.x * 0.3) * 0.3;
    for (float n = 0.01; n < 0.4; n += n) {
      s -= abs(dot(sin(0.23 * p / n), vec3(n)));
    }
    s = 0.4 * min(2.9 - s, 0.01 + 0.2 * abs(s));
    d += s;
    dens += s;
    sunAcc += sunGlow;
  }

  // Soft sun wash on fog/hills + tinted stock blob (readable when lightning off).
  vec3 col = dens * mix(vec3(1.0), uSunColor, 0.28) + sunAcc * uSunColor;

  float denom = cos(t + p.y * 0.325);
  float ad = abs(denom);
  // Gentle chromatic fill (always) — bumps landscape response to sun tint.
  vec3 softSun = pow(
    abs(vec3(3.0, 2.0, 1.0) / max(ad, 0.55)),
    vec3(0.5)
  );
  col += softSun * uSunColor * 0.35;

  if (lightningOn) {
    vec3 bolt = pow(
      abs(vec3(3.0, 2.0, 1.0) / max(ad, 1e-3)),
      vec3(f)
    );
    col += bolt * uSunColor;
  }

  // Stock Dark Terrain tonemap.
  col = tanh(col * 0.1 / max(exp(d / 20.0), 1e-3));

  gl_FragColor = vec4(col, 1.0);
}
`;
