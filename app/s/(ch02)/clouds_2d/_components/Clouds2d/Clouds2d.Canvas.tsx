"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRenderDpr } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import { deviceHourFloat, type Clouds2dLive } from "./Clouds2d.types";
import {
  clouds2dFragmentShader,
  clouds2dVertexShader,
} from "./shaders/clouds2d";

type Clouds2dCanvasProps = {
  liveRef: RefObject<Clouds2dLive>;
};

function Clouds2dQuad({ liveRef }: { liveRef: RefObject<Clouds2dLive> }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: clouds2dVertexShader,
        fragmentShader: clouds2dFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uFlightSpeed: { value: 1 },
          uCover: { value: 0.2 },
          uOvercast: { value: 0 },
          uHour: { value: 12 },
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
    return registerRuntimeReset("clouds_2d", () => {
      matRef.current.uniforms.iTime!.value = 0;
    });
  }, []);

  useFrame(({ clock }) => {
    const live = liveRef.current;
    const m = matRef.current;
    m.uniforms.iTime!.value = clock.elapsedTime;
    m.uniforms.uFlightSpeed!.value = Math.max(0, live.flightSpeed);
    m.uniforms.uCover!.value = live.cover;
    m.uniforms.uOvercast!.value = live.overcast;
    m.uniforms.uHour!.value = live.syncDeviceTime
      ? deviceHourFloat()
      : live.hour;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function Clouds2dCanvas({ liveRef }: Clouds2dCanvasProps) {
  const dpr = useRenderDpr("clouds_2d", 1, 1.5);
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
        gl.setClearColor("#87b8e8");
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <Clouds2dQuad liveRef={liveRef} />
    </Canvas>
  );
}
