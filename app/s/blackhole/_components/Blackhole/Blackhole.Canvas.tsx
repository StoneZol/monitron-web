"use client";

import { useEffect, useMemo, type RefObject } from "react";
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
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uSize: { value: 0.2 },
          uYaw: { value: 0 },
          uPitch: { value: (2 * Math.PI) / 180 },
          uSpeed: { value: 0.2 },
        },
      }),
    [],
  );

  const { size } = useThree();
  useEffect(() => {
    mat.uniforms.iResolution!.value.set(size.width, size.height, 1);
  }, [mat, size.height, size.width]);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(({ clock }) => {
    const live = liveRef.current;
    const viz = vizRef.current;
    const punch = viz?.enabled
      ? drivenLevel(channelLevel(viz, live.spaceChannel), live.spaceDrive)
      : 0;
    const t = clock.elapsedTime;
    mat.uniforms.iTime!.value =
      t * Math.max(0.05, live.flightSpeed) * (1 + punch * 0.35);
    mat.uniforms.uSize!.value = Math.max(0.05, live.blackHoleSize);
    mat.uniforms.uYaw!.value = t * live.yawSpeed;
    mat.uniforms.uPitch!.value = (live.pitch * Math.PI) / 180;
    mat.uniforms.uSpeed!.value = Math.max(0.05, live.diskRotationSpeed);
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
