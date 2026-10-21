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

/**
 * Fill bottom color upward from the disk rim.
 * `bottomFill` 0 → tip only; 1 → bottom dominates most of the disk
 * (pure bottom by ~mid, not only at the rim — hot tops otherwise wash it out).
 */
const sunBlendGLSL = /* glsl */ `
float sunBlend(float y, float bottomFill) {
  float r = sqrt(0.05);
  // visual top y=-r → 0, visual bottom y=+r → 1
  float t = clamp((y + r) / (2.0 * r), 0.0, 1.0);
  float fill = clamp(bottomFill, 0.02, 1.0);
  float edge0 = 1.0 - fill;
  // at fill=1 reach pure bottom by mid-disk, not at the rim
  float edge1 = mix(1.0, 0.4, fill);
  float blend = smoothstep(edge0, max(edge0 + 1e-3, edge1), t);
  return pow(blend, 0.5);
}

/** Lift dark bottoms (red) toward top energy so bloom doesn't erase them. */
vec3 sunBottomLit(vec3 topC, vec3 botC) {
  float topL = max(dot(topC, vec3(0.299, 0.587, 0.114)), 0.001);
  float botL = max(dot(botC, vec3(0.299, 0.587, 0.114)), 0.001);
  return botC * min(topL / botL, 2.8);
}
`;

export const neonSunFragmentShader = /* glsl */ `
varying vec2 vTexCoord;

uniform float uTime;
uniform float uDiskBrightness;
uniform float uGlowBrightness;
uniform float uGradientStart;
uniform vec3 uColorSunTop;
uniform vec3 uColorSunBottom;

${sunBlendGLSL}

void main() {
  float blendSunColor = sunBlend(vTexCoord.y, uGradientStart);
  vec3 botC = sunBottomLit(uColorSunTop, uColorSunBottom);
  vec3 diskColor = mix(uColorSunTop, botC, blendSunColor);
  float sunRadius = dot(vTexCoord.xy, vTexCoord.xy);
  float inDisk = 1.0 - step(0.05, sunRadius);
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
  float onChunk = inDisk * sunCutOut;

  // Halo follows fill — more bottom when fill is high
  vec3 glowTint = mix(uColorSunTop, botC, 0.35 + 0.5 * clamp(uGradientStart, 0.0, 1.0));
  vec3 rgb = glowTint * glowB;

  // Never muddy-multiply below 1 — keep full chroma, fade alpha instead.
  // Above 1 boosts emission into bloom.
  vec3 body = diskColor * (diskB > 1.0 ? diskB : 1.0);
  float bodyLuma = dot(body, vec3(0.299, 0.587, 0.114));
  if (bodyLuma > 1.2) {
    float outL = 1.2 + (bodyLuma - 1.2) / (1.0 + (bodyLuma - 1.2) * 0.55);
    body *= outL / bodyLuma;
  }
  rgb = mix(rgb, body, onChunk);

  float diskA = onChunk * clamp(diskB, 0.0, 1.0);
  float alpha = max(
    glowAlpha * sunCutOutSmooth * min(glowB, 1.0),
    diskA
  );

  gl_FragColor = vec4(rgb, alpha);
}
`;

/**
 * Fixed sun footprint. Opacity 0→1 only.
 * Tint from the same top/bottom gradient as the disk.
 */
export const neonSunFlashFragmentShader = /* glsl */ `
varying vec2 vTexCoord;

uniform float uTime;
uniform float uOpacity;
uniform float uGradientStart;
uniform vec3 uColorSunTop;
uniform vec3 uColorSunBottom;

${sunBlendGLSL}

void main() {
  float blend = sunBlend(vTexCoord.y, uGradientStart);
  vec3 botC = sunBottomLit(uColorSunTop, uColorSunBottom);
  vec3 diskColor = mix(uColorSunTop, botC, blend);

  float sunRadius = dot(vTexCoord.xy, vTexCoord.xy);
  float inDisk = 1.0 - step(0.05, sunRadius);
  float barPos = vTexCoord.y + 0.1;
  float sunCutOut = 1.0 - clamp(
    smoothstep(0.0, 0.005, barPos) *
      smoothstep(1.0 - barPos * 9.0, 1.0 - barPos * 8.0, sin(barPos * 200.0 + uTime)),
    0.0,
    1.0
  );

  float onChunk = inDisk * sunCutOut;
  float op = clamp(uOpacity, 0.0, 1.0) * onChunk;

  // Equal energy + white kick on red-only so every hue flashes
  float sum = max(diskColor.r + diskColor.g + diskColor.b, 0.001);
  vec3 equalEnergy = diskColor / sum;
  float cool = max(diskColor.g, diskColor.b);
  float toWhite = 1.0 - smoothstep(0.12, 0.55, cool);
  vec3 tint = mix(equalEnergy, vec3(1.0), toWhite * 0.7);
  float tintSum = max(tint.r + tint.g + tint.b, 0.001);
  tint *= 0.9 / tintSum;

  gl_FragColor = vec4(tint, op);
}
`;
