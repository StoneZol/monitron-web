"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { risingEdge } from "@/lib/audioDerive";
import {
  createTwinklePulseEnv,
  pulseTwinkleLight,
  resolveTwinkleColor,
  twinkleHueFromClock,
  twinklePhaseFromClock,
  updateTwinklePulseEnv,
} from "@/lib/twinkleHsl";
import {
  channelLevel,
  createMotionKickState,
  drivenLevel,
  hexToVec3,
  lerpHex,
  motionSpeedMul,
} from "@/lib/visualAudio";
import { useRenderDpr } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import type { StarleidoscopeLive } from "./Starleidoscope.types";
import {
  starleidoscopeFragmentShader,
  starleidoscopeVertexShader,
} from "./shaders/starleidoscope";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

/** Shadertoy-style 1D audio strip width. */
const SPEC_W = 512;

const MODE_CODE = {
  original: 0,
  paletteTwinkle: 1,
  twinkle: 2,
  palette: 3,
} as const;
/** Full HSL hue lap of stock colors ≈ same as twinkle (1 ≈ 6s). */
const PALETTE_PHASE_RAD_PER_SEC = (Math.PI * 2 * 60) / 360;
/**
 * Wall-clock phases must stay small: GPU float32 loses fract/sin precision
 * past ~1e5 (absolute Date.now()/1000 ≈ 1.7e9 → black screen).
 * Wrap period is long vs tunnel/shimmer cycles; same on every Sync tab.
 */
const PHASE_WRAP_SEC = 3600;

function wallClockPhase(speed: number, nowMs = Date.now()): number {
  const s = Math.max(0, speed);
  if (!(s > 0)) return 0;
  const raw = (nowMs / 1000) * s;
  return raw - Math.floor(raw / PHASE_WRAP_SEC) * PHASE_WRAP_SEC;
}

type StarleidoscopeCanvasProps = {
  liveRef: RefObject<StarleidoscopeLive>;
  vizRef: RefObject<VizBands>;
};

/**
 * Pack bus bands into a Shadertoy-like audio strip:
 * R = FFT, G = wave proxy (peak), so stock `.rg` sample works.
 */
function packAudioStrip(
  out: Uint8Array,
  bands: number[] | undefined,
  peak: number,
  enabled: boolean,
) {
  const n = bands?.length ?? 0;
  const wave = enabled
    ? Math.min(255, Math.max(0, Math.floor(peak * 255)))
    : 0;
  for (let i = 0; i < SPEC_W; i++) {
    let v = 0;
    if (enabled && n > 0) {
      const t = i / (SPEC_W - 1);
      const f = t * (n - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(n - 1, i0 + 1);
      const frac = f - i0;
      v = bands![i0]! * (1 - frac) + bands![i1]! * frac;
    }
    const b = Math.min(255, Math.max(0, Math.floor(v * 255)));
    const o = i * 4;
    out[o] = b;
    out[o + 1] = wave;
    out[o + 2] = b;
    out[o + 3] = 255;
  }
}

function StarleidoscopeQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<StarleidoscopeLive>;
  vizRef: RefObject<VizBands>;
}) {
  const tint = useMemo(() => new THREE.Color("#a8c8ff"), []);
  const highlight = useMemo(() => new THREE.Color("#ff88cc"), []);
  /** Local audio excess over wall-clock pattern (Sync-safe base stays Date.now). */
  const patternAudioBoost = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const patternKick = useRef(createMotionKickState());
  const twinklePulse = useRef(createTwinklePulseEnv());

  const specData = useMemo(() => new Uint8Array(SPEC_W * 4), []);
  const specTex = useMemo(() => {
    const tex = new THREE.DataTexture(
      specData,
      SPEC_W,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [specData]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starleidoscopeVertexShader,
        fragmentShader: starleidoscopeFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          uPatternT: { value: 0 },
          uShimmerT: { value: 0 },
          uPalettePhase: { value: 0 },
          uColorMode: { value: 0 },
          uColor: { value: new THREE.Color("#a8c8ff") },
          uHighlight: { value: new THREE.Color("#ff88cc") },
          uColorMix: { value: 0 },
          uSaturation: { value: 1 },
          uSides: { value: 3 },
          uChaos: { value: 0 },
          iChannel0: { value: specTex },
        },
      }),
    [specTex],
  );
  const matRef = useRef(mat);

  const { size } = useThree();
  useEffect(() => {
    matRef.current.uniforms.iResolution!.value.set(
      size.width,
      size.height,
      1,
    );
  }, [size.height, size.width]);

  useEffect(
    () => () => {
      mat.dispose();
      specTex.dispose();
    },
    [mat, specTex],
  );

  useEffect(() => {
    return registerRuntimeReset("starleidoscope", () => {
      patternAudioBoost.current = 0;
      lastT.current = 0;
      colorEnv.current = 0;
      twinklePulse.current = createTwinklePulseEnv();
      patternKick.current = createMotionKickState();
    });
  }, []);

  useFrame(({ clock }) => {
    const m = matRef.current;
    const live = liveRef.current;
    const viz = vizRef.current;
    const t = clock.elapsedTime;
    const rawDt = Math.max(0, t - lastT.current);
    const dt = Math.min(0.05, rawDt);
    lastT.current = t;
    const reactive = Boolean(viz?.enabled);
    // Strip kept for any future stock hooks; star hues are hash-only (Sync-safe).
    packAudioStrip(specData, viz?.bands, viz?.peak ?? 0, reactive);
    specTex.needsUpdate = true;

    const colorRaw = reactive ? channelLevel(viz!, live.colorChannel) : 0;
    const colorAccelRaw = reactive
      ? channelLevel(viz!, live.colorAccelChannel)
      : 0;
    const patternRaw = reactive ? channelLevel(viz!, live.patternChannel) : 0;
    const patternAccelRaw = reactive
      ? channelLevel(viz!, live.patternAccelChannel)
      : 0;

    const patternArmed =
      reactive &&
      (live.patternChannel !== "off" || live.patternAccelChannel !== "off");
    const { speedMul: patternMul } = motionSpeedMul({
      cruiseRaw: patternRaw,
      cruiseDrive: live.patternDrive,
      cruiseArmed: reactive && live.patternChannel !== "off",
      kickRaw: patternAccelRaw,
      kickDrive: live.patternAccelDrive,
      kickArmed: reactive && live.patternAccelChannel !== "off",
      kick: patternKick.current,
      dt,
    });

    // Wall-clock pattern + shimmer (wrapped) so Sync tabs share geometry.
    // Audio only adds a local boost on top; Sync resets that boost.
    const pSpeed = Math.max(0.05, live.patternSpeed);
    if (patternArmed && patternMul !== 1) {
      patternAudioBoost.current += rawDt * pSpeed * (patternMul - 1);
      // Keep boost in wrap range so it can't blow float32 either.
      if (Math.abs(patternAudioBoost.current) > PHASE_WRAP_SEC) {
        patternAudioBoost.current %= PHASE_WRAP_SEC;
      }
    }
    const patternT =
      wallClockPhase(pSpeed) + patternAudioBoost.current;
    const shimmerT = wallClockPhase(1);

    // Hue/phase from wall clock so Sync tabs stay locked (rAF dt drifts).
    // Audio color bands punch lightness only — not phase rate.
    const colorRate = Math.max(0, live.colorSpeed);
    const mode = live.colorMode;
    const colorArmed = reactive && live.colorChannel !== "off";
    const colorPunch = drivenLevel(colorRaw, live.colorDrive);
    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed ? colorEnv.current : 0;

    let colorMix = 0;
    let palettePhase = 0;
    if (mode === "paletteTwinkle") {
      palettePhase = twinklePhaseFromClock(
        PALETTE_PHASE_RAD_PER_SEC,
        colorRate,
      );
    } else if (mode === "twinkle") {
      const hue = twinkleHueFromClock(colorRate);
      resolveTwinkleColor(hue, live.twinkleS, live.twinkleL, tint);
      if (colorArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          twinklePulse.current,
          Math.max(colorRaw, colorAccelRaw),
          live.colorDrive,
          dt,
        );
        pulseTwinkleLight(tint, pulseAmt, live.colorDrive);
        highlight.copy(tint);
        pulseTwinkleLight(
          highlight,
          Math.min(1, pulseAmt * 1.15),
          live.colorDrive,
        );
      } else {
        highlight.copy(tint);
      }
    } else if (mode === "palette") {
      if (colorArmed && colorAmt > 0.001) {
        lerpHex(live.color, live.colorPeak, colorAmt, tint);
        hexToVec3(live.colorPeak, highlight);
        colorMix = colorAmt;
      } else {
        hexToVec3(live.color, tint);
        hexToVec3(live.colorPeak, highlight);
      }
    } else {
      hexToVec3(live.color, tint);
      hexToVec3(live.colorPeak, highlight);
    }

    m.uniforms.uPatternT!.value = patternT;
    m.uniforms.uShimmerT!.value = shimmerT;
    m.uniforms.uPalettePhase!.value = palettePhase;
    m.uniforms.uColorMode!.value = MODE_CODE[mode];
    m.uniforms.uColor!.value.copy(tint);
    m.uniforms.uHighlight!.value.copy(highlight);
    m.uniforms.uColorMix!.value = colorMix;
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
    m.uniforms.uSides!.value = Math.max(3, live.kaleidoSides);
    m.uniforms.uChaos!.value = Math.max(0, Math.min(1, live.kaleidoChaos));
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function StarleidoscopeCanvas({
  liveRef,
  vizRef,
}: StarleidoscopeCanvasProps) {
  const dpr = useRenderDpr("starleidoscope", 1, 1.5);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      dpr={dpr}
      orthographic
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000");
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <StarleidoscopeQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
