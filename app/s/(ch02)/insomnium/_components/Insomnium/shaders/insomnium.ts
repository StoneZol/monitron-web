/**
 * Port of Shadertoy https://www.shadertoy.com/view/3cSBR1
 * “Insomnium” — diatribes
 *
 * - iTime → uFlyT (flight) + uLookT (flex look)
 * - uCamMode: 0 flex, 1 manual ±180
 * - Wall / light idle→peak tints (+ separate twinkle on CPU)
 * - iChannel0 = Organic 4 from /stassets
 */

export const insomniumVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const insomniumFragmentShader = /* glsl */ `
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

#define T (uFlyT * 0.3)

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
  float w = 0.5;
  float l = 1.0;
  p.y -= 2.75;
  p *= vec3(0.6, 0.5, 0.4);
  p += cos(p.yzx * 2.0 + p.xzy * 3.0 + p.zxy * 4.0) * 0.15;
  for (int i = 0; i < 8; i++) {
    p = abs(sin(p)) - 1.0;
    l = 1.15 / max(dot(p, p), 1e-6);
    p *= l;
    w *= l;
  }
  return length(p) / max(w, 1e-6);
}

/** Stock look offset clock — uses flight time (iTime*.5 in original). */
vec3 lookOffset(float zoffs) {
  float t = uFlyT * 0.5;
  return vec3(
    tanh(cos(t * 0.4) * 0.5) * 6.0,
    tanh(cos(t * 0.6) * 2.0) * 5.0 - 5.0,
    zoffs + T * 5.0 + tanh(cos(t * 0.4) * 4.0) * 4.0
  );
}

float map(vec3 p) {
  float s = fractal(p);
  s = smin(s, 2.0 - p.y, length(p.xy));
  return s;
}

float AO(in vec3 pos, in vec3 nor) {
  float sca = 2.2;
  float occ = 0.0;
  for (int i = 0; i < 5; i++) {
    float hr = 0.01 + float(i) * 0.5 / 4.0;
    float dd = map(nor * hr + pos);
    occ += (hr - dd) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - occ, 0.0, 1.0);
}

vec3 dirFrom(float yaw, float pitch) {
  return vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
}

/** Root / Blue002 coral wander as vec2(yaw, pitch). */
vec2 coralLook(float bank, float lt) {
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
  float cone = 0.62 * max(bank, 0.0) * breath;
  return look * cone;
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
  vec3 ro = vec3(0.0, 0.0, T * 5.0);

  float yaw = uYaw;
  float pitch = uPitch;
  if (camMode < 0.5) {
    // flex = stock lookOffset aim + Root author coral on top
    vec3 off = lookOffset(8.0);
    vec3 aim = normalize(vec3(off.x, off.y, max(off.z - ro.z, 1e-3)));
    vec2 coral = coralLook(uCamBank, uLookT);
    yaw = atan(aim.x, aim.z) + coral.x;
    pitch = asin(clamp(aim.y, -1.0, 1.0)) + coral.y;
  }
  pitch = clamp(pitch, -1.45, 1.45);

  // Freelook frame. Negate screen Y — Three vUv + worldUp otherwise
  // puts the cavern floor on top of the frame at yaw/pitch 0.
  vec3 fwd = dirFrom(yaw, pitch);
  vec3 rt = cross(fwd, vec3(0.0, 1.0, 0.0));
  if (dot(rt, rt) < 1e-8) rt = vec3(1.0, 0.0, 0.0);
  else rt = normalize(rt);
  vec3 up = normalize(cross(rt, fwd));

  vec2 uu = vec2(u.x, -u.y);
  if (camMode < 0.5) {
    // Root-style UV roll on flex
    float ang = sin(T * 0.2) * 0.4;
    float ca = cos(ang);
    float sa = sin(ang);
    uu = mat2(ca, -sa, sa, ca) * uu;
  }
  vec3 D = normalize(rt * uu.x + up * uu.y + fwd);

  vec3 e = vec3(0.01, 0.0, 0.0);

  float s = 0.0;
  float d = 0.0;
  vec3 p = ro;
  vec4 o = vec4(0.0);

  // Idle #ff391c * 9 ≈ stock (9,2,1); #2a55ff * 6 ≈ stock (1,2,6)
  vec3 wallTint = mix(uWall, uWallPeak, clamp(uWallMix, 0.0, 1.0));
  vec3 lightTint = mix(uLight, uLightPeak, clamp(uLightMix, 0.0, 1.0));
  vec3 wallGlow = wallTint * 9.0;
  vec3 lightGlow = lightTint * 6.0;

  for (int i = 0; i < 128; i++) {
    p = ro + D * d;
    d += s = map(p);
    o += vec4(wallGlow, 0.0) +
      vec4(0.01 * lightGlow / (0.001 + abs(s)), 0.0);
  }

  vec3 nor = normalize(
    map(p) -
      vec3(map(p - e.xyy), map(p - e.yxy), map(p - e.yyx))
  );

  o.rgb *= tex3D(iChannel0, p * 0.5, nor);
  o *= o;
  o *= AO(p, nor);

  vec3 lit = tanh(sqrt(max(d * o.rgb / 1e8 * exp(d / 7.0), 0.0)));
  lit = applySat(lit, uSaturation);
  lit = clamp(lit, 0.0, 1.0);
  gl_FragColor = vec4(lit, 1.0);
}
`;
