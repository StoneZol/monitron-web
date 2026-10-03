"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    channelLevel,
    drivenLevel,
    hexToVec3,
    hueWalkHex,
    lerpHex,
    pulseBrightness,
} from "./Blackhole.audio";
import { SCALE_DRIVE_UNIT, type BlackholeLive } from "./Blackhole.types";
import {
    blackholeFragmentShader,
    blackholeVertexShader,
} from "./shaders/blackhole";

type BlackholeCanvasProps = {
    liveRef: RefObject<BlackholeLive>;
    vizRef: RefObject<VizBands>;
};

function BlackholeQuad({
    liveRef,
    vizRef,
}: {
    liveRef: RefObject<BlackholeLive>;
    vizRef: RefObject<VizBands>;
}) {
    const yawAcc = useRef(0);
    const holeHueOff = useRef(0);
    const nebulaHueOff = useRef(0);
    const lastT = useRef(0);
    const holeColor = useMemo(() => new THREE.Color("#ffcc00"), []);
    const nebulaColor = useMemo(() => new THREE.Color("#4a2a6e"), []);

    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: blackholeVertexShader,
                fragmentShader: blackholeFragmentShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    iResolution: { value: new THREE.Vector3(1, 1, 1) },
                    iTime: { value: 0 },
                    uSize: { value: 0.2 },
          uYaw: { value: 0 },
          uPitch: { value: (2 * Math.PI) / 180 },
          uBeltAngle: { value: 0 },
          uSpeed: { value: 0.2 },
                    uHoleColor: { value: new THREE.Color("#ffcc00") },
                    uHoleBoost: { value: 0 },
                    uNebulaColor: { value: new THREE.Color("#4a2a6e") },
                    uNebulaIntensity: { value: 1 },
                },
            }),
        [],
    );

    const { size } = useThree();
    useEffect(() => {
        mat.uniforms.iResolution!.value.set(size.width, size.height, 1);
    }, [mat, size.height, size.width]);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }) => {
        const live = liveRef.current;
        const viz = vizRef.current;
        const t = clock.elapsedTime;
        const dt = Math.min(0.05, Math.max(0, t - lastT.current));
        lastT.current = t;

        const reactive = Boolean(viz?.enabled);
        const holeRaw = reactive ? channelLevel(viz!, live.holeChannel) : 0;
        const yawRaw = reactive ? channelLevel(viz!, live.yawChannel) : 0;
        const nebulaRaw = reactive ? channelLevel(viz!, live.nebulaChannel) : 0;
        const holePunch = drivenLevel(holeRaw, live.holeDrive);
        const yawPunch = drivenLevel(yawRaw, live.yawDrive);
        const nebulaPunch = drivenLevel(nebulaRaw, live.nebulaDrive);

        mat.uniforms.iTime!.value = t * Math.max(0.05, live.flightSpeed);

        const holeArmed = reactive && live.holeChannel !== "off";
        const nebulaArmed = reactive && live.nebulaChannel !== "off";
        const scalePunchOn = live.scalePunch && holeArmed;
        const scalePunch = scalePunchOn
            ? drivenLevel(holeRaw, live.scaleDrive * SCALE_DRIVE_UNIT)
            : 0;

        const sizeMul = scalePunchOn ? 0.92 + scalePunch * 0.55 : 1;
        mat.uniforms.uSize!.value = Math.max(0.05, live.blackHoleSize * sizeMul);
        const shake = scalePunchOn ? scalePunch : 0;
        mat.uniforms.uPitch!.value =
            ((live.pitch + Math.sin(t * 28) * shake * 4) * Math.PI) / 180;
        mat.uniforms.uBeltAngle!.value = (live.beltAngle * Math.PI) / 180;
        mat.uniforms.uSpeed!.value = Math.max(0.05, live.diskRotationSpeed);

        const yawArmed = reactive && live.yawChannel !== "off";
        const yawMul = yawArmed ? 1 + yawPunch * 1.2 : 1;
        yawAcc.current +=
            dt * live.yawSpeed * yawMul +
            (scalePunchOn ? Math.sin(t * 37) * shake * 0.015 * dt * 60 : 0);
        mat.uniforms.uYaw!.value = yawAcc.current;

        if (live.holeTwinkle) {
            holeHueOff.current =
                (holeHueOff.current + live.colorSpeed * Math.max(0, dt)) % 360;
            hueWalkHex(live.holeColor, holeHueOff.current, holeColor);
            if (holeArmed) pulseBrightness(holeColor, holePunch);
        } else if (holeArmed) {
            lerpHex(live.holeColor, live.holeColorPeak, holePunch, holeColor);
        } else {
            hexToVec3(live.holeColor, holeColor);
        }
        mat.uniforms.uHoleColor!.value.copy(holeColor);
        mat.uniforms.uHoleBoost!.value = holeArmed ? holePunch * 0.85 : 0;

        if (!live.nebulaEnabled) {
            mat.uniforms.uNebulaIntensity!.value = 0;
        } else {
            if (live.nebulaTwinkle) {
                nebulaHueOff.current =
                    (nebulaHueOff.current + live.colorSpeed * Math.max(0, dt)) % 360;
                hueWalkHex(live.nebulaColor, nebulaHueOff.current, nebulaColor);
                if (nebulaArmed) pulseBrightness(nebulaColor, nebulaPunch);
            } else if (nebulaArmed) {
                lerpHex(
                    live.nebulaColor,
                    live.nebulaColorPeak,
                    nebulaPunch,
                    nebulaColor,
                );
            } else {
                hexToVec3(live.nebulaColor, nebulaColor);
            }
            mat.uniforms.uNebulaColor!.value.copy(nebulaColor);
            const intens = Math.max(0, live.nebulaIntensity);
            mat.uniforms.uNebulaIntensity!.value = nebulaArmed
                ? intens * (0.55 + nebulaPunch * 0.9)
                : intens;
        }
    });

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

export default function BlackholeCanvas({
    liveRef,
    vizRef,
}: BlackholeCanvasProps) {
    return (
        <Canvas
            className="absolute inset-0 h-full w-full"
            dpr={[1, 1.5]}
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
            <BlackholeQuad liveRef={liveRef} vizRef={vizRef} />
        </Canvas>
    );
}
