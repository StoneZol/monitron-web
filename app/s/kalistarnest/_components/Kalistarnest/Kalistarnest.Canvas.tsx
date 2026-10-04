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
} from "@/lib/visualAudio";
import type { KalistarnestLive } from "./Kalistarnest.types";
import {
  kalistarnestFragmentShader,
  kalistarnestVertexShader,
} from "./shaders/kalistarnest";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;
const FLICKER_DECAY = 9;
const FLICKER_EDGE = 0.04;
const FLICKER_EDGE_MIN = 0.05;
const SPEED_DECAY = 13;
const SPEED_EDGE = 0.08;
const SPEED_EDGE_MIN = 0.1;
const SPEED_MUL = 0.7;

/** Shader starts at iTime+33 — seed the flight clock the same way */
const FLY_T_SEED = 33;

const DEG = Math.PI / 180;

type KalistarnestCanvasProps = {
  liveRef: RefObject<KalistarnestLive>;
  vizRef: RefObject<VizBands>;
};

function KalistarnestQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<KalistarnestLive>;
  vizRef: RefObject<VizBands>;
}) {
  const starTint = useMemo(() => new THREE.Color("#ff8a5c"), []);
  const starHighlight = useMemo(() => new THREE.Color("#9ec8ff"), []);
  const flyT = useRef(FLY_T_SEED);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const flickerEnv = useRef(0);
  const flickerPrev = useRef(0);
  const speedEnv = useRef(0);
  const speedPrev = useRef(0);
  const starHue = useRef(0);
  const starPulse = useRef(createTwinklePulseEnv());

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: kalistarnestVertexShader,
        fragmentShader: kalistarnestFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          uFlyT: { value: FLY_T_SEED },
          uYaw: { value: 0 },
          uPitch: { value: 0 },
          uCamBank: { value: 0.5 },
          uCamMode: { value: 0 },
          uColorMode: { value: 0 },
          uStarColor: { value: new THREE.Color("#ff8a5c") },
          uStarHighlight: { value: new THREE.Color("#9ec8ff") },
          uSaturation: { value: 1 },
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
    const speedPunch = drivenLevel(speedRaw, live.speedDrive, 1);

    const colorArmed = reactive && live.colorChannel !== "off";
    const speedArmed = reactive && live.speedChannel !== "off";
    const custom = live.colorMode === "custom";

    const speedHit = speedArmed ? Math.min(1, speedPunch) : 0;
    if (
      risingEdge(speedHit, speedPrev.current, SPEED_EDGE, SPEED_EDGE_MIN)
    ) {
      speedEnv.current = Math.max(speedEnv.current, speedHit);
    }
    speedEnv.current *= Math.exp(-SPEED_DECAY * dt);
    if (speedEnv.current < 0.004) speedEnv.current = 0;
    speedPrev.current = speedHit;

    const speedMul = speedArmed ? 1 + speedEnv.current * SPEED_MUL : 1;
    flyT.current += dt * Math.max(0.05, live.flightSpeed) * speedMul;

    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed ? colorEnv.current : 0;

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

    if (custom) {
      if (live.starTwinkle) {
        starHue.current = advanceTwinkleHue(
          starHue.current,
          dt,
          live.starTwinkleSpeed,
        );
        resolveTwinkleColor(
          starHue.current,
          live.starTwinkleS,
          live.starTwinkleL,
          starTint,
        );
        if (colorArmed) {
          const pulseAmt = updateTwinklePulseEnv(
            starPulse.current,
            colorRaw,
            live.colorDrive,
            dt,
          );
          pulseTwinkleLight(starTint, pulseAmt, live.colorDrive);
          starHighlight.copy(starTint);
          pulseTwinkleLight(
            starHighlight,
            Math.min(1, pulseAmt * 1.1),
            live.colorDrive,
          );
          peakFlicker = Math.max(peakFlicker, pulseAmt);
        } else {
          starHighlight.copy(starTint);
        }
      } else if (colorArmed && colorAmt > 0.001) {
        lerpHex(live.starColor, live.starColorPeak, colorAmt, starTint);
        hexToVec3(live.starColorPeak, starHighlight);
      } else {
        hexToVec3(live.starColor, starTint);
        hexToVec3(live.starColorPeak, starHighlight);
      }
    } else {
      hexToVec3(live.starColor, starTint);
      hexToVec3(live.starColorPeak, starHighlight);
    }

    m.uniforms.iTime!.value = t;
    m.uniforms.uFlyT!.value = flyT.current;
    m.uniforms.uYaw!.value = live.yaw * DEG;
    m.uniforms.uPitch!.value = live.pitch * DEG;
    m.uniforms.uCamBank!.value = Math.max(0, live.cameraBank);
    m.uniforms.uCamMode!.value = live.cameraMode === "flex" ? 1 : 0;
    m.uniforms.uColorMode!.value = custom ? 1 : 0;
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
    m.uniforms.uPeakFlicker!.value = peakFlicker;
    m.uniforms.uStarColor!.value.copy(starTint);
    m.uniforms.uStarHighlight!.value.copy(starHighlight);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function KalistarnestCanvas({
  liveRef,
  vizRef,
}: KalistarnestCanvasProps) {
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
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000");
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <KalistarnestQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
