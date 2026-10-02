/**
 * Black hole fullscreen shader — hybrid of:
 * - Gargantua / lstSRS (sonicether) — disk + warp + horizon
 *   via NamaIazi Unity port of https://www.shadertoy.com/view/lstSRS
 * - Flight / star scroll vibe from https://www.shadertoy.com/view/tsBXW3
 *
 * License note (Gargantua lineage): Shadertoy default CC BY-NC-SA 3.0 — attribute.
 * Adapted for Monitron: fixed camera, low default steps, procedural noise (no textures),
 * tunable uniforms for colors / flight / quality / reactive punch.
 */

export const blackholeVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const blackholeFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uDiskInner;
uniform vec3 uDiskOuter;
uniform vec3 uHazeColor;
uniform vec3 uStarTint;
uniform float uFlightSpeed;
uniform float uDiskSpeed;
uniform int uSteps;
uniform float uStepScale;
uniform float uSsRadius;
uniform float uWarpAmount;
uniform float uSpacePunch;
uniform float uHolePunch;

const float ST_REF = 7.5;
const int MAX_STEPS = 64;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p += dot(p, p.yzx + 19.19);
  return fract(p.x * p.y * p.z);
}

float noise3(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n =
    mix(
      mix(
        mix(hash31(p), hash31(p + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(p + vec3(0.0, 1.0, 0.0)), hash31(p + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(p + vec3(0.0, 0.0, 1.0)), hash31(p + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(p + vec3(0.0, 1.0, 1.0)), hash31(p + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  return -1.0 + 2.0 * n;
}

float pcurve(float x, float a, float b) {
  float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
  return k * pow(x, a) * pow(1.0 - x, b);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

void warpSpace(inout vec3 eyevec, inout vec3 currentRayPos, float stepsF) {
  float singularityDist = max(length(currentRayPos), 0.05);
  float warpFactor = 1.0 / (pow(singularityDist, 2.0) + 0.000001);
  vec3 singularityVector = normalize(-currentRayPos);
  // Soften warp at low step counts so rays don't dive into the hole in 1–2 ticks
  float warpScale = uWarpAmount * (1.0 + uHolePunch * 0.35) / max(stepsF, 8.0);
  eyevec = normalize(eyevec + singularityVector * warpFactor * warpScale);
}

void gasDisc(
  float stStepSize,
  float stepsF,
  inout vec3 color,
  inout float alpha,
  vec3 pos
) {
  float discWidth = 5.3;
  float discRadius = 3.2;
  float discInner = max(0.0, discRadius - discWidth * 0.5);
  // Thicker slab when few samples — otherwise the disc is a coin toss to hit
  float discThickness = 0.12 * clamp(28.0 / stepsF, 1.0, 6.0);

  float distFromCenter = length(pos);
  float distFromDisc = pos.y;
  float radialGradient = 1.0 - clamp((distFromCenter - discInner) / discWidth * 0.5, 0.0, 1.0);

  float coverage = pcurve(max(radialGradient, 0.0), 4.0, 0.9);
  discThickness *= max(radialGradient, 0.15);
  coverage *= clamp(1.0 - abs(distFromDisc) / max(discThickness, 1e-4), 0.0, 1.0);

  vec3 dustColorLit = mix(uDiskOuter, uDiskInner, pow(clamp(radialGradient, 0.0, 1.0), 0.65));
  float dustGlow = 1.0 / (pow(1.0 - radialGradient, 2.0) * 290.0 + 0.002);
  vec3 dustColor = dustColorLit * dustGlow * 8.2;

  coverage = clamp(coverage * 0.7, 0.0, 1.0);

  float fade = pow(abs(distFromCenter - discInner) + 0.4, 4.0) * 0.04;
  float bloomFactor = 1.0 / (pow(distFromDisc, 2.0) * 40.0 + fade + 0.00002);
  vec3 b = dustColorLit * pow(bloomFactor, 1.5);
  b *= mix(vec3(1.7, 1.1, 1.0), vec3(0.5, 0.6, 1.0), pow(radialGradient, 2.0));
  b *= mix(vec3(1.7, 0.5, 0.1), vec3(1.0), pow(radialGradient, 0.5));

  dustColor = mix(dustColor, b * 150.0, clamp(1.0 - coverage, 0.0, 1.0));
  coverage = clamp(coverage + bloomFactor * bloomFactor * 0.1, 0.0, 1.0);

  if (coverage < 0.0001) return;

  vec3 radialCoords;
  radialCoords.x = distFromCenter * 1.5 + 0.55;
  radialCoords.y = atan(pos.x, pos.z) * 1.5;
  radialCoords.z = distFromDisc * 1.5;
  radialCoords *= 0.95;

  float speed = uDiskSpeed * (1.0 + uHolePunch * 0.8);
  float t = uTime;

  float noise1 = 1.0;
  vec3 rc = radialCoords;
  rc.y += t * speed;
  noise1 *= noise3(rc * 3.0) * 0.5 + 0.5;
  rc.y -= t * speed;
  noise1 *= noise3(rc * 6.0) * 0.5 + 0.5;
  rc.y += t * speed;
  noise1 *= noise3(rc * 12.0) * 0.5 + 0.5;

  float noise2 = 2.0;
  rc = radialCoords + 30.0;
  noise2 *= noise3(rc * 3.0) * 0.5 + 0.5;
  rc.y += t * speed;
  noise2 *= noise3(rc * 6.0) * 0.5 + 0.5;
  rc.y -= t * speed;
  noise2 *= noise3(rc * 12.0) * 0.5 + 0.5;
  rc.y += t * speed;
  noise2 *= noise3(rc * 24.0) * 0.5 + 0.5;

  dustColor *= noise1 * 0.85 + 0.15;
  coverage *= clamp(noise2, 0.0, 1.0);
  // Normalize vs step count without blowing out at low steps
  coverage = clamp(coverage * (28.0 / max(stepsF, 1.0)), 0.0, 1.0);
  coverage *= pcurve(max(radialGradient, 0.0), 4.0, 0.9);
  coverage = clamp(coverage * (1.0 + uHolePunch * 0.55), 0.0, 1.0);

  color = (1.0 - alpha) * max(dustColor, vec3(0.0)) * coverage + color;
  alpha = (1.0 - alpha) * coverage + alpha;
}

void haze(inout vec3 color, vec3 pos, float alpha, float stepsF) {
  float torusDist = abs(sdTorus(pos + vec3(0.0, -0.05, 0.0), vec2(1.0, 0.01)));
  float bloomDisc = 1.0 / (pow(torusDist, 2.0) + 0.001);
  bloomDisc *= length(pos) < 0.5 ? 0.0 : 1.0;
  color += uHazeColor * bloomDisc * (2.9 / max(stepsF, 8.0)) * (1.0 - alpha) * (1.0 + uHolePunch * 0.4);
}

/** Cheap streaking starfield — flight layer (tsBXW3 vibe), not Kerr. */
vec3 starField(vec3 rayDir, float flight) {
  vec3 col = vec3(0.02, 0.025, 0.05);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 p = rayDir * (2.0 + fi * 1.7);
    p.z += uTime * flight * (0.55 + fi * 0.2);
    vec3 cell = floor(p * (18.0 + fi * 9.0));
    float n = hash31(cell);
    if (n > 0.985) {
      float twinkle = 0.55 + 0.45 * sin(uTime * (3.0 + fi) + n * 40.0);
      float streak = 1.0 + flight * (0.5 + uSpacePunch * 3.0);
      vec2 q = fract(p.xy * (18.0 + fi * 9.0)) - 0.5;
      float d = length(vec2(q.x, q.y / streak));
      float star = smoothstep(0.04, 0.0, d) * twinkle;
      col += uStarTint * star * (0.55 + 0.45 * n);
    }
  }
  float neb = noise3(rayDir * 3.0 + vec3(0.0, 0.0, uTime * flight * 0.05));
  col += uStarTint * 0.05 * max(neb, 0.0);
  return col;
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  // Fixed camera — elevation so the accretion ring reads clearly.
  float flight = max(0.0, uFlightSpeed) * (1.0 + uSpacePunch);
  vec3 camPos = vec3(0.0, 1.25, 8.0 - min(flight * 0.25, 1.5));
  vec3 lookAt = vec3(0.0, 0.0, 0.0);
  vec3 forward = normalize(lookAt - camPos);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rayDir = normalize(forward + uv.x * right * 0.8 + uv.y * up * 0.8);

  int steps = clamp(uSteps, 1, MAX_STEPS);
  float stepsF = float(steps);
  // Cap step length — low steps must NOT inflate step to ~7.5 (that ate the frame).
  float stStepSize = min((ST_REF * 2.0) / stepsF * max(uStepScale, 0.25), 0.35);

  float dither = hash21(gl_FragCoord.xy);
  vec3 stRayPos = camPos + rayDir * dither * stStepSize;
  vec3 stRayDir = rayDir;

  float alpha = 0.0;
  vec3 color = vec3(0.0);
  float blackHoleMask = 0.0;
  float maxTravel = 18.0;
  float traveled = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= steps) break;
    if (traveled > maxTravel) break;

    float r = length(stRayPos);
    // Only paint horizon when we are actually there — never "distance < stepSize"
    if (r <= uSsRadius) {
      blackHoleMask = 1.0;
      break;
    }

    warpSpace(stRayDir, stRayPos, stepsF);
    float stepLen = min(stStepSize, max(r - uSsRadius * 0.98, 0.02));
    stRayPos += stRayDir * stepLen;
    traveled += stepLen;

    gasDisc(stStepSize, stepsF, color, alpha, stRayPos);
    haze(color, stRayPos, alpha, stepsF);
  }

  vec3 background = starField(normalize(stRayDir), max(flight, 0.05));
  background *= 1.0 - blackHoleMask;

  vec3 outCol = mix(background, max(color, vec3(0.0)), clamp(alpha, 0.0, 1.0));
  outCol = mix(outCol, vec3(0.0), blackHoleMask * 0.92);

  outCol = outCol / (1.0 + outCol * 0.2);
  outCol = pow(max(outCol, 0.0), vec3(0.9));

  gl_FragColor = vec4(outCol, 1.0);
}
`;
