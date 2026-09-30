"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    neonSunFragmentShader,
    neonSunVertexShader,
} from "./shaders/neonsun";
import { channelLevel, hexToVec3, hueWalkHex } from "./Synthwave.audio";
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
                    uColorSunTop: { value: new THREE.Color(1, 0.85, 0.05) },
                    uColorSunBottom: { value: new THREE.Color(1, 0.3, 0.64) },
                    uColorSunGlow: { value: new THREE.Color(1, 0, 0.35) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);
    const scaleRef = useRef<THREE.Group>(null);
    const diskHue = useRef(0);
    const glowHue = useRef(0);
    const sunHold = useRef(0);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }, dt) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        const viz = vizRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        if (!knobs) return;

        const reactive = Boolean(viz?.enabled);
        const sunRaw = reactive ? channelLevel(viz!, knobs.sunChannel) : 0;
        const decay = Math.exp(-Math.max(0, dt) * 5.5);
        sunHold.current = Math.max(sunRaw, sunHold.current * decay);
        const punch = Math.min(1, sunHold.current);

        // Idle dim when channel armed; peaks restore slider brightness
        const sunArmed = reactive && knobs.sunChannel !== "off";
        const brightMul = sunArmed ? 0.58 + punch * 0.42 : 1;
        m.uniforms.uDiskBrightness!.value = knobs.sunBrightness * brightMul;
        m.uniforms.uGlowBrightness!.value = knobs.sunGlowBrightness * brightMul;

        const step = knobs.colorSpeed * Math.max(0, dt);

        if (knobs.sunTwinkle) {
            diskHue.current = (diskHue.current + step) % 360;
            const off = diskHue.current;
            hueWalkHex(knobs.sunRim, off, m.uniforms.uColorSunTop!.value);
            hueWalkHex(knobs.sunMid, off, m.uniforms.uColorSunBottom!.value);
        } else {
            diskHue.current = 0;
            hexToVec3(knobs.sunRim, m.uniforms.uColorSunTop!.value);
            hexToVec3(knobs.sunMid, m.uniforms.uColorSunBottom!.value);
        }

        if (knobs.sunGlowTwinkle) {
            glowHue.current = (glowHue.current + step) % 360;
            hueWalkHex(
                knobs.sunCore,
                glowHue.current,
                m.uniforms.uColorSunGlow!.value,
            );
        } else {
            glowHue.current = 0;
            hexToVec3(knobs.sunCore, m.uniforms.uColorSunGlow!.value);
        }

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
            </group>
        </group>
    );
}
