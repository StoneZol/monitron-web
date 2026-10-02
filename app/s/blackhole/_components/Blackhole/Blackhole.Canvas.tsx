"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { channelLevel, drivenLevel } from "./Blackhole.audio";
import type { BlackholeLive } from "./Blackhole.types";
import {
  blackholeFragmentShader,
  blackholeVertexShader,
} from "./shaders/blackhole";

type BlackholeCanvasProps = {
  liveRef: RefObject<BlackholeLive>;
  vizRef: RefObject<VizBands>;
};

const BLACKHOLE_FALLBACK = {
  diskInner: "#ff9a4a",
  diskOuter: "#6a8cff",
  hazeColor: "#ffc28a",
  starTint: "#c8d6ff",
  flightSpeed: 0.35,
  diskSpeed: 0.08,
  steps: 24,
  stepScale: 1,
  ssRadius: 0.3,
  warpAmount: 5,
};

function BlackholeQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<BlackholeLive>;
  vizRef: RefObject<VizBands>;
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: blackholeVertexShader,
        fragmentShader: blackholeFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uDiskInner: { value: new THREE.Color(BLACKHOLE_FALLBACK.diskInner) },
          uDiskOuter: { value: new THREE.Color(BLACKHOLE_FALLBACK.diskOuter) },
          uHazeColor: { value: new THREE.Color(BLACKHOLE_FALLBACK.hazeColor) },
          uStarTint: { value: new THREE.Color(BLACKHOLE_FALLBACK.starTint) },
          uFlightSpeed: { value: BLACKHOLE_FALLBACK.flightSpeed },
          uDiskSpeed: { value: BLACKHOLE_FALLBACK.diskSpeed },
          uSteps: { value: BLACKHOLE_FALLBACK.steps },
          uStepScale: { value: BLACKHOLE_FALLBACK.stepScale },
          uSsRadius: { value: BLACKHOLE_FALLBACK.ssRadius },
          uWarpAmount: { value: BLACKHOLE_FALLBACK.warpAmount },
          uSpacePunch: { value: 0 },
          uHolePunch: { value: 0 },
        },
      }),
    [],
  );

  const { size } = useThree();
  useEffect(() => {
    mat.uniforms.uResolution!.value.set(size.width, size.height);
  }, [mat, size.height, size.width]);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(({ clock }) => {
    const live = liveRef.current;
    const viz = vizRef.current;
    const u = mat.uniforms;

    u.uTime!.value = clock.elapsedTime;
    (u.uDiskInner!.value as THREE.Color).set(live.diskInner);
    (u.uDiskOuter!.value as THREE.Color).set(live.diskOuter);
    (u.uHazeColor!.value as THREE.Color).set(live.hazeColor);
    (u.uStarTint!.value as THREE.Color).set(live.starTint);
    u.uFlightSpeed!.value = live.flightSpeed;
    u.uDiskSpeed!.value = live.diskSpeed;
    u.uSteps!.value = Math.max(1, Math.min(64, Math.round(live.steps)));
    u.uStepScale!.value = live.stepScale;
    u.uSsRadius!.value = live.ssRadius;
    u.uWarpAmount!.value = live.warpAmount;

    const reactive = Boolean(viz?.enabled);
    const space = reactive
      ? drivenLevel(channelLevel(viz, live.spaceChannel), live.spaceDrive)
      : 0;
    const hole = reactive
      ? drivenLevel(channelLevel(viz, live.holeChannel), live.holeDrive)
      : 0;
    u.uSpacePunch!.value = space;
    u.uHolePunch!.value = hole;
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
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      dpr={[1, 1.5]}
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
