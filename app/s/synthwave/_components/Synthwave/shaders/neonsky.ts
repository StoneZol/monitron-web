/** Wallpaper Engine neon_sunset `cloudsbg` — procedural (no clouds_512 tex). */

export const neonSkyVertexShader = /* glsl */ `
varying vec4 vTexCoord;
varying vec4 vTexCoordClouds;

uniform float uTime;
uniform vec2 uCloudSpeeds;
uniform vec4 uCloudScales;
uniform float uAspect;

void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
  vec2 aTexCoord = uv;

  vTexCoord.xy = aTexCoord;
  vTexCoordClouds.xy = (aTexCoord + uTime * uCloudSpeeds.x) * uCloudScales.xy;
  vTexCoordClouds.zw = (aTexCoord + uTime * uCloudSpeeds.y) * uCloudScales.zw;
  vTexCoordClouds.xz *= uAspect;
  vTexCoordClouds.zw = vec2(-vTexCoordClouds.w, vTexCoordClouds.z);

  vTexCoord.zw = aTexCoord - vec2(0.5, 0.3);
  vTexCoord.z *= uAspect;
}
`;

export const neonSkyFragmentShader = /* glsl */ `
varying vec4 vTexCoord;
varying vec4 vTexCoordClouds;

uniform vec3 uColorClouds;
uniform vec3 uColorHorizon;

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
    u.y
  );
  return res * res;
}

float fbm(vec2 x) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; ++i) {
    v += a * noise(x);
    x = x * 2.1 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  float cloud0 = fbm(vTexCoordClouds.xy * 3.0);
  float cloud1 = fbm(vTexCoordClouds.zw * 3.0);
  float cloudBlend = cloud0 * cloud1;

  vec3 albedo = uColorClouds * cloudBlend;
  albedo += (uColorClouds * 0.5 + albedo) * pow(smoothstep(0.5, 0.0, vTexCoord.y), 2.0) * 2.0;

  float horizonBend = 1.0 - cos(clamp(vTexCoord.x * 2.0 - 0.5, 0.0, 1.0) * 2.0 * 3.14159265);
  vec2 horizonDelta = (vTexCoord.xy - vec2(0.5, 0.6)) * vec2(0.5, 1.5 - horizonBend * 0.3);
  float distanceToCenter = length(horizonDelta);
  albedo += uColorHorizon * pow(smoothstep(0.5, 0.0, distanceToCenter), 2.0) * 2.0;

  // sparse stars
  float star = step(0.997, rand(floor(vTexCoord.xy * vec2(180.0, 120.0))));
  albedo += vec3(star) * smoothstep(0.55, 0.0, vTexCoord.y) * 0.7;

  gl_FragColor = vec4(albedo, 1.0);
}
`;
