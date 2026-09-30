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
uniform vec3 uColorSunTop;
uniform vec3 uColorSunBottom;

void main() {
  float sunSize = 0.05;
  float sunSizeSqrt = sqrt(sunSize);
  float blendSunColor = (vTexCoord.y + sunSize * 2.5) / sunSizeSqrt;
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

  vec3 rgb = uColorSunBottom;
  rgb = mix(rgb, colorSun.rgb, colorSun.a * sunCutOut);
  float alpha = max(glowAlpha * sunCutOutSmooth, colorSun.a * sunCutOut);

  gl_FragColor = vec4(rgb, alpha);
}
`;
