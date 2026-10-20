"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { risingEdge } from "@/lib/audioDerive";
import {
  advanceTwinkleHue,
  createTwinklePulseEnv,
  pulseTwinkleLight,
  resolveTwinkleColor,
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
import type { RainbowcrystalLive } from "./Rainbowcrystal.types";
import {
  rainbowcrystalFragmentShader,
  rainbowcrystalVertexShader,
} from "./shaders/rainbowcrystal";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;
const FLICKER_DECAY = 9;
const FLICKER_EDGE = 0.04;
const FLICKER_EDGE_MIN = 0.05;

const MODE_CODE = {
  original: 0,
  twinkle: 1,
  palette: 2,
  flow: 3,
} as const;
/** Deg/sec at speed x1 - same lap rate as twinkle hue (~6s). */
const FLOW_DEG_PER_SEC = 60;

/**
 * Bank-only crawl for normalize(tan(bankT*0.2 + vec3(0,2,5))).
 * Flight (uCrystalT) stays linear; bank angle stretches through the
 * ~180deg flip. Absolute tip rate so audio accel cannot blast past.
 */
const TAN_FLIP_WIDTH = 0.14;
const TAN_FLIP_FLOOR = 0.04;
/** Max bankT/sec at the asymptote tip (ignores speedMul). */
const TAN_FLIP_TIP_RATE = 0.07;
const TAN_PHASE_OFFSETS = [0, 2, 5] as const;

function tanFlipDanger(bankT: number): number {
  const phase = bankT * 0.2;
  let danger = 0;
  for (const off of TAN_PHASE_OFFSETS) {
    const c = Math.abs(Math.cos(phase + off));
    const near = 1 - Math.min(1, c / TAN_FLIP_WIDTH);
    if (near > danger) danger = near;
  }
  // Smoothstep
  return danger * danger * (3 - 2 * danger);
}

type RainbowcrystalCanvasProps = {
  liveRef: RefObject<RainbowcrystalLive>;
  vizRef: RefObject<VizBands>;
};

function RainbowcrystalQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<RainbowcrystalLive>;
  vizRef: RefObject<VizBands>;
}) {
  const tint = useMemo(() => new THREE.Color("#7af0ff"), []);
  const highlight = useMemo(() => new THREE.Color("#ff7ad9"), []);
  const crystalT = useRef(0);
  const bankT = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const flickerEnv = useRef(0);
  const flickerPrev = useRef(0);
  const motionKick = useRef(createMotionKickState());
  const twinkleHue = useRef(0);
  const twinklePulse = useRef(createTwinklePulseEnv());
  const flowPhaseDeg = useRef(0);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rainbowcrystalVertexShader,
        fragmentShader: rainbowcrystalFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          uCrystalT: { value: 0 },
          uBankT: { value: 0 },
          uColor: { value: new THREE.Color("#7af0ff") },
          uHighlight: { value: new THREE.Color("#ff7ad9") },
          uSaturation: { value: 1 },
          uPeakFlicker: { value: 0 },
          uPalettePhase: { value: 0 },
          uColorMode: { value: 0 },
        },
      }),
    [],
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

  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    return registerRuntimeReset("rainbow_crystal", () => {
      crystalT.current = 0;
      bankT.current = 0;
      lastT.current = 0;
      twinkleHue.current = 0;
      flowPhaseDeg.current = 0;
      twinklePulse.current = createTwinklePulseEnv();
    });
  }, []);

  useFrame(({ clock }) => {
    const m = matRef.current;
    const live = liveRef.current;
    const viz = vizRef.current;
    const t = clock.elapsedTime;
    const dt = Math.min(0.05, Math.max(0, t - lastT.current));
    lastT.current = t;

    const reactive = Boolean(viz?.enabled);
    const colorRaw = reactive ? channelLevel(viz!, live.colorChannel) : 0;
    const speedRaw = reactive ? channelLevel(viz!, live.speedChannel) : 0;
    const accelRaw = reactive ? channelLevel(viz!, live.accelChannel) : 0;
    const colorPunch = drivenLevel(colorRaw, live.colorDrive);

    const colorArmed = reactive && live.colorChannel !== "off";
    const mode = live.colorMode;

    const { speedMul } = motionSpeedMul({
      cruiseRaw: speedRaw,
      cruiseDrive: live.speedDrive,
      cruiseArmed: reactive && live.speedChannel !== "off",
      kickRaw: accelRaw,
      kickDrive: live.accelDrive,
      kickArmed: reactive && live.accelChannel !== "off",
      kick: motionKick.current,
      dt,
      // Slightly hungrier than shared defaults — crystal reads audio clearer
      cruiseWeight: 1.2,
      kickWeight: 1.25,
    });
    const step = dt * Math.max(0.05, live.crystalSpeed) * speedMul;
    // Linear flight / cells
    crystalT.current += step;
    // Bank angle only: crawl + hard tip cap (accel can't zip the flip)
    const danger = tanFlipDanger(bankT.current);
    const crawl = 1 - (1 - TAN_FLIP_FLOOR) * danger;
    let bankStep = step * crawl;
    if (danger > 0.02) {
      const tipCap =
        dt *
        (TAN_FLIP_TIP_RATE +
          (1 - danger) * TAN_FLIP_TIP_RATE * 8);
      bankStep = Math.min(bankStep, tipCap);
    }
    bankT.current += bankStep;

    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed ? colorEnv.current : 0;

    const flickerHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (
      risingEdge(
        flickerHit,
        flickerPrev.current,
        FLICKER_EDGE,
        FLICKER_EDGE_MIN,
      )
    ) {
      flickerEnv.current = Math.max(flickerEnv.current, flickerHit);
    }
    flickerEnv.current *= Math.exp(-FLICKER_DECAY * dt);
    if (flickerEnv.current < 0.004) flickerEnv.current = 0;
    flickerPrev.current = flickerHit;

    let peakFlicker = flickerEnv.current;

    let palettePhase = 0;
    if (mode === "flow") {
      const spd = Math.max(0, live.twinkleSpeed);
      if (spd > 0 && dt > 0) {
        flowPhaseDeg.current =
          (flowPhaseDeg.current + dt * FLOW_DEG_PER_SEC * spd) % 360;
      }
      palettePhase = (flowPhaseDeg.current * Math.PI) / 180;
      // Soft audio punch still lifts brightness on the rainbow
    } else if (mode === "twinkle") {
      twinkleHue.current = advanceTwinkleHue(
        twinkleHue.current,
        dt,
        live.twinkleSpeed,
      );
      resolveTwinkleColor(
        twinkleHue.current,
        live.twinkleS,
        live.twinkleL,
        tint,
      );
      if (colorArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          twinklePulse.current,
          colorRaw,
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
        peakFlicker = Math.max(peakFlicker, pulseAmt);
      } else {
        highlight.copy(tint);
      }
    } else if (mode === "palette") {
      if (colorArmed && colorAmt > 0.001) {
        lerpHex(live.color, live.colorPeak, colorAmt, tint);
        hexToVec3(live.colorPeak, highlight);
      } else {
        hexToVec3(live.color, tint);
        hexToVec3(live.colorPeak, highlight);
      }
    } else {
      hexToVec3(live.color, tint);
      hexToVec3(live.colorPeak, highlight);
    }

    m.uniforms.uCrystalT!.value = crystalT.current;
    m.uniforms.uBankT!.value = bankT.current;
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
    m.uniforms.uPeakFlicker!.value = peakFlicker;
    m.uniforms.uPalettePhase!.value = palettePhase;
    m.uniforms.uColorMode!.value = MODE_CODE[mode];
    m.uniforms.uColor!.value.copy(tint);
    m.uniforms.uHighlight!.value.copy(highlight);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function RainbowcrystalCanvas({
  liveRef,
  vizRef,
}: RainbowcrystalCanvasProps) {
  const dpr = useRenderDpr("rainbow_crystal", 1, 1.5);
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
      <RainbowcrystalQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
