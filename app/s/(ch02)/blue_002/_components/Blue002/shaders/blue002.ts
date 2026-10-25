/**
 * Port of Shadertoy https://www.shadertoy.com/view/WldSRn
 * “002-Blue” — haquxx
 *
 * Changes from original:
 * - iTime → uFlyT (flight) + uLookT (flex look clock)
 * - uCamMode: 0 flex (coral wander), 1 manual yaw/pitch
 * - uColorMode: 0 original (idle→peak blue), 1 twinkle
 * - uColor / uHighlight + uPeakFlicker
 * - uSaturation
 */

export const blue002VertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const blue002FragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float uFlyT;
uniform float uLookT;
uniform float uYaw;
uniform float uPitch;
uniform float uCamBank;
/** 0 flex, 1 manual */
uniform float uCamMode;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uSaturation;
uniform float uPeakFlicker;
/** 0 original, 1 twinkle */
uniform float uColorMode;

float sdSphere(vec3 pos, float size) {
  return length(pos) - size;
}

float sdBox(vec3 pos, vec3 size) {
  pos = abs(pos) - size;
  return max(max(pos.x, pos.y), pos.z);
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  float m = p.x + p.y + p.z - s;
  vec3 q;
  if (3.0 * p.x < m) q = p.xyz;
  else if (3.0 * p.y < m) q = p.yzx;
  else if (3.0 * p.z < m) q = p.zxy;
  else return m * 0.57735027;

  float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3(q.x, q.y - s + k, q.z - k));
}

mat2 rotate(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, s, -s, c);
}

vec3 repeat(vec3 pos, vec3 span) {
  return abs(mod(pos, span)) - span * 0.5;
}

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

float getDistance(vec3 pos, vec2 uv, float t) {
  vec3 originalPos = pos;

  for (int i = 0; i < 3; i++) {
    pos = abs(pos) - 4.5;
    pos.xz *= rotate(1.0);
    pos.yz *= rotate(1.0);
  }

  pos = repeat(pos, vec3(4.0));

  float d0 = abs(originalPos.x) - 0.1;
  float d1 = sdBox(pos, vec3(0.8));

  pos.xy *= rotate(mix(1.0, 2.0, abs(sin(t))));
  float size = mix(1.1, 1.3, abs(uv.y) * abs(uv.x));
  float d2 = sdSphere(pos, size);
  float dd2 = sdOctahedron(pos, 1.8);
  float ddd2 = mix(d2, dd2, abs(sin(t)));

  return max(max(d1, -ddd2), -d0);
}

vec3 applySat(vec3 c, float sat) {
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(g), c, sat);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 p =
    (fragCoord.xy * 2.0 - iResolution.xy) /
    min(iResolution.x, iResolution.y);

  float camMode = floor(uCamMode + 0.5);
  float t = uFlyT;
  float flicker = clamp(uPeakFlicker, 0.0, 1.0);

  // Flex / manual — coral-style look, flight along +Z
  float yaw = uYaw;
  float pitch = uPitch;
  if (camMode < 0.5) {
    float bank = max(uCamBank, 0.0);
    float lt = uLookT;
    float ax =
      sin(lt * 0.097) * 0.50 +
      sin(lt * 0.173 + 2.15) * 0.32 +
      sin(lt * 0.281 + 5.10) * 0.22 +
      sin(lt * 0.041 + 1.30) * 0.18;
    float ay =
      cos(lt * 0.113) * 0.50 +
      sin(lt * 0.197 + 0.90) * 0.32 +
      cos(lt * 0.251 + 3.70) * 0.22 +
      cos(lt * 0.053 + 4.40) * 0.18;
    vec2 look = vec2(ax, ay);
    float r = max(length(look), 1e-5);
    float diskR = r / sqrt(1.0 + r * r);
    look *= diskR / r;
    float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(lt * 0.037));
    float cone = 0.62 * bank * breath;
    yaw = look.x * cone;
    pitch = look.y * cone;
  }
  pitch = clamp(pitch, -1.45, 1.45);

  vec3 cameraOrigin = vec3(0.0, 0.0, -10.0 + t * 4.0);
  vec3 fwd = dirFrom(yaw, pitch);
  vec3 rt = vec3(cos(yaw), 0.0, -sin(yaw));
  vec3 up = cross(rt, fwd);
  vec3 rayDirection = normalize(rt * p.x + up * p.y + fwd);

  float depth = 0.0;
  float ac = 0.0;
  vec3 rayPos = vec3(0.0);
  float d = 0.0;

  for (int i = 0; i < 80; i++) {
    rayPos = cameraOrigin + rayDirection * depth;
    d = getDistance(rayPos, p, t);

    if (abs(d) < 0.0001) break;

    ac += exp(-d * mix(5.0, 10.0, abs(sin(t))));
    depth += d;
  }

  float mode = floor(uColorMode + 0.5);
  vec3 tint = mix(uColor, uHighlight, flicker);
  float glow = ac * 1.2 * (iResolution.x / iResolution.y - abs(p.x));
  glow *= 0.06 * (1.0 + flicker * 0.55);

  vec3 col;
  if (mode < 0.5) {
    // Original: stock blue × idle/peak (peak → white-blue)
    col = tint * glow;
  } else {
    col = tint * glow;
  }

  col = applySat(col, uSaturation);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;
