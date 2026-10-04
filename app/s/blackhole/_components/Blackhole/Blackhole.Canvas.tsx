"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
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
import { SCALE_DRIVE_UNIT, type BlackholeLive } from "./Blackhole.types";
import {
  blackholeFragmentShader,
  blackholeVertexShader,
} from "./shaders/blackhole";

type BlackholeCanvasProps = {
  liveRef: RefObject<BlackholeLive>;
  vizRef: RefObject<VizBands>;
};

function BlackholeQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<BlackholeLive>;
  vizRef: RefObject<VizBands>;
}) {
  const yawAcc = useRef(0);
  const holeHue = useRef(0);
  const nebulaHue = useRef(0);
  const holePulse = useRef(createTwinklePulseEnv());
  const nebulaPulse = useRef(createTwinklePulseEnv());
  const lastT = useRef(0);
  const holeColor = useMemo(() => new THREE.Color("#ffcc00"), []);
  const nebulaColor = useMemo(() => new THREE.Color("#4a2a6e"), []);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: blackholeVertexShader,
        fragmentShader: blackholeFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uSize: { value: 0.2 },
          uYaw: { value: 0 },
          uPitch: { value: (2 * Math.PI) / 180 },
          uBeltAngle: { value: 0 },
          uSpeed: { value: 0.2 },
          uHoleColor: { value: new THREE.Color("#ffcc00") },
          uHoleBoost: { value: 0 },
          uNebulaColor: { value: new THREE.Color("#4a2a6e") },
          uNebulaIntensity: { value: 1 },
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

  useFrame(({ clock }) => {
    const m = matRef.current;
    const live = liveRef.current;
    const viz = vizRef.current;
    const t = clock.elapsedTime;
    const dt = Math.min(0.05, Math.max(0, t - lastT.current));
    lastT.current = t;

    const reactive = Boolean(viz?.enabled);
    const holeRaw = reactive ? channelLevel(viz!, live.holeChannel) : 0;
    const yawRaw = reactive ? channelLevel(viz!, live.yawChannel) : 0;
    const nebulaRaw = reactive ? channelLevel(viz!, live.nebulaChannel) : 0;
    const holePunch = drivenLevel(holeRaw, live.holeDrive);
    const yawPunch = drivenLevel(yawRaw, live.yawDrive);
    const nebulaPunch = drivenLevel(nebulaRaw, live.nebulaDrive);

    m.uniforms.iTime!.value = t * Math.max(0.05, live.flightSpeed);

    const holeArmed = reactive && live.holeChannel !== "off";
    const nebulaArmed = reactive && live.nebulaChannel !== "off";
    const scalePunchOn = live.scalePunch && holeArmed;
    const scalePunch = scalePunchOn
      ? drivenLevel(holeRaw, live.scaleDrive * SCALE_DRIVE_UNIT)
      : 0;

    const sizeMul = scalePunchOn ? 0.92 + scalePunch * 0.55 : 1;
    m.uniforms.uSize!.value = Math.max(0.05, live.blackHoleSize * sizeMul);
    const shake = scalePunchOn ? scalePunch : 0;
    m.uniforms.uPitch!.value =
      ((Math.min(179, Math.max(1, live.pitch)) +
        Math.sin(t * 28) * shake * 4) *
        Math.PI) /
      180;
    m.uniforms.uBeltAngle!.value = (live.beltAngle * Math.PI) / 180;
    m.uniforms.uSpeed!.value = Math.max(0.05, live.diskRotationSpeed);

    const yawArmed = reactive && live.yawChannel !== "off";
    const yawMul = yawArmed ? 1 + yawPunch * 1.2 : 1;
    yawAcc.current +=
      dt * live.yawSpeed * yawMul +
      (scalePunchOn ? Math.sin(t * 37) * shake * 0.015 * dt * 60 : 0);
    m.uniforms.uYaw!.value = yawAcc.current;

    if (live.holeTwinkle) {
      holeHue.current = advanceTwinkleHue(
        holeHue.current,
        dt,
        live.holeTwinkleSpeed,
      );
      resolveTwinkleColor(
        holeHue.current,
        live.holeTwinkleS,
        live.holeTwinkleL,
        holeColor,
      );
      if (holeArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          holePulse.current,
          holeRaw,
          live.holeDrive,
          dt,
        );
        pulseTwinkleLight(holeColor, pulseAmt, live.holeDrive);
      }
    } else if (holeArmed) {
      lerpHex(live.holeColor, live.holeColorPeak, holePunch, holeColor);
    } else {
      hexToVec3(live.holeColor, holeColor);
    }
    m.uniforms.uHoleColor!.value.copy(holeColor);
    m.uniforms.uHoleBoost!.value = holeArmed ? holePunch * 0.85 : 0;

    if (!live.nebulaEnabled) {
      m.uniforms.uNebulaIntensity!.value = 0;
    } else {
      if (live.nebulaTwinkle) {
        nebulaHue.current = advanceTwinkleHue(
          nebulaHue.current,
          dt,
          live.nebulaTwinkleSpeed,
        );
        resolveTwinkleColor(
          nebulaHue.current,
          live.nebulaTwinkleS,
          live.nebulaTwinkleL,
          nebulaColor,
        );
        if (nebulaArmed) {
          const pulseAmt = updateTwinklePulseEnv(
            nebulaPulse.current,
            nebulaRaw,
            live.nebulaDrive,
            dt,
          );
          pulseTwinkleLight(nebulaColor, pulseAmt, live.nebulaDrive);
        }
      } else if (nebulaArmed) {
        lerpHex(
          live.nebulaColor,
          live.nebulaColorPeak,
          nebulaPunch,
          nebulaColor,
        );
      } else {
        hexToVec3(live.nebulaColor, nebulaColor);
      }
      m.uniforms.uNebulaColor!.value.copy(nebulaColor);
      const intens = Math.max(0, live.nebulaIntensity);
      m.uniforms.uNebulaIntensity!.value = nebulaArmed
        ? intens * (0.55 + nebulaPunch * 0.9)
        : intens;
    }
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function BlackholeCanvas({
  liveRef,
  vizRef,
}: BlackholeCanvasProps) {
  const dpr = useRenderDpr("blackhole", 1, 1.5);
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
      <BlackholeQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
