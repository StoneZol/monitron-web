/**
 * Port of Shadertoy https://www.shadertoy.com/view/3c2fz1
 * “Root Sanctum” — diatribes
 *
 * - iTime → uFlyT (flight) + uLookT (flex look)
 * - uCamMode: 0 flex, 1 manual ±180
 * - Wall / light idle→peak tints (+ separate twinkle on CPU)
 * - iChannel0 = Organic 3 from /stassets
 */

export const rootsanctumVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const rootsanctumFragmentShader = /* glsl */ `
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
uniform sampler2D iChannel0;
uniform vec3 uWall;
uniform vec3 uWallPeak;
uniform float uWallMix;
uniform vec3 uLight;
uniform vec3 uLightPeak;
uniform float uLightMix;
uniform float uSaturation;

#define T (uFlyT * 0.5)
#define P(z) (vec3((cos((z) * 0.2) * 0.3) * 10.0, (cos((z) * 0.15) * 0.3) * 10.0, (z)))
#define R(a) mat2(cos(a), -sin(a), sin(a), cos(a))

vec3 tex3D(sampler2D tex, in vec3 p, in vec3 n) {
  n = max((abs(n) - 0.2) * 7.0, 0.001);
  n /= (n.x + n.y + n.z);
  return (
    texture2D(tex, p.yz).xyz * n.x +
    texture2D(tex, p.zx).xyz * n.y +
    texture2D(tex, p.xy).xyz * n.z
  );
}

float smin(float a, float b, float k) {
  float f = max(0.0, 1.0 - abs(b - a) / k);
  return min(a, b) - k * 0.25 * f * f;
}

float fractal(vec3 p) {
  float s = 0.0;
  float w = 0.7;
  float l = 1.0;
  p.y *= 0.4;
  p += cos(p.yzx * 12.0) * 0.07;
  p.x -= 1.6;
  for (int i = 0; i < 7; i++) {
    p = abs(sin(p)) - 1.0;
    l = 1.5 / dot(p, p);
    p *= l;
    w *= l;
  }
  return length(p) / w - 0.0005;
}

float lightDist(vec3 p) {
  p.xy -= P(p.z).xy;
  float t = uFlyT * 0.5;
  return length(
    p -
      vec3(
        tanh(cos(t * 1.8) * 2.0) * 0.25,
        tanh(cos(t * 1.0) * 3.0) * 0.3,
        4.0 + T + tanh(cos(t * 0.4) * 4.0) * 1.0
      )
  ) - 0.25;
}

float root(vec3 p) {
  p.xy *= R(sin(p.z * 2.0) * 0.1 + sin(p.z * 1.0) * 0.3);
  p = mod(p, 1.0) - 0.5;
  return 0.6 * length(p.xy) - 0.01;
}

/** x = sdf, y = 1 if root wins */
vec2 map(vec3 p) {
  float r = root(p);
  vec3 q = p;
  q.xy -= P(q.z).xy;
  float s = smin(fractal(q), 2.0 - abs(q.y), 0.8);
  float hitRoot = r < s ? 1.0 : 0.0;
  s = min(s, r);
  return vec2(s, hitRoot);
}

float AO(in vec3 pos, in vec3 nor) {
  float sca = 1.9;
  float occ = 0.0;
  for (int i = 0; i < 5; i++) {
    float hr = 0.01 + float(i) * 0.5 / 4.0;
    float dd = map(nor * hr + pos).x;
    occ += (hr - dd) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - occ, 0.0, 1.0);
}

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

vec3 applySat(vec3 c, float sat) {
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(g), c, sat);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec3 r = iResolution;
  vec2 u = (fragCoord - r.xy * 0.5) / r.y;

  float camMode = floor(uCamMode + 0.5);
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
    float rad = max(length(look), 1e-5);
    float diskR = rad / sqrt(1.0 + rad * rad);
    look *= diskR / rad;
    float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(lt * 0.037));
    float cone = 0.62 * bank * breath;
    yaw = look.x * cone;
    pitch = look.y * cone;
  }
  pitch = clamp(pitch, -1.45, 1.45);

  vec3 e = vec3(0.001, 0.0, 0.0);
  vec3 ro = P(T);
  vec3 Z = normalize(P(T + 1.0) - ro);
  vec3 X = normalize(vec3(Z.z, 0.0, -Z.x));
  vec3 Yup = cross(X, Z);
  // Stock uses row-vector × mat3(-X, cross(X,Z), Z)
  mat3 basis = mat3(-X, Yup, Z);

  vec3 localDir;
  if (camMode < 0.5) {
    // flex: stock UV roll + coral wander as look offset
    vec2 uu = u + vec2(yaw, pitch);
    uu = R(sin(T * 0.2) * 0.4) * uu;
    localDir = normalize(vec3(uu, 1.0));
  } else {
    // manual: freelook with per-pixel FOV (dir alone was screen-constant → “stuck”)
    vec3 fwd = dirFrom(yaw, pitch);
    vec3 rt = vec3(cos(yaw), 0.0, -sin(yaw));
    vec3 up = cross(rt, fwd);
    localDir = normalize(rt * u.x + up * u.y + fwd);
  }
  vec3 D = normalize(localDir * basis);

  float s = 0.1;
  float d = 0.0;
  float hitRoot = 0.0;
  vec3 p = ro;
  vec4 o = vec4(0.0);

  vec3 wallTint = mix(uWall, uWallPeak, clamp(uWallMix, 0.0, 1.0));
  // Idle #99e619 ≈ stock (6,9,1); scale keeps march glow energy
  vec3 wallGlow = wallTint * 10.0;

  for (int i = 0; i < 128; i++) {
    p = ro + D * d * 0.65;
    vec2 m = map(p);
    s = m.x;
    hitRoot = m.y;
    d += s;
    o += 40.0 * vec4(wallGlow, 0.0) + vec4(vec3(1.0 / max(s, 0.001)), 0.0);
  }

  vec3 nor = normalize(
    map(p).x -
      vec3(map(p - e.xyy).x, map(p - e.yxy).x, map(p - e.yyx).x)
  );

  o.rgb *= tex3D(iChannel0, p * 0.5, nor);
  o *= o;
  o *= hitRoot > 0.5 ? 0.2 * vec4(4.0, 3.0, 2.0, 0.0) : vec4(1.0);
  o *= AO(p, nor);

  vec3 lightTint = mix(uLight, uLightPeak, clamp(uLightMix, 0.0, 1.0));
  float ld = abs(lightDist(p));
  float fall = pow(max(ld, 1e-4), 3.0);
  vec3 lit = sqrt(max(d * o.rgb * lightTint / fall / 5e9, 0.0));
  lit = tanh(lit);

  lit = applySat(lit, uSaturation);
  lit = clamp(lit, 0.0, 1.0);
  gl_FragColor = vec4(lit, 1.0);
}
`;
