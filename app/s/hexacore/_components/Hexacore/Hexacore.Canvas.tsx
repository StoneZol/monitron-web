"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { risingEdge } from "@/lib/audioDerive";
import {
  channelLevel,
  drivenLevel,
  hexToVec3,
  hueWalkHex,
  lerpHex,
  pulseBrightness,
} from "./Hexacore.audio";
import type { HexacoreLive } from "./Hexacore.types";
import {
  hexacoreFragmentShader,
  hexacoreVertexShader,
} from "./shaders/hexacore";

/** Color envelope: snap on rising hits, fall back to idle between punches. */
const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

type HexacoreCanvasProps = {
  liveRef: RefObject<HexacoreLive>;
  vizRef: RefObject<VizBands>;
};

function HexacoreQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<HexacoreLive>;
  vizRef: RefObject<VizBands>;
}) {
  const tint = useMemo(() => new THREE.Color("#c8a0ff"), []);
  const camZ = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);

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
          uWaveColor: { value: new THREE.Color("#c8a0ff") },
          uGarland: { value: 1 },
          uGarlandSpeed: { value: 1 },
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
    const viz = vizRef.current;
    const t = clock.elapsedTime;
    const dt = Math.min(0.05, Math.max(0, t - lastT.current));
    lastT.current = t;

    const reactive = Boolean(viz?.enabled);
    const colorRaw = reactive ? channelLevel(viz!, live.colorChannel) : 0;
    const speedRaw = reactive ? channelLevel(viz!, live.speedChannel) : 0;
    const colorPunch = drivenLevel(colorRaw, live.colorDrive);
    const speedPunch = drivenLevel(speedRaw, live.speedDrive);

    const colorArmed = reactive && live.colorChannel !== "off";
    const speedArmed = reactive && live.speedChannel !== "off";

    const speedMul = speedArmed ? 1 + speedPunch * 1.4 : 1;
    camZ.current +=
      dt * 1.1 * Math.max(0.05, live.flightSpeed) * speedMul;

    // Color impulse envelope
    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    // Garland: follow live level so bass pumps always tint the emit;
    // envelope still adds rising-edge snaps on top.
    const colorAmt = colorArmed
      ? Math.max(
          colorEnv.current,
          live.garland ? Math.min(1, colorPunch) : 0,
        )
      : 0;

    if (live.garland) {
      if (colorArmed && colorAmt > 0.001) {
        hueWalkHex(live.color, colorAmt * 90, tint);
        // Mild boost — don't crush idle shimmer between hits
        pulseBrightness(tint, colorAmt, 0.88);
      } else {
        hexToVec3(live.color, tint);
      }
    } else if (colorArmed && colorAmt > 0.001) {
      lerpHex(live.color, live.colorPeak, colorAmt, tint);
    } else {
      hexToVec3(live.color, tint);
    }

    m.uniforms.iTime!.value = t;
    m.uniforms.uCamZ!.value = camZ.current;
    m.uniforms.uGarland!.value = live.garland ? 1 : 0;
    m.uniforms.uGarlandSpeed!.value = Math.max(0, live.garlandSpeed);
    m.uniforms.uColor!.value.copy(tint);
    // Garland emit palette (palEnergy) reads uWaveColor — must follow audio tint
    m.uniforms.uWaveColor!.value.copy(tint);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function HexacoreCanvas({
  liveRef,
  vizRef,
}: HexacoreCanvasProps) {
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
      <HexacoreQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
