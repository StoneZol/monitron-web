/**
 * Neon grid: UV cells on planar meshes. No world-space X warp —
 * foreshortening is pure camera projection.
 *
 * uLineWidth — core stroke scale (1 = default)
 * uGlow — 0…1 soft halo + line boost
 * uPerspective — 0…1 foreshortening: thickens horizon bar; kills far horizontals earlier
 */

export const neonGridVertexShader = /* glsl */ `
uniform float uScroll;
uniform float uCellsU;
uniform float uCellsV;

varying vec2 vUv;
varying vec2 vGrid;

void main() {
  vUv = uv;
  vGrid = vec2(uv.x * uCellsU, uv.y * uCellsV + uScroll);

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const neonGridFragmentShader = /* glsl */ `
varying vec2 vUv;
varying vec2 vGrid;

uniform vec3 uColorGridNear;
uniform vec3 uColorGridFar;
uniform vec3 uColorGridBackground;
uniform float uLineWidth;
uniform float uGlow;
uniform float uPerspective;

void main() {
  vec2 dist = abs(fract(vGrid) - 0.5);
  vec2 fw = max(fwidth(vGrid), vec2(1e-5));
  float w = clamp(uLineWidth, 0.25, 4.0);
  vec2 halfWidth = min(fw * w, vec2(0.035 * w + 0.02));
  vec2 line = smoothstep(0.5 - halfWidth, vec2(0.5), dist);

  float g = clamp(uGlow, 0.0, 1.0);
  vec2 glowHalf = min(fw * (w + g * 5.0), vec2(0.08 + g * 0.18));
  vec2 glowLine = smoothstep(0.5 - glowHalf, vec2(0.5), dist);

  float keepX = 1.0 - smoothstep(0.18, 0.50, fw.x);
  float keepY = 1.0 - smoothstep(0.18, 0.50, fw.y);

  float persp = clamp(uPerspective, 0.0, 1.0);
  float far = smoothstep(0.68, 0.97, vUv.y);

  // Horizontals: full from the near edge at low persp; at high persp stop
  // earlier so the vanish doesn't AA-flicker (dead zone before horizon bar)
  float farKill0 = mix(0.9, 0.28, persp);
  float farKill1 = mix(0.99, 0.52, persp);
  float horizKeep = 1.0 - smoothstep(farKill0, farKill1, vUv.y);

  float horiz = line.y * keepY * horizKeep;
  float vert = line.x * keepX * mix(1.0, 0.55, far);
  float core = min(max(vert, horiz), 0.92);
  float glowAlphaH = glowLine.y * keepY * horizKeep * g * 0.5;
  float glowAlphaV = glowLine.x * keepX * mix(1.0, 0.5, far) * g * 0.5;
  float glowAlphaFar = max(glowAlphaH, glowAlphaV);
  float gridAlpha = min(core + glowAlphaFar * (1.0 - core), 1.0);

  float colorDistanceBlend = pow(max(vUv.y, 0.0), 0.8);
  vec3 lineColor = mix(uColorGridNear, uColorGridFar, colorDistanceBlend);
  lineColor *= (0.72 + g * 2.2);
  vec3 resultColor = mix(uColorGridBackground, lineColor, gridAlpha);

  // Far horizon bar — thicker with perspective to mask leftover flicker
  float coreW = mix(0.01, 0.06, persp);
  float glowW = mix(0.055, 0.28, persp);
  float horizonGlow = 1.0 - smoothstep(0.0, glowW, abs(vUv.y - 0.955));
  float horizonCore = 1.0 - smoothstep(0.0, coreW, abs(vUv.y - 0.988));
  float horizon = max(horizonCore, horizonGlow * mix(0.5, 0.92, persp));
  vec3 horizonColor = mix(uColorGridFar, uColorGridNear, 0.35);
  horizonColor = mix(horizonColor, vec3(1.0), 0.18);
  resultColor = mix(resultColor, horizonColor, horizon);

  gl_FragColor = vec4(resultColor, 1.0);
}
`;
