/**
 * Neon grid: UV cells on planar meshes. No world-space X warp —
 * foreshortening is pure camera projection.
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

void main() {
  vec2 dist = abs(fract(vGrid) - 0.5);
  vec2 fw = max(fwidth(vGrid), vec2(1e-5));
  vec2 halfWidth = min(fw * 1.0, vec2(0.07));
  vec2 line = smoothstep(0.5 - halfWidth, vec2(0.5), dist);

  float a = 1.0 - smoothstep(0.22, 0.55, fw.x);
  float b = 1.0 - smoothstep(0.10, 0.26, fw.y);

  float far = smoothstep(0.62, 0.96, vUv.y);
  float horiz = line.y * b * (1.0 - far);
  float vert = line.x * a * mix(1.0, 0.55, far);
  float gridAlpha = min(max(vert, horiz), 0.92);

  float colorDistanceBlend = pow(max(vUv.y, 0.0), 0.8);
  vec3 lineColor = mix(uColorGridNear, uColorGridFar, colorDistanceBlend);
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
