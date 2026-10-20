"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AUDIO_BAND_COUNT, type VizBands } from "@/lib/audioBus";
import { risingEdge } from "@/lib/audioDerive";
import { channelLevel, drivenLevel } from "@/lib/visualAudio";
import { useRenderDpr } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import type { MusicVisualBarLive } from "./MusicVisualBar.types";
import {
  musicVisualBarFragmentShader,
  musicVisualBarVertexShader,
} from "./shaders/musicvisualbar";

const SPEC_W = 512;

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;

/** Spin kick: snappy inject, medium fall — feels like accel not cruise. */
const SPIN_KICK_DECAY = 5.5;
const SPIN_EDGE = 0.055;
const SPIN_EDGE_MIN = 0.07;

/** Smooth drift: soft heading wander + mild peak cruise. */
const DRIFT_MAX_R = 0.32;
const DRIFT_BASE_SPEED = 0.055;
const DRIFT_PEAK_BOOST = 0.55;
const DRIFT_BOOST_ATTACK = 4.5;
const DRIFT_BOOST_RELEASE = 1.8;
const DRIFT_HEADING_TURN = 0.55;
const DRIFT_RETARGET_MIN = 2.8;
const DRIFT_RETARGET_MAX = 5.5;

type MusicVisualBarCanvasProps = {
  liveRef: RefObject<MusicVisualBarLive>;
  vizRef: RefObject<VizBands>;
};

function packSpectrum(
  out: Uint8Array,
  bands: number[] | undefined,
  enabled: boolean,
) {
  const n = bands?.length ?? 0;
  for (let i = 0; i < SPEC_W; i++) {
    let v = 0;
    if (enabled && n > 0) {
      const t = i / (SPEC_W - 1);
      const f = t * (n - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(n - 1, i0 + 1);
      const frac = f - i0;
      v = bands![i0]! * (1 - frac) + bands![i1]! * frac;
    }
    const b = Math.min(255, Math.max(0, Math.floor(v * 255)));
    const o = i * 4;
    out[o] = b;
    out[o + 1] = b;
    out[o + 2] = b;
    out[o + 3] = 255;
  }
}

function MusicVisualBarQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<MusicVisualBarLive>;
  vizRef: RefObject<VizBands>;
}) {
  const ambientT = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);

  const spinAngle = useRef(0);
  const spinKick = useRef(0);
  const spinPrev = useRef(0);

  const cx = useRef(0);
  const cy = useRef(0);
  const heading = useRef(Math.random() * Math.PI * 2);
  const targetHeading = useRef(heading.current);
  const retargetIn = useRef(3.5);
  const driftBoost = useRef(0);

  const specData = useMemo(() => new Uint8Array(SPEC_W * 4), []);
  const specTex = useMemo(() => {
    const tex = new THREE.DataTexture(
      specData,
      SPEC_W,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [specData]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: musicVisualBarVertexShader,
        fragmentShader: musicVisualBarFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          iChannel0: { value: specTex },
          uBloomGain: { value: 0.9 },
          uStreakGain: { value: 0.32 },
          uHueShift: { value: 0 },
          uColorPunch: { value: 0 },
          uCenter: { value: new THREE.Vector2(0, 0) },
          uSpin: { value: 0 },
        },
      }),
    [specTex],
  );
  const matRef = useRef(mat);

  const { size } = useThree();
  useEffect(() => {
    matRef.current.uniforms.iResolution!.value.set(size.width, size.height, 1);
  }, [size.height, size.width]);

  useEffect(
    () => () => {
      mat.dispose();
      specTex.dispose();
    },
    [mat, specTex],
  );

  useEffect(() => {
    return registerRuntimeReset("music_visual_bar", () => {
      ambientT.current = 0;
      lastT.current = 0;
      colorEnv.current = 0;
      colorPrev.current = 0;
      spinAngle.current = 0;
      spinKick.current = 0;
      spinPrev.current = 0;
      cx.current = 0;
      cy.current = 0;
      heading.current = Math.random() * Math.PI * 2;
      targetHeading.current = heading.current;
      retargetIn.current = 3.5;
      driftBoost.current = 0;
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
    const colorRaw = reactive ? channelLevel(viz!, live.colorChannel) : 0;
    const spinRaw = reactive ? channelLevel(viz!, live.spinChannel) : 0;
    const driftRaw = reactive ? channelLevel(viz!, live.driftChannel) : 0;

    const colorArmed = reactive && live.colorChannel !== "off";
    const spinArmed = reactive && live.spinChannel !== "off";
    const driftArmed = reactive && live.driftChannel !== "off";

    const colorPunch = drivenLevel(colorRaw, live.colorDrive);
    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorArmed ? colorEnv.current : 0;

    // —— Spin: non-linear cruise (pow) + rising-edge kick accel ——
    const spinSense = spinArmed
      ? Math.min(1, drivenLevel(spinRaw, live.spinDrive, 1.5))
      : 0;
    if (risingEdge(spinSense, spinPrev.current, SPIN_EDGE, SPIN_EDGE_MIN)) {
      // ^2.4 punch → quiet hits barely nudge, peaks whip hard
      spinKick.current = Math.max(
        spinKick.current,
        Math.pow(spinSense, 2.4) * (0.8 + live.spinDrive * 0.35),
      );
    }
    spinKick.current *= Math.exp(-SPIN_KICK_DECAY * dt);
    if (spinKick.current < 0.003) spinKick.current = 0;
    spinPrev.current = spinSense;

    const spinCruise = spinArmed
      ? Math.pow(Math.max(0, spinRaw), 1.7) * live.spinDrive * 0.45
      : 0;
    const baseRate = 0.5 * Math.max(0.05, live.flightSpeed);
    const spinRate = baseRate * (1 + spinCruise) + spinKick.current * 4.2;
    spinAngle.current += spinRate * dt;

    // —— Smooth drift: pick a heading, glide; peak channel = mild speed bump ——
    retargetIn.current -= dt;
    if (retargetIn.current <= 0) {
      // New course: ±~50–140° from current so it meanders, not spins in place
      const turn =
        (0.7 + Math.random() * 1.5) *
        (Math.random() < 0.5 ? -1 : 1);
      targetHeading.current = heading.current + turn;
      retargetIn.current =
        DRIFT_RETARGET_MIN +
        Math.random() * (DRIFT_RETARGET_MAX - DRIFT_RETARGET_MIN);
    }

    // Soft boundary: ease heading toward center when near the edge
    const r = Math.hypot(cx.current, cy.current);
    if (r > DRIFT_MAX_R * 0.72) {
      const inward = Math.atan2(-cy.current, -cx.current);
      targetHeading.current = inward;
    }

    let dHead = targetHeading.current - heading.current;
    while (dHead > Math.PI) dHead -= Math.PI * 2;
    while (dHead < -Math.PI) dHead += Math.PI * 2;
    heading.current += dHead * Math.min(1, DRIFT_HEADING_TURN * dt);

    const peakTarget = driftArmed
      ? Math.min(1, drivenLevel(driftRaw, live.driftDrive, 1.2))
      : 0;
    const boostK =
      peakTarget > driftBoost.current
        ? DRIFT_BOOST_ATTACK
        : DRIFT_BOOST_RELEASE;
    driftBoost.current += (peakTarget - driftBoost.current) * (1 - Math.exp(-boostK * dt));

    const speed =
      DRIFT_BASE_SPEED *
      Math.max(0.35, live.flightSpeed) *
      (1 + driftBoost.current * DRIFT_PEAK_BOOST * live.driftDrive * 0.35);

    cx.current += Math.cos(heading.current) * speed * dt;
    cy.current += Math.sin(heading.current) * speed * 0.72 * dt;

    const r2 = Math.hypot(cx.current, cy.current);
    if (r2 > DRIFT_MAX_R) {
      const s = DRIFT_MAX_R / r2;
      cx.current *= s;
      cy.current *= s;
    }

    ambientT.current = t;

    packSpectrum(
      specData,
      viz?.bands,
      reactive && (viz?.bands?.length ?? 0) >= AUDIO_BAND_COUNT,
    );
    if (!reactive) {
      for (let i = 0; i < SPEC_W; i++) {
        const soft = Math.floor(
          (0.08 + 0.04 * Math.sin(t * 1.2 + i * 0.04)) * 255,
        );
        const o = i * 4;
        specData[o] = soft;
        specData[o + 1] = soft;
        specData[o + 2] = soft;
      }
    }
    specTex.needsUpdate = true;

    m.uniforms.iTime!.value = ambientT.current;
    m.uniforms.uBloomGain!.value = live.bloomGain;
    m.uniforms.uStreakGain!.value = live.streakGain;
    m.uniforms.uHueShift!.value = colorAmt * 0.22;
    m.uniforms.uColorPunch!.value = colorAmt;
    m.uniforms.uCenter!.value.set(cx.current, cy.current);
    m.uniforms.uSpin!.value = spinAngle.current;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function MusicVisualBarCanvas({
  liveRef,
  vizRef,
}: MusicVisualBarCanvasProps) {
  const dpr = useRenderDpr("music_visual_bar", 1, 1.25);
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1 }}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <MusicVisualBarQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
