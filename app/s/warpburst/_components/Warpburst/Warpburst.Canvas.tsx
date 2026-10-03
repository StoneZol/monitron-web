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
} from "./Warpburst.audio";
import type { WarpburstLive } from "./Warpburst.types";
import {
  warpburstFragmentShader,
  warpburstVertexShader,
} from "./shaders/warpburst";

/** Color envelope: snap on rising hits, fall back to idle between punches. */
const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

/** Peak twinkle envelope — snappy punch, quick fade. */
const TWINKLE_DECAY = 9;
const TWINKLE_EDGE = 0.04;
const TWINKLE_EDGE_MIN = 0.05;

type WarpburstCanvasProps = {
  liveRef: RefObject<WarpburstLive>;
  vizRef: RefObject<VizBands>;
};

function WarpburstQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<WarpburstLive>;
  vizRef: RefObject<VizBands>;
}) {
  const tint = useMemo(() => new THREE.Color("#4d0099"), []);
  const highlight = useMemo(() => new THREE.Color("#00ffb3"), []);
  const camZ = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const twinkleEnv = useRef(0);
  const twinklePrev = useRef(0);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: warpburstVertexShader,
        fragmentShader: warpburstFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uCamZ: { value: 0 },
          uCamBank: { value: 1 },
          uColor: { value: new THREE.Color("#4d0099") },
          uHighlight: { value: new THREE.Color("#00ffb3") },
          uGarland: { value: 1 },
          uGarlandSpeed: { value: 1 },
          uSaturation: { value: 1 },
          uDetail: { value: 1 },
          uTwinkle: { value: 0 },
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

    // Original: time = iTime * 1.2; ro.z = time * 2.5 → ~3.0 units/sec at ×1
    const speedMul = speedArmed ? 1 + speedPunch * 1.4 : 1;
    camZ.current +=
      dt * 1.2 * Math.max(0.05, live.flightSpeed) * speedMul;

    // Color impulse
    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed
      ? Math.max(
          colorEnv.current,
          live.garland ? Math.min(1, colorPunch) : 0,
        )
      : 0;

    // Peak twinkle — rising-edge flicker on the color channel
    const twinkleHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (
      risingEdge(twinkleHit, twinklePrev.current, TWINKLE_EDGE, TWINKLE_EDGE_MIN)
    ) {
      twinkleEnv.current = Math.max(twinkleEnv.current, twinkleHit);
    }
    twinkleEnv.current *= Math.exp(-TWINKLE_DECAY * dt);
    if (twinkleEnv.current < 0.004) twinkleEnv.current = 0;
    twinklePrev.current = twinkleHit;

    if (live.garland) {
      if (colorArmed && colorAmt > 0.001) {
        hueWalkHex(live.color, colorAmt * 90, tint);
        pulseBrightness(tint, colorAmt, 0.88);
        hueWalkHex(live.colorPeak, colorAmt * 60, highlight);
        pulseBrightness(highlight, colorAmt, 0.9);
      } else {
        hexToVec3(live.color, tint);
        hexToVec3(live.colorPeak, highlight);
      }
    } else if (colorArmed && colorAmt > 0.001) {
      lerpHex(live.color, live.colorPeak, colorAmt, tint);
      hexToVec3(live.colorPeak, highlight);
    } else {
      hexToVec3(live.color, tint);
      hexToVec3(live.colorPeak, highlight);
    }

    m.uniforms.iTime!.value = t;
    m.uniforms.uCamZ!.value = camZ.current;
    m.uniforms.uCamBank!.value = Math.max(0, live.cameraBank);
    m.uniforms.uGarland!.value = live.garland ? 1 : 0;
    m.uniforms.uGarlandSpeed!.value = Math.max(0, live.garlandSpeed);
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
    m.uniforms.uDetail!.value = Math.max(0, live.fogDetail);
    m.uniforms.uTwinkle!.value = twinkleEnv.current;
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

export default function WarpburstCanvas({
  liveRef,
  vizRef,
}: WarpburstCanvasProps) {
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
      <WarpburstQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
