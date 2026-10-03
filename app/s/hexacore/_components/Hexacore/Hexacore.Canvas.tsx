"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { HexacoreLive } from "./Hexacore.types";
import {
  hexacoreFragmentShader,
  hexacoreVertexShader,
} from "./shaders/hexacore";

type HexacoreCanvasProps = {
  liveRef: RefObject<HexacoreLive>;
};

function HexacoreQuad({ liveRef }: { liveRef: RefObject<HexacoreLive> }) {
  const tint = useMemo(() => new THREE.Color("#c8a0ff"), []);
  const camZ = useRef(0);
  const lastT = useRef(0);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: hexacoreVertexShader,
        fragmentShader: hexacoreFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uCamZ: { value: 0 },
          uColor: { value: new THREE.Color("#c8a0ff") },
          uGarland: { value: 1 },
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

  useFrame(({ clock }) => {
    const m = matRef.current;
    const live = liveRef.current;
    const t = clock.elapsedTime;
    const dt = Math.min(0.05, Math.max(0, t - lastT.current));
    lastT.current = t;

    // Integrate — don’t do camZ = time * speed (that jumps when the slider moves)
    camZ.current += dt * 1.1 * Math.max(0.05, live.flightSpeed);

    m.uniforms.iTime!.value = t;
    m.uniforms.uCamZ!.value = camZ.current;
    m.uniforms.uGarland!.value = live.garland ? 1 : 0;
    tint.set(live.color);
    m.uniforms.uColor!.value.copy(tint);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function HexacoreCanvas({ liveRef }: HexacoreCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      dpr={[1, 1.25]}
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
      <HexacoreQuad liveRef={liveRef} />
    </Canvas>
  );
}
