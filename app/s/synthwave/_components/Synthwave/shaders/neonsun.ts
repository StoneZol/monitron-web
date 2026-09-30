/** Wallpaper Engine neon_sunset `neonsun` shaders → GLSL (Three.js). */

export const neonSunVertexShader = /* glsl */ `
varying vec2 vTexCoord;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  // WE UV, flipped V — Three plane has v=0 at bottom, WE sun expects top = +y yellow
  vTexCoord = (uv * 2.0 - 1.0) * 0.3;
  vTexCoord.y = -vTexCoord.y;
}
`;

export const neonSunFragmentShader = /* glsl */ `
varying vec2 vTexCoord;

uniform float uTime;
uniform float uDiskBrightness;
uniform float uGlowBrightness;
uniform vec3 uColorSunTop;
uniform vec3 uColorSunBottom;
uniform vec3 uColorSunGlow;

void main() {
  float sunSize = 0.05;
  float sunSizeSqrt = sqrt(sunSize);
  // WE formula can leave 0…1 — clamp or top overshoots and blows out
  float blendSunColor = clamp(
    (vTexCoord.y + sunSize * 2.5) / sunSizeSqrt,
    0.0,
    1.0
  );
  vec4 colorSun = vec4(mix(uColorSunTop, uColorSunBottom, blendSunColor), 0.0);
  float sunRadius = dot(vTexCoord.xy, vTexCoord.xy);
  colorSun.a = 1.0 - step(0.05, sunRadius);
  float glowAlpha = pow(smoothstep(0.08, 0.045, sunRadius), 2.0);

  float barPos = vTexCoord.y + 0.1;

  float sunCutOut = 1.0 - clamp(
    smoothstep(0.0, 0.005, barPos) *
      smoothstep(1.0 - barPos * 9.0, 1.0 - barPos * 8.0, sin(barPos * 200.0 + uTime)),
    0.0,
    1.0
  );
  float sunCutOutSmooth = 1.0 - clamp(
    smoothstep(0.0, 0.05, barPos) *
      smoothstep(-1.0 - barPos * 8.0, 1.0 - barPos * 8.0, sin(barPos * 200.0 + uTime)),
    0.0,
    1.0
  );

  float diskB = max(uDiskBrightness, 0.0);
  float glowB = max(uGlowBrightness, 0.0);

  vec3 rgb = uColorSunGlow * glowB;
  rgb = mix(rgb, colorSun.rgb * diskB, colorSun.a * sunCutOut);
  float alpha = max(
    glowAlpha * sunCutOutSmooth * min(glowB, 1.0),
    colorSun.a * sunCutOut * step(0.001, diskB)
  );

  gl_FragColor = vec4(rgb, alpha);
}
`;
