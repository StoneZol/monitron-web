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
    advanceTwinkleHue,
    createTwinklePulseEnv,
    pulseTwinkleLight,
    resolveTwinkleColor,
    updateTwinklePulseEnv,
} from "@/lib/twinkleHsl";
import {
    channelLevel,
    hexToVec3,
    lerpHex,
} from "@/lib/visualAudio";
import type { SynthwaveLive } from "./Synthwave.types";

/** WE-ish UV units per second at skySpeed = 1 */
const SKY_DRIFT_BASE = 0.0017;

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
                    uSkyOffset: { value: new THREE.Vector2(0, 0) },
                    uSkyPhase: { value: 0 },
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
    const twinkleHue = useRef(0);
    const twinklePulse = useRef(createTwinklePulseEnv());
    const skyHold = useRef(0);
    const skyOffset = useRef(new THREE.Vector2(0, 0));
    const skyPhase = useRef(0);

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

        const step = Math.max(0, dt);
        const rad = (knobs.skyDirection * Math.PI) / 180;
        const rate = SKY_DRIFT_BASE * knobs.skySpeed;
        skyOffset.current.x += Math.cos(rad) * rate * step;
        skyOffset.current.y += Math.sin(rad) * rate * step;
        skyPhase.current += knobs.skySpeed * step;
        (m.uniforms.uSkyOffset!.value as THREE.Vector2).copy(skyOffset.current);
        m.uniforms.uSkyPhase!.value = skyPhase.current;

        const clouds = m.uniforms.uColorClouds!.value as THREE.Color;
        const horizon = m.uniforms.uColorHorizon!.value as THREE.Color;
        // Horizon is decorative — always idle, never twinkle / beat lerp
        hexToVec3(knobs.skyHorizon, horizon);

        const reactive = Boolean(viz?.enabled);

        if (knobs.skyTwinkle) {
            twinkleHue.current = advanceTwinkleHue(
                twinkleHue.current,
                step,
                knobs.skyTwinkleSpeed,
            );
            resolveTwinkleColor(
                twinkleHue.current,
                knobs.skyTwinkleS,
                knobs.skyTwinkleL,
                clouds,
            );
            // Sky palette beats on the beat band (no dedicated channel)
            if (reactive) {
                const raw = channelLevel(viz!, "beat");
                const pulseAmt = updateTwinklePulseEnv(
                    twinklePulse.current,
                    raw,
                    1,
                    step,
                );
                pulseTwinkleLight(clouds, pulseAmt, 1);
            }
            skyHold.current = 0;
        } else {
            if (reactive) {
                const raw = channelLevel(viz!, "beat");
                const decay = Math.exp(-step * 5.5);
                skyHold.current = Math.max(raw, skyHold.current * decay);
                const level = Math.min(1, skyHold.current);
                lerpHex(knobs.skyTop, knobs.skyTopPeak, level, clouds);
            } else {
                skyHold.current = 0;
                hexToVec3(knobs.skyTop, clouds);
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
