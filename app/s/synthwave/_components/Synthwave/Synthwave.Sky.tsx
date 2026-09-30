"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
    neonSkyFragmentShader,
    neonSkyVertexShader,
} from "./shaders/neonsky";
import { hexToVec3, hueWalkHex } from "./Synthwave.audio";
import type { SynthwaveLive } from "./Synthwave.types";

export function Sky({
    liveRef,
    meshRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    meshRef: RefObject<THREE.Mesh | null>;
}) {
    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: neonSkyVertexShader,
                fragmentShader: neonSkyFragmentShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    uTime: { value: 0 },
                    uCloudSpeeds: { value: new THREE.Vector2(0.0007, -0.0011) },
                    uCloudScales: {
                        value: new THREE.Vector4(1.1, 1.1, 0.7, 0.7),
                    },
                    uAspect: { value: 1 },
                    uColorClouds: { value: new THREE.Color(0.05, 0.15, 0.4) },
                    uColorHorizon: { value: new THREE.Color(0.05, 0.15, 0.4) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);
    const hueOffset = useRef(0);

    const { size } = useThree();
    useEffect(() => {
        matRef.current.uniforms.uAspect!.value =
            size.width / Math.max(1, size.height);
    }, [size.width, size.height]);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }, dt) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        if (!knobs) return;

        if (knobs.skyTwinkle) {
            hueOffset.current =
                (hueOffset.current + knobs.colorSpeed * Math.max(0, dt)) % 360;
            const off = hueOffset.current;
            hueWalkHex(knobs.skyTop, off, m.uniforms.uColorClouds!.value);
            hueWalkHex(knobs.skyHorizon, off, m.uniforms.uColorHorizon!.value);
        } else {
            hueOffset.current = 0;
            hexToVec3(knobs.skyTop, m.uniforms.uColorClouds!.value);
            hexToVec3(knobs.skyHorizon, m.uniforms.uColorHorizon!.value);
        }
    });

    return (
        <mesh ref={meshRef} renderOrder={-10} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}
