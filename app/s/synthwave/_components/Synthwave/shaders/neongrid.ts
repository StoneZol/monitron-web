/**
 * Neon grid: UV cells on planar meshes. No world-space X warp —
 * foreshortening is pure camera projection.
 *
 * uLineWidth — core stroke scale (1 = default)
 * uGlow — 0…1 soft halo + line boost
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

void main() {
  vec2 dist = abs(fract(vGrid) - 0.5);
  vec2 fw = max(fwidth(vGrid), vec2(1e-5));
  float w = clamp(uLineWidth, 0.25, 4.0);
  vec2 halfWidth = min(fw * w, vec2(0.035 * w + 0.02));
  vec2 line = smoothstep(0.5 - halfWidth, vec2(0.5), dist);

  float g = clamp(uGlow, 0.0, 1.0);
  vec2 glowHalf = min(fw * (w + g * 5.0), vec2(0.08 + g * 0.18));
  vec2 glowLine = smoothstep(0.5 - glowHalf, vec2(0.5), dist);
  float glowAlpha = max(glowLine.x, glowLine.y) * g * 0.5;

  float keepX = 1.0 - smoothstep(0.18, 0.50, fw.x);
  float keepY = 1.0 - smoothstep(0.18, 0.50, fw.y);

  float far = smoothstep(0.68, 0.97, vUv.y);
  float horiz = line.y * keepY * (1.0 - far * 0.85);
  float vert = line.x * keepX * mix(1.0, 0.6, far);
  float core = min(max(vert, horiz), 0.92);
  float gridAlpha = min(core + glowAlpha * (1.0 - core), 1.0);

  float colorDistanceBlend = pow(max(vUv.y, 0.0), 0.8);
  vec3 lineColor = mix(uColorGridNear, uColorGridFar, colorDistanceBlend);
  lineColor *= (0.72 + g * 2.2);
  vec3 resultColor = mix(uColorGridBackground, lineColor, gridAlpha);

  float horizonGlow = 1.0 - smoothstep(0.0, 0.085, abs(vUv.y - 0.965));
  float horizonCore = 1.0 - smoothstep(0.0, 0.014, abs(vUv.y - 0.992));
  float horizon = max(horizonCore, horizonGlow * 0.65);
  vec3 horizonColor = mix(uColorGridFar, uColorGridNear, 0.35);
  horizonColor = mix(horizonColor, vec3(1.0), 0.22);
  resultColor = mix(resultColor, horizonColor, horizon);

  gl_FragColor = vec4(resultColor, 1.0);
}
`;
