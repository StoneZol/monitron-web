"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    neonSkyFragmentShader,
    neonSkyVertexShader,
} from "./shaders/neonsky";
import {
    channelLevel,
    hexToVec3,
    hueWalkHex,
    lerpHex,
} from "./Synthwave.audio";
import type { SynthwaveLive } from "./Synthwave.types";

export function Sky({
    liveRef,
    vizRef,
    meshRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
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
    const skyHold = useRef(0);

    const { size } = useThree();
    useEffect(() => {
        matRef.current.uniforms.uAspect!.value =
            size.width / Math.max(1, size.height);
    }, [size.width, size.height]);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }, dt) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        const viz = vizRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        if (!knobs) return;

        const clouds = m.uniforms.uColorClouds!.value as THREE.Color;
        const horizon = m.uniforms.uColorHorizon!.value as THREE.Color;
        const reactive = Boolean(viz?.enabled);

        if (knobs.skyTwinkle) {
            hueOffset.current =
                (hueOffset.current + knobs.colorSpeed * Math.max(0, dt)) % 360;
            const off = hueOffset.current;
            hueWalkHex(knobs.skyTop, off, clouds);
            hueWalkHex(knobs.skyHorizon, off, horizon);
            skyHold.current = 0;
        } else {
            hueOffset.current = 0;
            if (reactive) {
                const raw = channelLevel(viz!, "beat");
                const decay = Math.exp(-Math.max(0, dt) * 5.5);
                skyHold.current = Math.max(raw, skyHold.current * decay);
                const level = Math.min(1, skyHold.current);
                lerpHex(knobs.skyTop, knobs.skyTopPeak, level, clouds);
                lerpHex(knobs.skyHorizon, knobs.skyHorizonPeak, level, horizon);
            } else {
                skyHold.current = 0;
                hexToVec3(knobs.skyTop, clouds);
                hexToVec3(knobs.skyHorizon, horizon);
            }
        }
    });

    return (
        <mesh ref={meshRef} renderOrder={-10} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}
