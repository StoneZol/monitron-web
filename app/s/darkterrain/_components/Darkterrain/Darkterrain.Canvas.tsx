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
import type { DarkterrainLive } from "./Darkterrain.types";
import {
  darkterrainFragmentShader,
  darkterrainVertexShader,
} from "./shaders/darkterrain";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

type DarkterrainCanvasProps = {
  liveRef: RefObject<DarkterrainLive>;
  vizRef: RefObject<VizBands>;
};

function DarkterrainQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<DarkterrainLive>;
  vizRef: RefObject<VizBands>;
}) {
  const sunTint = useMemo(() => new THREE.Color("#f2f2f2"), []);
  const camZ = useRef(0);
  const swayT = useRef(0);
  const lastT = useRef(0);
  const motionKick = useRef(createMotionKickState());
  const lookCruise = useRef(createMotionKickState());
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const sunHue = useRef(0);
  const sunPulse = useRef(createTwinklePulseEnv());

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: darkterrainVertexShader,
        fragmentShader: darkterrainFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uCamZ: { value: 0 },
          uSwayT: { value: 0 },
          uCamBank: { value: 0.5 },
          uLightningRate: { value: 0.2 },
          uSunColor: { value: new THREE.Color("#f2f2f2") },
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
    return registerRuntimeReset("darkterrain", () => {
      camZ.current = 0;
      swayT.current = 0;
      lastT.current = 0;
      motionKick.current = createMotionKickState();
      lookCruise.current = createMotionKickState();
      sunHue.current = 0;
      sunPulse.current = createTwinklePulseEnv();
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

    const { speedMul: lookMul } = motionSpeedMul({
      cruiseRaw: camAccelRaw,
      cruiseDrive: live.camAccelDrive,
      cruiseArmed: reactive && live.camAccelChannel !== "off",
      kickRaw: 0,
      kickDrive: 0,
      kickArmed: false,
      kick: lookCruise.current,
      dt,
    });
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

    m.uniforms.iTime!.value = t;
    m.uniforms.uCamZ!.value = camZ.current;
    m.uniforms.uSwayT!.value = swayT.current;
    m.uniforms.uCamBank!.value = live.cameraBank;
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

export default function DarkterrainCanvas({
  liveRef,
  vizRef,
}: DarkterrainCanvasProps) {
  const dpr = useRenderDpr("darkterrain", 1, 1.25);
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
      <DarkterrainQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
