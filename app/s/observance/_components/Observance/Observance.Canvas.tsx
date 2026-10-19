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
  const lookT = useRef(0);
  const lastT = useRef(0);
  const DEG = Math.PI / 180;
  const motionKick = useRef(createMotionKickState());
  const lookCruise = useRef(createMotionKickState());
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
          uLookT: { value: 0 },
          uCamMode: { value: 0 },
          uYaw: { value: 0 },
          uPitch: { value: 0 },
          uCamBank: { value: 0.5 },
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
      lookT.current = 0;
      lastT.current = 0;
      motionKick.current = createMotionKickState();
      lookCruise.current = createMotionKickState();
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

    // Flight: cruise (Speed) × kick punches (Accel) — shared motionSpeedMul
    const { speedMul: flightMul } = motionSpeedMul({
      cruiseRaw: speedRaw,
      cruiseDrive: live.speedDrive,
      cruiseArmed: reactive && live.speedChannel !== "off",
      kickRaw: accelRaw,
      kickDrive: live.accelDrive,
      kickArmed: reactive && live.accelChannel !== "off",
      kick: motionKick.current,
      dt,
    });
    camZ.current +=
      dt * 1.1 * Math.max(0.05, live.flightSpeed) * flightMul;

    // Cross sway always ticks (amount is uCrossSway in the shader).
    swayT.current += dt;

    // Flex look clock — cruise-only (no kick punches on look)
    const flex = live.cameraMode === "flex";
    const { speedMul: lookMul } = flex
      ? motionSpeedMul({
          cruiseRaw: camAccelRaw,
          cruiseDrive: live.camAccelDrive,
          cruiseArmed: reactive && live.camAccelChannel !== "off",
          kickRaw: 0,
          kickDrive: 0,
          kickArmed: false,
          kick: lookCruise.current,
          dt,
        })
      : { speedMul: 1 };
    if (flex) lookT.current += dt * lookMul;

    const camMode =
      live.cameraMode === "flex" ? 2 : live.cameraMode === "manual" ? 1 : 0;

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
    m.uniforms.uLookT!.value = lookT.current;
    m.uniforms.uCamMode!.value = camMode;
    m.uniforms.uYaw!.value = live.yaw * DEG;
    m.uniforms.uPitch!.value = live.pitch * DEG;
    m.uniforms.uCamBank!.value = Math.max(0, live.cameraBank);
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
