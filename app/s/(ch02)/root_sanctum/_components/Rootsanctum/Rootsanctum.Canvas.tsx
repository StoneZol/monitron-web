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
import { ROOTSANCTUM_TEX, type RootsanctumLive } from "./Rootsanctum.types";
import {
  rootsanctumFragmentShader,
  rootsanctumVertexShader,
} from "./shaders/rootsanctum";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;
const DEG = Math.PI / 180;

const CAMERA_MODE_CODE = {
  flex: 0,
  manual: 1,
} as const;

type RootsanctumCanvasProps = {
  liveRef: RefObject<RootsanctumLive>;
  vizRef: RefObject<VizBands>;
};

function RootsanctumQuad({
  liveRef,
  vizRef,
}: {
  liveRef: RefObject<RootsanctumLive>;
  vizRef: RefObject<VizBands>;
}) {
  const wallTint = useMemo(() => new THREE.Color("#99e619"), []);
  const wallPeak = useMemo(() => new THREE.Color("#ffe6a0"), []);
  const lightTint = useMemo(() => new THREE.Color("#fff2d6"), []);
  const lightPeak = useMemo(() => new THREE.Color("#9bfff0"), []);
  const flyT = useRef(0);
  const lookT = useRef(0);
  const lastT = useRef(0);
  const wallEnv = useRef(0);
  const wallPrev = useRef(0);
  const lightEnv = useRef(0);
  const lightPrev = useRef(0);
  const motionKick = useRef(createMotionKickState());
  const lookCruise = useRef(createMotionKickState());
  const wallHue = useRef(0);
  const lightHue = useRef(0);
  const wallPulse = useRef(createTwinklePulseEnv());
  const lightPulse = useRef(createTwinklePulseEnv());

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rootsanctumVertexShader,
        fragmentShader: rootsanctumFragmentShader,
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
          iChannel0: { value: null },
          uWall: { value: new THREE.Color("#99e619") },
          uWallPeak: { value: new THREE.Color("#ffe6a0") },
          uWallMix: { value: 0 },
          uLight: { value: new THREE.Color("#fff2d6") },
          uLightPeak: { value: new THREE.Color("#9bfff0") },
          uLightMix: { value: 0 },
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

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    let tex: THREE.Texture | null = null;
    loader.load(
      ROOTSANCTUM_TEX,
      (t) => {
        if (!alive) {
          t.dispose();
          return;
        }
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.NoColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.needsUpdate = true;
        tex = t;
        matRef.current.uniforms.iChannel0!.value = t;
      },
      undefined,
      () => {
        /* keep null — blackish without tex */
      },
    );
    return () => {
      alive = false;
      if (tex) tex.dispose();
      matRef.current.uniforms.iChannel0!.value = null;
    };
  }, []);

  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    return registerRuntimeReset("root_sanctum", () => {
      flyT.current = 0;
      lookT.current = 0;
      lastT.current = 0;
      wallEnv.current = 0;
      lightEnv.current = 0;
      wallHue.current = 0;
      lightHue.current = 0;
      wallPulse.current = createTwinklePulseEnv();
      lightPulse.current = createTwinklePulseEnv();
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
    const wallRaw = reactive ? channelLevel(viz!, live.wallChannel) : 0;
    const lightRaw = reactive ? channelLevel(viz!, live.lightChannel) : 0;
    const speedRaw = reactive ? channelLevel(viz!, live.speedChannel) : 0;
    const accelRaw = reactive ? channelLevel(viz!, live.accelChannel) : 0;
    const camAccelRaw = reactive
      ? channelLevel(viz!, live.camAccelChannel)
      : 0;
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

    const wallArmed = reactive && live.wallChannel !== "off";
    const lightArmed = reactive && live.lightChannel !== "off";
    const wallPunch = drivenLevel(wallRaw, live.wallDrive);
    const lightPunch = drivenLevel(lightRaw, live.lightDrive);

    const wallHit = wallArmed ? Math.min(1, wallPunch) : 0;
    if (risingEdge(wallHit, wallPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      wallEnv.current = Math.max(wallEnv.current, wallHit);
    }
    wallEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (wallEnv.current < 0.004) wallEnv.current = 0;
    wallPrev.current = wallHit;
    const wallAmt = wallArmed ? wallEnv.current : 0;

    const lightHit = lightArmed ? Math.min(1, lightPunch) : 0;
    if (risingEdge(lightHit, lightPrev.current, COLOR_EDGE, COLOR_EDGE_MIN)) {
      lightEnv.current = Math.max(lightEnv.current, lightHit);
    }
    lightEnv.current *= Math.exp(-COLOR_DECAY * dt);
    if (lightEnv.current < 0.004) lightEnv.current = 0;
    lightPrev.current = lightHit;
    const lightAmt = lightArmed ? lightEnv.current : 0;

    let wallMix = 0;
    let lightMix = 0;

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

    if (live.lightTwinkle) {
      lightHue.current = advanceTwinkleHue(
        lightHue.current,
        dt,
        live.lightTwinkleSpeed,
      );
      resolveTwinkleColor(
        lightHue.current,
        live.lightTwinkleS,
        live.lightTwinkleL,
        lightTint,
      );
      if (lightArmed) {
        const pulseAmt = updateTwinklePulseEnv(
          lightPulse.current,
          lightRaw,
          live.lightDrive,
          dt,
        );
        pulseTwinkleLight(lightTint, pulseAmt, live.lightDrive);
        lightPeak.copy(lightTint);
        pulseTwinkleLight(
          lightPeak,
          Math.min(1, pulseAmt * 1.15),
          live.lightDrive,
        );
        lightMix = pulseAmt;
      } else {
        lightPeak.copy(lightTint);
      }
    } else if (lightArmed && lightAmt > 0.001) {
      lerpHex(live.lightColor, live.lightColorPeak, lightAmt, lightTint);
      hexToVec3(live.lightColorPeak, lightPeak);
      lightMix = lightAmt;
    } else {
      hexToVec3(live.lightColor, lightTint);
      hexToVec3(live.lightColorPeak, lightPeak);
    }

    m.uniforms.uFlyT!.value = flyT.current;
    m.uniforms.uLookT!.value = lookT.current;
    m.uniforms.uYaw!.value = live.yaw * DEG;
    m.uniforms.uPitch!.value = live.pitch * DEG;
    m.uniforms.uCamBank!.value = Math.max(0, live.cameraBank);
    m.uniforms.uCamMode!.value = CAMERA_MODE_CODE[live.cameraMode];
    m.uniforms.uWall!.value.copy(wallTint);
    m.uniforms.uWallPeak!.value.copy(wallPeak);
    m.uniforms.uWallMix!.value = wallMix;
    m.uniforms.uLight!.value.copy(lightTint);
    m.uniforms.uLightPeak!.value.copy(lightPeak);
    m.uniforms.uLightMix!.value = lightMix;
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function RootsanctumCanvas({
  liveRef,
  vizRef,
}: RootsanctumCanvasProps) {
  const dpr = useRenderDpr("root_sanctum", 1, 1.25);
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
      <RootsanctumQuad liveRef={liveRef} vizRef={vizRef} />
    </Canvas>
  );
}
