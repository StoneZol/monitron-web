/**
 * Port of Shadertoy https://www.shadertoy.com/view/73KGRd
 * “Hexagonal Hive Lattice” / HEXACORE — nobody93
 *
 * Changes from original:
 * - iTime / iResolution as uniforms
 * - uCamZ: accumulated camera Z (dt × flightSpeed) so speed changes don’t jump the tunnel
 * - uColor: crystal / non-garland tint (may be audio-reactive)
 * - uWaveColor: fixed idle tint for energy crests — never audio-modulated
 * - uGarland: on = racing energy pulse + volumetric glow; off = steady edge emit in uColor
 * - uPulseA/B: crest world-Z; constant world speed; despawn by distance traveled (ignores flightSpeed)
 * - AA=1 for monitor perf
 */

export const hexacoreVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const hexacoreFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uCamZ;
uniform vec3 uColor;
uniform vec3 uWaveColor;
uniform float uGarland;
uniform vec4 uPulseA;
uniform vec4 uPulseB;
uniform float uPulseCount;

#define MAX_STEPS    110
#define MAX_DIST     28.0
#define KIFS_ITERS   4
#define REFLECTIONS  1
#define AA           1

const float PI    = 3.14159265359;
const float SQ3   = 1.73205080757;
const float CELL  = 2.6;
const float SLAB  = 2.6;
const float TUN_R = 0.95;

float gT;
float gTrap;
float gCid;
float gEmit;
float gMat;
float gCell2;
float gCamZ;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b * cos(2.0 * PI * (c * t + d)); }
vec3 palCrystal(float t){
  vec3 c = pal(t, vec3(.50,.50,.55), vec3(.50,.45,.45), vec3(1.,1.,1.),  vec3(.00,.15,.35));
  return c * mix(vec3(1.0), uColor * 1.35, 0.55);
}
vec3 palEnergy (float t){
  // Wave / energy paths — locked to uWaveColor so audio never flexes crests
  vec3 c = pal(t, vec3(.60,.45,.50), vec3(.45,.45,.50), vec3(1.,.9,.8),   vec3(.55,.25,.05));
  return c * mix(vec3(1.0), uWaveColor * 1.5, 0.7);
}

float sdHex2(vec2 p, float r){
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}
float sdHexPrism(vec3 p, vec2 h){
    vec2 d = vec2(sdHex2(p.xy, h.x), abs(p.z) - h.y);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
vec2 foldD6(vec2 p){
    const vec2 k = vec2(-0.866025404, 0.5);
    p = abs(p);
    return p - 2.0 * min(dot(k, p), 0.0) * k;
}
vec4 hexLattice(vec2 p){
    const vec2 s = vec2(1.0, SQ3);
    vec4 c = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h = vec4(p - c.xy * s, p - (c.zw + 0.5) * s);
    return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, c.xy) : vec4(h.zw, c.zw + 0.5);
}

vec2 path(float z){
    return vec2(1.9 * sin(z * 0.19) + 0.9 * sin(z * 0.083 + 1.3),
                1.3 * cos(z * 0.145) + 0.6 * sin(z * 0.061));
}

float map(vec3 p){
    vec4  hl  = hexLattice(p.xy / CELL);
    vec2  lq  = hl.xy * CELL;
    float sz  = floor(p.z / SLAB + 0.5);
    vec3  q   = vec3(lq, p.z - sz * SLAB);
    gCid      = hash21(hl.zw + sz * 7.13);

    const float SCALE = 2.05;
    const vec3  OFF   = vec3(0.92, 0.46, 0.70);
    float s    = 1.0, trap = 1e9;
    float tw   = 0.18 + 0.10 * sin(gT * 0.3 + gCid * 6.2831);
    q.xy = rot(gCid * 1.0472) * q.xy;
    for (int i = 0; i < KIFS_ITERS; i++){
        q.xy = foldD6(q.xy);
        q.z  = abs(q.z);
        q.xy = rot(tw) * q.xy;
        q    = q * SCALE - OFF * (SCALE - 1.0);
        s   *= SCALE;
        trap = min(trap, dot(q, q));
    }
    float crystal = sdHexPrism(q, vec2(0.95, 0.40)) / s;

    float ring = max(abs(sdHex2(q.xy, 0.55)) - 0.07, abs(q.z) - 0.43) / s;

    vec2  tq  = rot(p.z * 0.12 + 0.3 * sin(gT * 0.2)) * (p.xy - path(p.z));
    float tun = sdHex2(tq, TUN_R);

    const float N_AROUND = 12.0;
    const float PITCH    = 6.9282 * TUN_R / N_AROUND;
    float ang   = atan(tq.y, tq.x) / (2.0 * PI) * N_AROUND;
    vec4  wl    = hexLattice(vec2(ang, p.z / PITCH));
    float holeD = sdHex2(wl.yx, 0.36) * PITCH;
    float shellD = abs(tun - 0.07) - 0.045;
    float shell  = max(shellD, -holeD);
    float rimE   = max(abs(holeD) - 0.0045, abs(tun - 0.025) - 0.007);

    float R    = 0.5 * CELL;
    vec2  cq   = foldD6(lq.yx) - vec2(0.57735 * (R - 0.05), R - 0.05);
    float cols = length(cq) - 0.06;

    float outer = max(min(crystal, cols), -(tun - 0.42));
    float d     = min(outer, shell);
    gMat        = shell < outer ? 1.0 : 0.0;
    gCell2      = hash21(wl.zw);

    gEmit = min(max(ring, -(tun - 0.42)), rimE);
    gTrap = trap;
    return d;
}

vec3 calcNormal(vec3 p, float t){
    float h = 0.0004 + 0.0006 * t;
    const vec2 k = vec2(1.0, -1.0);
    return normalize(k.xyy * map(p + k.xyy * h) + k.yyx * map(p + k.yyx * h) +
                     k.yxy * map(p + k.yxy * h) + k.xxx * map(p + k.xxx * h));
}

float calcAO(vec3 p, vec3 n){
    float occ = 0.0, w = 1.0;
    for (int i = 0; i < 5; i++){
        float h = 0.012 + 0.07 * float(i);
        occ += (h - map(p + n * h)) * w;
        w   *= 0.72;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float softShadow(vec3 ro, vec3 rd, float tmax){
    float res = 1.0, t = 0.03;
    for (int i = 0; i < 24; i++){
        float h = map(ro + rd * t);
        res = min(res, 12.0 * h / t);
        t  += clamp(h, 0.02, 0.2);
        if (res < 0.004 || t > tmax) break;
    }
    res = clamp(res, 0.0, 1.0);
    return res * res * (3.0 - 2.0 * res);
}

vec3 ggx(vec3 n, vec3 v, vec3 l, float rough, vec3 F0){
    vec3  h   = normalize(v + l);
    float NoH = max(dot(n, h), 0.0), NoV = max(dot(n, v), 1e-3), NoL = max(dot(n, l), 0.0);
    float a2  = rough * rough; a2 *= a2;
    float dn  = NoH * NoH * (a2 - 1.0) + 1.0;
    float D   = a2 / (PI * dn * dn);
    float k   = (rough + 1.0) * (rough + 1.0) / 8.0;
    float V   = 1.0 / ((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k));
    vec3  F   = F0 + (1.0 - F0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
    return D * V * F * NoL * 0.25;
}

vec3 aces(vec3 x){
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Soft ring on hex emit — wide enough to cover a few cells (no per-hex flicker)
float shellWaveAt(float z, float crestZ){
    float d = abs(z - crestZ);
    return smoothstep(2.4, 0.15, d);
}

float shellWave(float z){
    if (uGarland < 0.5) return 0.0;
    float best = 0.0;
    float n = uPulseCount;
    if (n > 0.5) best = max(best, shellWaveAt(z, uPulseA.x));
    if (n > 1.5) best = max(best, shellWaveAt(z, uPulseA.y));
    if (n > 2.5) best = max(best, shellWaveAt(z, uPulseA.z));
    if (n > 3.5) best = max(best, shellWaveAt(z, uPulseA.w));
    if (n > 4.5) best = max(best, shellWaveAt(z, uPulseB.x));
    if (n > 5.5) best = max(best, shellWaveAt(z, uPulseB.y));
    if (n > 6.5) best = max(best, shellWaveAt(z, uPulseB.z));
    if (n > 7.5) best = max(best, shellWaveAt(z, uPulseB.w));
    return best;
}

vec3 energyCol(float z){ return palEnergy(0.03 * z + 0.05 * gT); }

vec3 fogCol(vec3 rd){ return 0.02 * palEnergy(0.6 + 0.3 * rd.y + 0.03 * gT); }

float march(vec3 ro, vec3 rd, float pix, int steps, float tmax, inout vec3 vol, float volW){
    float t = 0.02, omega = 1.35, prevR = 0.0, stepLen = 0.0;
    float candErr = 1e9, candT = -1.0;
    // Volumetric in-scatter only while the pulse is racing
    float glowMul = uGarland > 0.5 ? 1.0 : 0.0;
    for (int i = 0; i < MAX_STEPS; i++){
        if (i >= steps) break;
        vec3  p  = ro + rd * t;
        float r  = map(p);
        float ar = abs(r);

        if (volW > 0.0 && glowMul > 0.0){
            float e = gEmit;
            float wave = shellWave(p.z);
            vol += volW * energyCol(p.z) * (0.55 + wave * 3.2)
                   * 0.0004 / (0.0004 + e * e * 300.0)
                   * exp(-0.07 * t) * min(ar, 0.15) * 0.6;
        }

        bool fail = omega > 1.0 && (ar + prevR) < stepLen;
        if (fail){ stepLen -= omega * stepLen; omega = 1.0; }
        else     { stepLen  = r * omega; }
        prevR = ar;

        float err = ar / t;
        if (!fail && err < candErr){ candErr = err; candT = t; }
        if (!fail && err < pix) return t;
        t += stepLen;
        if (t > tmax) break;
    }
    return candErr < pix * 4.0 ? candT : -1.0;
}

vec3 shade(vec3 p, vec3 n, vec3 rd, float t, bool full, out vec3 F0out, out float roughOut){
    map(p);
    float trap = gTrap, cid = gCid, mat = gMat, emit = gEmit;

    vec3  alb;
    float rough;
    vec3  F0;
    if (mat < 0.5){
        alb   = palCrystal(0.22 * log(1.0 + trap) + 0.35 * cid + 0.04 * p.z);
        alb   = mix(alb, alb * alb, 0.4);
        rough = 0.22;
        F0    = mix(vec3(0.04), alb, 0.55);
    } else {
        alb   = vec3(0.02, 0.02, 0.028);
        rough = 0.30;
        F0    = vec3(0.16, 0.15, 0.17);
    }
    F0out = F0; roughOut = rough;

    vec3 v = -rd;

    vec3  lp  = vec3(path(gCamZ + 2.2), gCamZ + 2.2);
    vec3  lv  = lp - p;
    float ld2 = dot(lv, lv);
    vec3  l   = lv * inversesqrt(ld2);
    float att = 1.8 / (1.0 + ld2 * 0.9);
    float sh  = full ? softShadow(p + n * 0.004, l, sqrt(ld2)) : 1.0;
    float ao  = full ? calcAO(p, n) : 0.6;
    float dif = max(dot(n, l), 0.0);

    vec3 lc  = mix(vec3(1.0, 0.9, 0.8), energyCol(gCamZ + 4.0), 0.35);
    vec3 col = alb * (1.0 - F0) * dif * att * sh * lc / PI * 3.0;
    col     += ggx(n, v, l, rough, F0) * att * sh * lc * (mat < 0.5 ? 1.2 : 0.18);

    col += alb * ao * (0.06 + 0.06 * n.y) * energyCol(p.z + 3.0);

    // Hex emit: iridescent idle garland + brighter traveling crest
    float em = smoothstep(0.003 + 0.002 * t, 0.0, emit);
    if (uGarland > 0.5) {
        float wave = shellWave(p.z);
        vec3 ec = energyCol(p.z + 6.0 * gCell2);
        col += em * ec * (1.15 + wave * 5.0) * 3.0;
    } else {
        col += em * uColor * 3.0;
    }

    return col * mix(0.5, 1.0, ao);
}

vec3 render(vec3 ro, vec3 rd, float pix){
    vec3  vol = vec3(0.0);
    float t   = march(ro, rd, pix, MAX_STEPS, MAX_DIST, vol, 1.0);
    vec3  bg  = fogCol(rd);
    vec3  col = bg;

    if (t > 0.0){
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p, t);
        vec3 F0; float rough;
        col = shade(p, n, rd, t, true, F0, rough);

#if REFLECTIONS
        vec3  rr   = reflect(rd, n);
        vec3  fres = F0 + (1.0 - F0) * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
        vec3  dummy = vec3(0.0);
        float tr   = march(p + n * 0.01, rr, pix * 3.0, 56, 10.0, dummy, 0.0);
        vec3  rc   = fogCol(rr);
        if (tr > 0.0){
            vec3 rp = p + n * 0.01 + rr * tr;
            vec3 rn = calcNormal(rp, tr);
            vec3 f2; float r2;
            rc = shade(rp, rn, rr, tr, false, f2, r2);
            rc = mix(rc, fogCol(rr), 1.0 - exp(-0.05 * tr * tr));
        }
        col += rc * fres * (1.0 - rough) * 0.8;
#endif
        col = mix(col, bg, 1.0 - exp(-0.004 * t * t));
    }
    return col + vol;
}

void main() {
    gT = iTime;
    vec2 fragCoord = vUv * iResolution.xy;

    gCamZ = uCamZ;
    vec3 ro = vec3(path(gCamZ), gCamZ);
    vec3 ta = vec3(path(gCamZ + 1.6), gCamZ + 1.6);
    float bank = 2.2 * (path(gCamZ + 2.0).x - 2.0 * path(gCamZ + 1.0).x + ro.x);
    bank += 0.15 * sin(gT * 0.23);

    vec3 fw = normalize(ta - ro);
    vec3 rt = normalize(cross(fw, vec3(sin(bank), cos(bank), 0.0)));
    vec3 up = cross(rt, fw);
    float fl = 1.35;
    float pix = 1.2 / (iResolution.y * fl);

    vec3 col = vec3(0.0);
    for (int m = 0; m < AA; m++)
    for (int k = 0; k < AA; k++){
        vec2 o  = vec2(float(m), float(k)) / float(AA) - 0.5 / float(AA);
        vec2 uv = (2.0 * (fragCoord + o) - iResolution.xy) / iResolution.y;
        vec3 rd = normalize(uv.x * rt + uv.y * up + fl * fw);
        col += render(ro, rd, pix);
    }
    col /= float(AA * AA);

    vec2 q = fragCoord / iResolution.xy;
    float vig = pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.18);
    col *= mix(vec3(0.55, 0.45, 0.65), vec3(1.0), vig);
    col  = aces(col * 1.1);
    col  = pow(col, vec3(0.4545));
    col += (hash21(fragCoord + fract(gT)) - 0.5) / 255.0;

    gl_FragColor = vec4(col, 1.0);
}
`;
