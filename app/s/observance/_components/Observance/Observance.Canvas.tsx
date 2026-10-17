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
  drivenLevel,
  hexToVec3,
  lerpHex,
} from "@/lib/visualAudio";
import { useRenderDpr } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import type { ObservanceLive } from "./Observance.types";
import {
  observanceFragmentShader,
  observanceVertexShader,
} from "./shaders/observance";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

type ObservanceCanvasProps = {
  liveRef: RefObject<ObservanceLive>;
  vizRef: RefObject<VizBands>;
};

/** Smooth rate mul only — no rising-edge kicks. */
function smoothRateMul(
  armed: boolean,
  raw: number,
  drive: number,
): number {
  // Weight > 1 so mid drive actually reads on look / flight.
  return armed ? 1 + drivenLevel(raw, drive, 2) * 1.65 : 1;
}

function ObservanceQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<ObservanceLive>;
  vizRef: RefObject<VizBands>;
}) {
  const sunTint = useMemo(() => new THREE.Color("#ffcc88"), []);
  const baseTint = useMemo(() => new THREE.Color("#ffcc88"), []);
  const camZ = useRef(0);
  const swayT = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const sunHue = useRef(0);
  const sunPulse = useRef(createTwinklePulseEnv());
  const baseHue = useRef(0);
  const basePulse = useRef(createTwinklePulseEnv());

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: observanceVertexShader,
        fragmentShader: observanceFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uCamZ: { value: 0 },
          uSwayT: { value: 0 },
          uCrossesAir: { value: 0 },
          uCrossesFlip: { value: 0 },
          uCrossBaseLight: { value: 0 },
          uCrossBaseColor: { value: new THREE.Color("#ffcc88") },
          uCrossSway: { value: 1 },
          uLightningRate: { value: 0.2 },
          uSunColor: { value: new THREE.Color("#ffcc88") },
        },
      }),
    [],
  );
  const matRef = useRef(mat);

  const { size } = useThree();
  useEffect(() => {
    matRef.current.uniforms.iResolution!.value.set(size.width, size.height, 1);
  }, [size.height, size.width]);

  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    return registerRuntimeReset("observance", () => {
      camZ.current = 0;
      swayT.current = 0;
      lastT.current = 0;
      sunHue.current = 0;
      sunPulse.current = createTwinklePulseEnv();
      baseHue.current = 0;
      basePulse.current = createTwinklePulseEnv();
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
    const camAccelRaw = reactive
      ? channelLevel(viz!, live.camAccelChannel)
      : 0;
    const colorPunch = drivenLevel(colorRaw, live.colorDrive);

    const colorArmed = reactive && live.colorChannel !== "off";

    // Flight: smooth rate only (Speed × Accel). No kick triggers.
    const flightMul =
      smoothRateMul(
        reactive && live.speedChannel !== "off",
        speedRaw,
        live.speedDrive,
      ) *
      smoothRateMul(
        reactive && live.accelChannel !== "off",
        accelRaw,
        live.accelDrive,
      );
    camZ.current +=
      dt * 1.1 * Math.max(0.05, live.flightSpeed) * flightMul;

    // Look clock: Cam accel scales how fast cross-sway animates.
    const lookMul = smoothRateMul(
      reactive && live.camAccelChannel !== "off",
      camAccelRaw,
      live.camAccelDrive,
    );
    swayT.current += dt * lookMul;

    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed ? colorEnv.current : 0;

    if (live.sunTwinkle) {
      sunHue.current = advanceTwinkleHue(
        sunHue.current,
        dt,
        live.sunTwinkleSpeed,
      );
      resolveTwinkleColor(
        sunHue.current,
        live.sunTwinkleS,
        live.sunTwinkleL,
        sunTint,
      );
      if (colorArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          sunPulse.current,
          colorRaw,
          live.colorDrive,
          dt,
        );
        pulseTwinkleLight(sunTint, pulseAmt, live.colorDrive);
      }
    } else if (colorArmed && colorAmt > 0.001) {
      lerpHex(live.sunColor, live.sunColorPeak, colorAmt, sunTint);
    } else {
      hexToVec3(live.sunColor, sunTint);
    }

    const baseMode = live.crossBaseLightMode;
    const baseOn = baseMode !== "off";
    if (baseMode === "sun") {
      baseTint.copy(sunTint);
    } else if (baseMode === "custom") {
      if (colorArmed && colorAmt > 0.001) {
        lerpHex(
          live.crossBaseColor,
          live.crossBaseColorPeak,
          colorAmt,
          baseTint,
        );
      } else {
        hexToVec3(live.crossBaseColor, baseTint);
      }
    } else if (baseMode === "twinkle") {
      baseHue.current = advanceTwinkleHue(
        baseHue.current,
        dt,
        live.crossBaseTwinkleSpeed,
      );
      resolveTwinkleColor(
        baseHue.current,
        live.crossBaseTwinkleS,
        live.crossBaseTwinkleL,
        baseTint,
      );
      if (colorArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          basePulse.current,
          colorRaw,
          live.colorDrive,
          dt,
        );
        pulseTwinkleLight(baseTint, pulseAmt, live.colorDrive);
      }
    }

    m.uniforms.iTime!.value = t;
    m.uniforms.uCamZ!.value = camZ.current;
    m.uniforms.uSwayT!.value = swayT.current;
    m.uniforms.uCrossesAir!.value = live.crossesAir ? 1 : 0;
    m.uniforms.uCrossesFlip!.value = live.crossesFlip ? 1 : 0;
    m.uniforms.uCrossBaseLight!.value = baseOn ? 1 : 0;
    m.uniforms.uCrossBaseColor!.value.copy(baseTint);
    m.uniforms.uCrossSway!.value = live.crossSway;
    m.uniforms.uLightningRate!.value = live.lightningRate;
    m.uniforms.uSunColor!.value.copy(sunTint);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function ObservanceCanvas({
  liveRef,
  vizRef,
}: ObservanceCanvasProps) {
  const dpr = useRenderDpr("observance", 1, 1.25);
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
      <ObservanceQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
