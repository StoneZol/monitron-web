"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
    neonSunFragmentShader,
    neonSunVertexShader,
} from "./shaders/neonsun";
import { hexToVec3, hueWalkHex, TWINKLE_HUE_SPEED } from "./Synthwave.audio";
import { DEPTH_MIN, roadDepth, Z_PAD } from "./Synthwave.constants";
import type { SynthwaveLive } from "./Synthwave.types";

export function NeonSun({
    liveRef,
    groupRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
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
                    uBrightness: { value: 1 },
                    uColorSunTop: { value: new THREE.Color(1, 0.85, 0.05) },
                    uColorSunBottom: { value: new THREE.Color(1, 0, 0.35) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);
    const scaleRef = useRef<THREE.Group>(null);
    const hueOffset = useRef(0);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }, dt) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        m.uniforms.uBrightness!.value = 1;
        if (!knobs) return;

        if (knobs.sunTwinkle) {
            hueOffset.current =
                (hueOffset.current + TWINKLE_HUE_SPEED * Math.max(0, dt)) % 360;
            const off = hueOffset.current;
            hueWalkHex(knobs.sunRim, off, m.uniforms.uColorSunTop!.value);
            hueWalkHex(knobs.sunCore, off, m.uniforms.uColorSunBottom!.value);
        } else {
            hueOffset.current = 0;
            hexToVec3(knobs.sunRim, m.uniforms.uColorSunTop!.value);
            hexToVec3(knobs.sunCore, m.uniforms.uColorSunBottom!.value);
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
