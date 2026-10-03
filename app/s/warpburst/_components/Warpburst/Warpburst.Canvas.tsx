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

/** Peak flicker envelope — snappy punch, quick fade. */
const FLICKER_DECAY = 9;
const FLICKER_EDGE = 0.04;
const FLICKER_EDGE_MIN = 0.05;

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
  const tint = useMemo(() => new THREE.Color("#c200ff"), []);
  const highlight = useMemo(() => new THREE.Color("#8200ff"), []);
  const camZ = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const flickerEnv = useRef(0);
  const flickerPrev = useRef(0);
  const twinkleHue = useRef(0);
  const twinklePulse = useRef(createTwinklePulseEnv());

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
          uCamBank: { value: 0.5 },
          uColor: { value: new THREE.Color("#c200ff") },
          uHighlight: { value: new THREE.Color("#8200ff") },
          uTwinkle: { value: 0 },
          uSaturation: { value: 1 },
          uDetail: { value: 4 },
          uPeakFlicker: { value: 0 },
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

    // Color impulse (idle→peak path when twinkle off)
    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed ? colorEnv.current : 0;

    // Peak flicker — rising-edge punch on the color channel
    const flickerHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (
      risingEdge(
        flickerHit,
        flickerPrev.current,
        FLICKER_EDGE,
        FLICKER_EDGE_MIN,
      )
    ) {
      flickerEnv.current = Math.max(flickerEnv.current, flickerHit);
    }
    flickerEnv.current *= Math.exp(-FLICKER_DECAY * dt);
    if (flickerEnv.current < 0.004) flickerEnv.current = 0;
    flickerPrev.current = flickerHit;

    let peakFlicker = flickerEnv.current;

    if (live.twinkle) {
      twinkleHue.current = advanceTwinkleHue(
        twinkleHue.current,
        dt,
        live.twinkleSpeed,
      );
      resolveTwinkleColor(
        twinkleHue.current,
        live.twinkleS,
        live.twinkleL,
        tint,
      );
      const pulseAmt = colorArmed
        ? updateTwinklePulseEnv(
            twinklePulse.current,
            colorRaw,
            live.colorDrive,
            dt,
          )
        : 0;
      if (colorArmed) {
        pulseTwinkleLight(tint, pulseAmt, live.colorDrive);
        highlight.copy(tint);
        pulseTwinkleLight(
          highlight,
          Math.min(1, pulseAmt * 1.08),
          live.colorDrive,
        );
        // Same standardized pulse drives fog peak flash
        peakFlicker = Math.max(peakFlicker, pulseAmt);
      } else {
        highlight.copy(tint);
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
    m.uniforms.uTwinkle!.value = live.twinkle ? 1 : 0;
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
    m.uniforms.uDetail!.value = Math.max(0, live.fogDetail);
    m.uniforms.uPeakFlicker!.value = peakFlicker;
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
