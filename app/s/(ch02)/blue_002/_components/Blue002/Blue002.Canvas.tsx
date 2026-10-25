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
import type { Blue002Live } from "./Blue002.types";
import {
  blue002FragmentShader,
  blue002VertexShader,
} from "./shaders/blue002";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;
const FLICKER_DECAY = 9;
const FLICKER_EDGE = 0.04;
const FLICKER_EDGE_MIN = 0.05;
const DEG = Math.PI / 180;

const MODE_CODE = {
  original: 0,
  twinkle: 1,
} as const;

const CAMERA_MODE_CODE = {
  flex: 0,
  manual: 1,
} as const;

type Blue002CanvasProps = {
  liveRef: RefObject<Blue002Live>;
  vizRef: RefObject<VizBands>;
};

function Blue002Quad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<Blue002Live>;
  vizRef: RefObject<VizBands>;
}) {
  const tint = useMemo(() => new THREE.Color("#004db3"), []);
  const highlight = useMemo(() => new THREE.Color("#c8e8ff"), []);
  const flyT = useRef(0);
  const lookT = useRef(0);
  const lastT = useRef(0);
  const colorEnv = useRef(0);
  const colorPrev = useRef(0);
  const flickerEnv = useRef(0);
  const flickerPrev = useRef(0);
  const motionKick = useRef(createMotionKickState());
  const lookCruise = useRef(createMotionKickState());
  const twinkleHue = useRef(0);
  const twinklePulse = useRef(createTwinklePulseEnv());

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: blue002VertexShader,
        fragmentShader: blue002FragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          uFlyT: { value: 0 },
          uLookT: { value: 0 },
          uYaw: { value: 0 },
          uPitch: { value: 0 },
          uCamBank: { value: 0.5 },
          uCamMode: { value: 0 },
          uColor: { value: new THREE.Color("#004db3") },
          uHighlight: { value: new THREE.Color("#c8e8ff") },
          uSaturation: { value: 1 },
          uPeakFlicker: { value: 0 },
          uColorMode: { value: 0 },
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
    return registerRuntimeReset("blue_002", () => {
      flyT.current = 0;
      lookT.current = 0;
      lastT.current = 0;
      twinkleHue.current = 0;
      colorEnv.current = 0;
      flickerEnv.current = 0;
      twinklePulse.current = createTwinklePulseEnv();
      motionKick.current = createMotionKickState();
      lookCruise.current = createMotionKickState();
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
    const speedRaw = reactive ? channelLevel(viz!, live.speedChannel) : 0;
    const accelRaw = reactive ? channelLevel(viz!, live.accelChannel) : 0;
    const camAccelRaw = reactive
      ? channelLevel(viz!, live.camAccelChannel)
      : 0;
    const colorPunch = drivenLevel(colorRaw, live.colorDrive);
    const colorArmed = reactive && live.colorChannel !== "off";
    const mode = live.colorMode;
    const flex = live.cameraMode === "flex";

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

    const camArmed = reactive && live.camAccelChannel !== "off";
    const { speedMul: lookMul } = flex
      ? motionSpeedMul({
          cruiseRaw: camAccelRaw,
          cruiseDrive: live.camAccelDrive,
          cruiseArmed: camArmed,
          cruiseWeight: 2.4,
          kickRaw: camAccelRaw,
          kickDrive: live.camAccelDrive,
          kickArmed: camArmed,
          kickWeight: 1.6,
          kick: lookCruise.current,
          dt,
        })
      : { speedMul: 1 };
    if (flex) lookT.current += dt * lookMul;

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

    if (mode === "twinkle") {
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
      if (colorArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          twinklePulse.current,
          colorRaw,
          live.colorDrive,
          dt,
        );
        pulseTwinkleLight(tint, pulseAmt, live.colorDrive);
        highlight.copy(tint);
        pulseTwinkleLight(
          highlight,
          Math.min(1, pulseAmt * 1.15),
          live.colorDrive,
        );
        peakFlicker = Math.max(peakFlicker, pulseAmt);
      } else {
        highlight.copy(tint);
      }
    } else if (colorArmed && colorAmt > 0.001) {
      lerpHex(live.color, live.colorPeak, colorAmt, tint);
      hexToVec3(live.colorPeak, highlight);
      peakFlicker = Math.max(peakFlicker, colorAmt);
    } else {
      hexToVec3(live.color, tint);
      hexToVec3(live.colorPeak, highlight);
    }

    m.uniforms.uFlyT!.value = flyT.current;
    m.uniforms.uLookT!.value = lookT.current;
    m.uniforms.uYaw!.value = live.yaw * DEG;
    m.uniforms.uPitch!.value = live.pitch * DEG;
    m.uniforms.uCamBank!.value = Math.max(0, live.cameraBank);
    m.uniforms.uCamMode!.value = CAMERA_MODE_CODE[live.cameraMode];
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
    m.uniforms.uPeakFlicker!.value = peakFlicker;
    m.uniforms.uColorMode!.value = MODE_CODE[mode];
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

export default function Blue002Canvas({ liveRef, vizRef }: Blue002CanvasProps) {
  const dpr = useRenderDpr("blue_002", 1, 1.5);
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
      <Blue002Quad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
