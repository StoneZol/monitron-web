/**
 * Port of Shadertoy https://www.shadertoy.com/view/fXGGDV
 * “Warpburst 2” — heidro
 *
 * Changes from original:
 * - Stars removed — fog / goo tunnel only
 * - Extra FBM octaves + fine wisp layer for more fog detail
 * - iTime / iResolution as uniforms
 * - uCamZ: accumulated flight (dt × flightSpeed)
 * - uColor / uHighlight: base goo + neon highlight (audio / garland)
 * - uGarland + uGarlandSpeed: realtime iridescent palette crawl
 * - uSaturation: look chroma
 * - uDetail: fog octave / wisp amount (0 = smooth, 1 = default, 4 = max)
 * - uTwinkle: peak flicker punch (0…1)
 */

export const warpburstVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const warpburstFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uCamZ;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uGarland;
uniform float uGarlandSpeed;
uniform float uSaturation;
uniform float uDetail;
uniform float uTwinkle;

const float PI = 3.14159265359;

vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
}

float gradientNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(
            mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
            mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
        mix(
            mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
            mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
        u.z
    );
}

float organicFBM(vec3 p, float detail) {
    float v = 0.0;
    float scale = 0.5;
    mat3 m = mat3(
         0.00,  0.80,  0.60,
        -0.80,  0.36, -0.48,
        -0.60, -0.48,  0.64
    );
    // detail 0 → coarse; 1 ≈ original ~3 oct; 4 → all 8 micro-octaves
    for (int i = 0; i < 8; i++) {
        float gate = smoothstep(-0.15, 0.4, detail * 1.15 - float(i) * 0.55);
        v += scale * gradientNoise3D(p) * gate;
        p = m * p * 2.1;
        scale *= 0.5;
    }
    return v * 0.5 + 0.5;
}

float fineWisp(vec3 p, float detail) {
    float a = gradientNoise3D(p * 2.4);
    float b = gradientNoise3D(p * 5.1 + 17.3);
    float base = smoothstep(0.35, 0.85, 0.55 * a + 0.45 * b);
    // Extra micro-filaments unlock past detail ~2
    float hi = smoothstep(1.4, 3.6, detail);
    float c = gradientNoise3D(p * (9.0 + detail * 2.5) + 41.7);
    float micro = smoothstep(0.4, 0.9, c);
    return mix(base, max(base, micro), hi * 0.85);
}

vec3 satMix(vec3 c) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(l), c, uSaturation);
}

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(2.0 * PI * (c * t + d));
}

vec3 garlandCol(float seed) {
    float t = 0.45 * iTime * uGarlandSpeed + seed * 0.19;
    vec3 c = pal(
        t,
        vec3(0.55, 0.40, 0.50),
        vec3(0.45, 0.45, 0.50),
        vec3(1.0, 0.9, 0.8),
        vec3(0.55, 0.25, 0.05)
    );
    return satMix(c * mix(vec3(1.0), uColor * 1.4, 0.65));
}

void main() {
    vec2 fragCoord = vUv * iResolution.xy;
    vec2 uvRaw = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Flight clock from accumulated cam Z (1 ≈ Shadertoy BASE_SPEED path)
    float time = uCamZ;

    float roll  = sin(time * 0.25) * 0.7;
    float pitch = cos(time * 0.15) * 0.15;
    float yaw   = sin(time * 0.10) * 0.15;

    float cr = cos(roll), sr = sin(roll);
    vec2 uvTunnel = vec2(
        uvRaw.x * cr - uvRaw.y * sr,
        uvRaw.x * sr + uvRaw.y * cr
    );

    vec3 ro = vec3(0.0, 0.0, time * 2.5);
    vec3 rd = normalize(vec3(uvTunnel + vec2(yaw, pitch), 1.2));

    float swayX = sin(time * 0.3) * 0.08;
    float swayY = cos(time * 0.2) * 0.05;
    rd.x += swayX;
    rd.y += swayY;

    // Cylinder intersection — goo wall
    float radius = 2.0;
    float a = dot(rd.xy, rd.xy);
    float b = 2.0 * dot(ro.xy, rd.xy);
    float c = dot(ro.xy, ro.xy) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;

    vec3 hitPos = vec3(0.0);
    if (discriminant >= 0.0) {
        float tHit = (-b + sqrt(discriminant)) / (2.0 * a);
        hitPos = ro + rd * tHit;
    }

    float detail = clamp(uDetail, 0.0, 4.0);
    float freqBoost = 0.3 + 0.06 * max(0.0, detail - 1.0);
    float warp = organicFBM(
        hitPos * freqBoost + vec3(0.0, 0.0, -time * 0.5),
        detail
    );
    vec3 spaceGooPos = hitPos * vec3(0.8, 0.8, 0.3) + vec3(warp * 1.5);
    float gooNoise = organicFBM(spaceGooPos, detail);
    float wisp = fineWisp(
        spaceGooPos * (1.35 + 0.35 * max(0.0, detail - 1.0))
            + vec3(0.0, 0.0, time * 0.2),
        detail
    );
    float wispAmt = smoothstep(0.15, 2.4, detail) * (0.7 + 0.3 * min(detail, 4.0) / 4.0);
    float gooDensity = smoothstep(0.38, 0.78, gooNoise);
    gooDensity = clamp(gooDensity + 0.28 * wisp * gooDensity * wispAmt, 0.0, 1.35);

    vec3 baseGoo = satMix(uColor);
    vec3 neonHighlight = satMix(uHighlight);

    vec3 gooFinal;
    if (uGarland > 0.5) {
        float lead = 0.028 * (hitPos.z - ro.z);
        vec3 iri = garlandCol(warp * 3.0 + lead);
        vec3 hi  = mix(neonHighlight, iri, 0.55);
        gooFinal = mix(baseGoo, hi, warp) * gooDensity;
        // Soft cell twinkle along the wall
        float tw = 0.82 + 0.28 * sin(iTime * uGarlandSpeed * 2.4 + warp * 18.0);
        gooFinal *= tw;
    } else {
        // Solid tint — uColor is idle, or CPU idle→peak on punches.
        // Don't mix toward peak here or idle looks stuck mid-lerp.
        gooFinal = baseGoo * gooDensity * mix(0.82, 1.18, warp);
    }

    // Peak flicker — brighten / thin the fog on punches
    float peakMul = 1.0 + uTwinkle * (0.55 + 0.35 * warp);
    gooFinal *= peakMul;

    vec2 tunnelCenter = vec2(-yaw - swayX, -pitch - swayY);
    vec2 relUV = uvTunnel - tunnelCenter;
    float currentRadius = length(relUV);

    float depthFade = smoothstep(0.0, 0.45, currentRadius);
    vec3 volumetricTunnel = gooFinal * depthFade * 2.5;

    vec3 coreCenterGlow = (
        uGarland > 0.5
            ? mix(baseGoo, neonHighlight, 0.35)
            : baseGoo
    ) * 0.08 * (1.0 - smoothstep(0.0, 0.4, currentRadius))
      * (1.0 + uTwinkle * 0.8);

    vec3 composite = volumetricTunnel + coreCenterGlow;
    composite *= smoothstep(1.5, 0.4, length(uvRaw));
    composite = vec3(1.0) - exp(-composite * (1.5 + uTwinkle * 0.35));

    gl_FragColor = vec4(composite, 1.0);
}
`;
