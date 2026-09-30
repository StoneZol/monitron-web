"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    neonSunFragmentShader,
    neonSunVertexShader,
} from "./shaders/neonsun";
import { channelLevel, hexToVec3 } from "./Synthwave.audio";
import { DEPTH_MIN, roadDepth, Z_PAD } from "./Synthwave.constants";
import type { SynthwaveLive } from "./Synthwave.types";

function SunPulse({
    liveRef,
    vizRef,
    baseScale,
    children,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
    baseScale: number;
    children: ReactNode;
}) {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        const knobs = liveRef.current;
        const viz = vizRef.current;
        if (!ref.current || !knobs) return;
        const reactive = Boolean(viz?.enabled);
        const sunLv = reactive ? channelLevel(viz!, knobs.sunChannel) : 0;
        const s = baseScale * knobs.sunSize * (0.9 + sunLv * 0.12);
        ref.current.scale.setScalar(s);
    });
    return <group ref={ref}>{children}</group>;
}

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
                    uColorSunTop: { value: new THREE.Color(1, 0.85, 0.05) },
                    uColorSunBottom: { value: new THREE.Color(1, 0, 0.35) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        if (!knobs) return;
        hexToVec3(knobs.sunRim, m.uniforms.uColorSunTop!.value);
        hexToVec3(knobs.sunCore, m.uniforms.uColorSunBottom!.value);
        const depth = roadDepth(knobs.roadLength);
        const zFar = -(depth - Z_PAD);
        if (groupRef.current) {
            groupRef.current.position.set(0, 0.22, zFar - 0.12);
        }
    });

    const base = 2.4;
    return (
        <group
            ref={groupRef}
            position={[0, 0.22, -(DEPTH_MIN - Z_PAD) - 0.12]}
            renderOrder={-5}
        >
            <SunPulse liveRef={liveRef} vizRef={vizRef} baseScale={base}>
                <mesh renderOrder={-5} frustumCulled={false}>
                    <planeGeometry args={[1, 1]} />
                    <primitive object={mat} attach="material" />
                </mesh>
            </SunPulse>
        </group>
    );
}
