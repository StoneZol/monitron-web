/** Neon grid: square UV cells + linear X taper (convergence angle into the distance). */

export const neonGridVertexShader = /* glsl */ `
uniform float uScroll;
uniform float uCellsU;
uniform float uCellsV;
uniform float uZNear;
uniform float uZFar;
uniform float uTaper;

varying vec2 vUv;
varying vec2 vGrid;

void main() {
  vUv = uv;
  // Plus scroll → we move forward along the road (lines come toward the camera).
  vGrid = vec2(uv.x * uCellsU, uv.y * uCellsV + uScroll);

  // Linear X taper with depth → constant convergence angle of grid lines.
  // uTaper 0 = parallel, 1 = meet at the far edge.
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  float depthT = clamp(
    (uZNear - worldPos.z) / max(1e-4, uZNear - uZFar),
    0.0,
    1.0
  );
  float scale = max(1.0 - uTaper * depthT, 0.02);
  worldPos.x *= scale;

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

  // Horizontals densify at the vanishing point → kill them before they shimmer.
  float far = smoothstep(0.62, 0.96, vUv.y);
  float horiz = line.y * b * (1.0 - far);
  float vert = line.x * a * mix(1.0, 0.55, far);
  float gridAlpha = min(max(vert, horiz), 0.92);

  float colorDistanceBlend = pow(max(vUv.y, 0.0), 0.8);
  vec3 lineColor = mix(uColorGridNear, uColorGridFar, colorDistanceBlend);
  vec3 resultColor = mix(uColorGridBackground, lineColor, gridAlpha);

  // Static horizon light — horizontals read as emerging from this band.
  float horizonGlow = 1.0 - smoothstep(0.0, 0.085, abs(vUv.y - 0.965));
  float horizonCore = 1.0 - smoothstep(0.0, 0.014, abs(vUv.y - 0.992));
  float horizon = max(horizonCore, horizonGlow * 0.65);
  vec3 horizonColor = mix(uColorGridFar, uColorGridNear, 0.35);
  horizonColor = mix(horizonColor, vec3(1.0), 0.22);
  resultColor = mix(resultColor, horizonColor, horizon);

  gl_FragColor = vec4(resultColor, 1.0);
}
`;
