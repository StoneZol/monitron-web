"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    neonSunFlashFragmentShader,
    neonSunFragmentShader,
    neonSunVertexShader,
} from "./shaders/neonsun";
import { channelLevel, hueWalkHex, lerpHex } from "./Synthwave.audio";
import { DEPTH_MIN, roadDepth, Z_PAD } from "./Synthwave.constants";
import type { SynthwaveLive } from "./Synthwave.types";

export function NeonSun({
    liveRef,
    vizRef,
    groupRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
    groupRef: RefObject<THREE.Group | null>;
}) {
    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: neonSunVertexShader,
                fragmentShader: neonSunFragmentShader,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                blending: THREE.NormalBlending,
                uniforms: {
                    uTime: { value: 0 },
                    uDiskBrightness: { value: 1 },
                    uGlowBrightness: { value: 1 },
                    uGradientStart: { value: 0.75 },
                    uColorSunTop: { value: new THREE.Color(1, 0.85, 0.05) },
                    uColorSunBottom: { value: new THREE.Color(1, 0.3, 0.64) },
                },
            }),
        [],
    );
    const flashMat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: neonSunVertexShader,
                fragmentShader: neonSunFlashFragmentShader,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                uniforms: {
                    uTime: { value: 0 },
                    uOpacity: { value: 0 },
                    uGradientStart: { value: 0.75 },
                    uColorSunTop: { value: new THREE.Color(1, 0.85, 0.05) },
                    uColorSunBottom: { value: new THREE.Color(1, 0.3, 0.64) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);
    const flashMatRef = useRef(flashMat);
    const scaleRef = useRef<THREE.Group>(null);
    const diskHue = useRef(0);
    const sunHold = useRef(0);

    useEffect(
        () => () => {
            mat.dispose();
            flashMat.dispose();
        },
        [mat, flashMat],
    );

    useFrame(({ clock }, dt) => {
        const m = matRef.current;
        const flash = flashMatRef.current;
        const knobs = liveRef.current;
        const viz = vizRef.current;
        const t = clock.elapsedTime;
        m.uniforms.uTime!.value = t;
        flash.uniforms.uTime!.value = t;
        if (!knobs) return;

        const reactive = Boolean(viz?.enabled);
        const sunRaw = reactive ? channelLevel(viz!, knobs.sunChannel) : 0;
        const decay = Math.exp(-Math.max(0, dt) * 5.5);
        sunHold.current = Math.max(sunRaw, sunHold.current * decay);
        const punch = Math.min(1, sunHold.current);

        const sunArmed = reactive && knobs.sunChannel !== "off";
        const idle = sunArmed && !knobs.sunTwinkle ? 0.58 : 1;
        m.uniforms.uDiskBrightness!.value = knobs.sunBrightness * idle;
        m.uniforms.uGlowBrightness!.value =
            knobs.sunGlowBrightness * (sunArmed ? 0.55 + punch * 0.45 : 1);
        m.uniforms.uGradientStart!.value = knobs.sunGradientStart;
        flash.uniforms.uGradientStart!.value = knobs.sunGradientStart;

        const overdrive = Math.max(0, Math.min(1, (knobs.sunBrightness - 1) / 2));
        flash.uniforms.uOpacity!.value = sunArmed
            ? Math.min(1, punch * 0.9 + overdrive * 0.3)
            : overdrive * 0.45;

        const step = knobs.colorSpeed * Math.max(0, dt);
        const top = m.uniforms.uColorSunTop!.value as THREE.Color;
        const bottom = m.uniforms.uColorSunBottom!.value as THREE.Color;
        const flashTop = flash.uniforms.uColorSunTop!.value as THREE.Color;
        const flashBottom = flash.uniforms.uColorSunBottom!.value as THREE.Color;

        if (knobs.sunTwinkle) {
            diskHue.current = (diskHue.current + step) % 360;
            const off = diskHue.current;
            hueWalkHex(knobs.sunRim, off, top);
            hueWalkHex(knobs.sunMid, off, bottom);
        } else {
            diskHue.current = 0;
            const level = sunArmed ? punch : 0;
            lerpHex(knobs.sunRim, knobs.sunRimPeak, level, top);
            lerpHex(knobs.sunMid, knobs.sunMidPeak, level, bottom);
        }
        flashTop.copy(top);
        flashBottom.copy(bottom);

        const base = 2.4;
        const s = base * knobs.sunSize;
        if (scaleRef.current) scaleRef.current.scale.setScalar(s);

        const depth = roadDepth(knobs.roadLength);
        const zFar = -(depth - Z_PAD);
        if (groupRef.current) {
            groupRef.current.position.set(0, 0.22, zFar - 0.12);
        }
    });

    return (
        <group
            ref={groupRef}
            position={[0, 0.22, -(DEPTH_MIN - Z_PAD) - 0.12]}
            renderOrder={-5}
        >
            <group ref={scaleRef} scale={2.4}>
                <mesh renderOrder={-5} frustumCulled={false}>
                    <planeGeometry args={[1, 1]} />
                    <primitive object={mat} attach="material" />
                </mesh>
                <mesh renderOrder={-4} frustumCulled={false}>
                    <planeGeometry args={[1, 1]} />
                    <primitive object={flashMat} attach="material" />
                </mesh>
            </group>
        </group>
    );
}
