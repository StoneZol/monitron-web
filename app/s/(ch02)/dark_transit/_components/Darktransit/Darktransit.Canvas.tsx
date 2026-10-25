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
import type { DarktransitLive } from "./Darktransit.types";
import {
  darktransitFragmentShader,
  darktransitVertexShader,
} from "./shaders/darktransit";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

type DarktransitCanvasProps = {
  liveRef: RefObject<DarktransitLive>;
  vizRef: RefObject<VizBands>;
};

function DarktransitQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<DarktransitLive>;
  vizRef: RefObject<VizBands>;
}) {
  const wallTint = useMemo(() => new THREE.Color("#d8dde8"), []);
  const wallPeak = useMemo(() => new THREE.Color("#ffe0b8"), []);
  const orbTint = useMemo(() => new THREE.Color("#3366ff"), []);
  const orbPeak = useMemo(() => new THREE.Color("#c8f0ff"), []);
  const flyT = useRef(0);
  const lastT = useRef(0);
  const wallEnv = useRef(0);
  const wallPrev = useRef(0);
  const orbEnv = useRef(0);
  const orbPrev = useRef(0);
  const motionKick = useRef(createMotionKickState());
  const wallHue = useRef(0);
  const orbHue = useRef(0);
  const wallPulse = useRef(createTwinklePulseEnv());
  const orbPulse = useRef(createTwinklePulseEnv());

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: darktransitVertexShader,
        fragmentShader: darktransitFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          uFlyT: { value: 0 },
          uCinemaBars: { value: 1 },
          uWall: { value: new THREE.Color("#d8dde8") },
          uWallPeak: { value: new THREE.Color("#ffe0b8") },
          uWallMix: { value: 0 },
          uOrb: { value: new THREE.Color("#3366ff") },
          uOrbPeak: { value: new THREE.Color("#c8f0ff") },
          uOrbMix: { value: 0 },
          uSaturation: { value: 1 },
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
    return registerRuntimeReset("dark_transit", () => {
      flyT.current = 0;
      lastT.current = 0;
      wallEnv.current = 0;
      orbEnv.current = 0;
      wallHue.current = 0;
      orbHue.current = 0;
      wallPulse.current = createTwinklePulseEnv();
      orbPulse.current = createTwinklePulseEnv();
      motionKick.current = createMotionKickState();
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
    const wallRaw = reactive ? channelLevel(viz!, live.wallChannel) : 0;
    const orbRaw = reactive ? channelLevel(viz!, live.orbChannel) : 0;
    const speedRaw = reactive ? channelLevel(viz!, live.speedChannel) : 0;
    const accelRaw = reactive ? channelLevel(viz!, live.accelChannel) : 0;

    const { speedMul } = motionSpeedMul({
      cruiseRaw: speedRaw,
      cruiseDrive: live.speedDrive,
      cruiseArmed: reactive && live.speedChannel !== "off",
      kickRaw: accelRaw,
      kickDrive: live.accelDrive,
      kickArmed: reactive && live.accelChannel !== "off",
      kick: motionKick.current,
      dt,
    });
    flyT.current += dt * Math.max(0.05, live.flightSpeed) * speedMul;

    const wallArmed = reactive && live.wallChannel !== "off";
    const orbArmed = reactive && live.orbChannel !== "off";
    const wallPunch = drivenLevel(wallRaw, live.wallDrive);
    const orbPunch = drivenLevel(orbRaw, live.orbDrive);

    const wallHit = wallArmed ? Math.min(1, wallPunch) : 0;
    if (risingEdge(wallHit, wallPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      wallEnv.current = Math.max(wallEnv.current, wallHit);
    }
    wallEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (wallEnv.current < 0.004) wallEnv.current = 0;
    wallPrev.current = wallHit;
    const wallAmt = wallArmed ? wallEnv.current : 0;

    const orbHit = orbArmed ? Math.min(1, orbPunch) : 0;
    if (risingEdge(orbHit, orbPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      orbEnv.current = Math.max(orbEnv.current, orbHit);
    }
    orbEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (orbEnv.current < 0.004) orbEnv.current = 0;
    orbPrev.current = orbHit;
    const orbAmt = orbArmed ? orbEnv.current : 0;

    let wallMix = 0;
    let orbMix = 0;

    if (live.wallTwinkle) {
      wallHue.current = advanceTwinkleHue(
        wallHue.current,
        dt,
        live.wallTwinkleSpeed,
      );
      resolveTwinkleColor(
        wallHue.current,
        live.wallTwinkleS,
        live.wallTwinkleL,
        wallTint,
      );
      if (wallArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          wallPulse.current,
          wallRaw,
          live.wallDrive,
          dt,
        );
        pulseTwinkleLight(wallTint, pulseAmt, live.wallDrive);
        wallPeak.copy(wallTint);
        pulseTwinkleLight(
          wallPeak,
          Math.min(1, pulseAmt * 1.15),
          live.wallDrive,
        );
        wallMix = pulseAmt;
      } else {
        wallPeak.copy(wallTint);
      }
    } else if (wallArmed && wallAmt > 0.001) {
      lerpHex(live.wallColor, live.wallColorPeak, wallAmt, wallTint);
      hexToVec3(live.wallColorPeak, wallPeak);
      wallMix = wallAmt;
    } else {
      hexToVec3(live.wallColor, wallTint);
      hexToVec3(live.wallColorPeak, wallPeak);
    }

    if (live.orbTwinkle) {
      orbHue.current = advanceTwinkleHue(
        orbHue.current,
        dt,
        live.orbTwinkleSpeed,
      );
      resolveTwinkleColor(
        orbHue.current,
        live.orbTwinkleS,
        live.orbTwinkleL,
        orbTint,
      );
      if (orbArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          orbPulse.current,
          orbRaw,
          live.orbDrive,
          dt,
        );
        pulseTwinkleLight(orbTint, pulseAmt, live.orbDrive);
        orbPeak.copy(orbTint);
        pulseTwinkleLight(
          orbPeak,
          Math.min(1, pulseAmt * 1.15),
          live.orbDrive,
        );
        orbMix = pulseAmt;
      } else {
        orbPeak.copy(orbTint);
      }
    } else if (orbArmed && orbAmt > 0.001) {
      lerpHex(live.orbColor, live.orbColorPeak, orbAmt, orbTint);
      hexToVec3(live.orbColorPeak, orbPeak);
      orbMix = orbAmt;
    } else {
      hexToVec3(live.orbColor, orbTint);
      hexToVec3(live.orbColorPeak, orbPeak);
    }

    m.uniforms.uFlyT!.value = flyT.current;
    m.uniforms.uCinemaBars!.value = live.cinemaBars ? 1 : 0;
    m.uniforms.uWall!.value.copy(wallTint);
    m.uniforms.uWallPeak!.value.copy(wallPeak);
    m.uniforms.uWallMix!.value = wallMix;
    m.uniforms.uOrb!.value.copy(orbTint);
    m.uniforms.uOrbPeak!.value.copy(orbPeak);
    m.uniforms.uOrbMix!.value = orbMix;
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function DarktransitCanvas({
  liveRef,
  vizRef,
}: DarktransitCanvasProps) {
  const dpr = useRenderDpr("dark_transit", 1, 1.5);
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
      <DarktransitQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
