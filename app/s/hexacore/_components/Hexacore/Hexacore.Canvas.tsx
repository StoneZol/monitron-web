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

const PULSE_EDGE = 0.045;
const PULSE_EDGE_MIN = 0.05;
const PULSE_MAX = 8;
const PULSE_SPAWN_AHEAD = 1.5;
/** Visible tunnel is ~MAX_DIST; keep free-run crest inside the view */
const PULSE_VISIBLE_AHEAD = 22;
/** Fired crests coast this far from their spawn Z */
const PULSE_TRAVEL = 56;
const PULSE_WORLD_PER_INTERVAL = 16;

type PulseShot = { z: number; traveled: number };

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
  const waveTint = useMemo(() => new THREE.Color("#c8a0ff"), []);
  const camZ = useRef(0);
  const pulseFree = useRef<PulseShot | null>(null);
  const pulseShots = useRef<PulseShot[]>([]);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const pulsePrev = useRef(0);
  const pulseA = useMemo(() => new THREE.Vector4(0, 0, 0, 0), []);
  const pulseB = useMemo(() => new THREE.Vector4(0, 0, 0, 0), []);

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
          uPulseA: { value: new THREE.Vector4(0, 0, 0, 0) },
          uPulseB: { value: new THREE.Vector4(0, 0, 0, 0) },
          uPulseCount: { value: 0 },
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
    const pulseRaw = reactive ? channelLevel(viz!, live.pulseChannel) : 0;
    const colorPunch = drivenLevel(colorRaw, live.colorDrive);
    const speedPunch = drivenLevel(speedRaw, live.speedDrive);
    const pulsePunch = drivenLevel(pulseRaw, live.pulseDrive);

    const colorArmed = reactive && live.colorChannel !== "off";
    const speedArmed = reactive && live.speedChannel !== "off";
    const pulseArmed = reactive && live.pulseChannel !== "off";

    const speedMul = speedArmed ? 1 + speedPunch * 1.4 : 1;
    camZ.current +=
      dt * 1.1 * Math.max(0.05, live.flightSpeed) * speedMul;

    const interval = Math.max(0.4, live.pulseInterval);
    const waveSpeed = PULSE_WORLD_PER_INTERVAL / interval;
    const dWave = waveSpeed * dt;

    const stepShot = (shot: PulseShot): PulseShot | null => {
      const next = {
        z: shot.z + dWave,
        traveled: shot.traveled + dWave,
      };
      return next.traveled < PULSE_TRAVEL ? next : null;
    };

    const writeSlots = (shots: PulseShot[]) => {
      const slots = [0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < shots.length; i++) slots[i] = shots[i]!.z;
      pulseA.set(slots[0]!, slots[1]!, slots[2]!, slots[3]!);
      pulseB.set(slots[4]!, slots[5]!, slots[6]!, slots[7]!);
      return shots.length;
    };

    const spawnAhead = (): PulseShot => ({
      z: camZ.current + PULSE_SPAWN_AHEAD,
      traveled: 0,
    });

    // Color impulse envelope
    const colorHit = colorArmed ? Math.min(1, colorPunch) : 0;
    if (risingEdge(colorHit, colorPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      colorEnv.current = Math.max(colorEnv.current, colorHit);
    }
    colorEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (colorEnv.current < 0.004) colorEnv.current = 0;
    colorPrev.current = colorHit;
    const colorAmt = colorEnv.current;

    // Shell waves — fire-and-forget in world Z; free-run loops while visible
    let pulseCount = 0;
    if (live.garland) {
      if (!pulseArmed) {
        pulseShots.current = [];
        pulsePrev.current = 0;
        if (!pulseFree.current) pulseFree.current = spawnAhead();
        const advanced = stepShot(pulseFree.current);
        // Respawn when finished OR gone past the visible tunnel ahead of cam
        if (
          !advanced ||
          advanced.z - camZ.current > PULSE_VISIBLE_AHEAD
        ) {
          pulseFree.current = spawnAhead();
        } else {
          pulseFree.current = advanced;
        }
        pulseCount = writeSlots([pulseFree.current]);
      } else {
        pulseFree.current = null;
        const hit = Math.min(1, pulsePunch);
        if (risingEdge(hit, pulsePrev.current, PULSE_EDGE, PULSE_EDGE_MIN)) {
          pulseShots.current.push(spawnAhead());
          if (pulseShots.current.length > PULSE_MAX) {
            pulseShots.current.shift();
          }
        }
        pulsePrev.current = hit;

        const next: PulseShot[] = [];
        for (const shot of pulseShots.current) {
          const advanced = stepShot(shot);
          if (advanced) next.push(advanced);
        }
        pulseShots.current = next;
        pulseCount = writeSlots(next);
      }
    } else {
      pulseShots.current = [];
      pulsePrev.current = 0;
      pulseFree.current = null;
    }

    if (live.garland) {
      if (colorArmed && colorAmt > 0.001) {
        hueWalkHex(live.color, colorAmt * 90, tint);
        pulseBrightness(tint, colorAmt);
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
    (m.uniforms.uPulseA!.value as THREE.Vector4).copy(pulseA);
    (m.uniforms.uPulseB!.value as THREE.Vector4).copy(pulseB);
    m.uniforms.uPulseCount!.value = pulseCount;
    m.uniforms.uColor!.value.copy(tint);
    waveTint.set(live.color);
    m.uniforms.uWaveColor!.value.copy(waveTint);
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
