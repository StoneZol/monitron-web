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
import type { QuaternionfractalLive } from "./Quaternionfractal.types";
import {
    quaternionfractalFragmentShader,
    quaternionfractalVertexShader,
} from "./shaders/quaternionfractal";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;
const FLICKER_DECAY = 9;
const FLICKER_EDGE = 0.04;
const FLICKER_EDGE_MIN = 0.05;

const MODE_CODE = {
    original: 0,
    twinkle: 1,
} as const;

type QuaternionfractalCanvasProps = {
    liveRef: RefObject<QuaternionfractalLive>;
    vizRef: RefObject<VizBands>;
};

function QuaternionfractalQuad({
    liveRef,
    vizRef,
}: {
    liveRef: RefObject<QuaternionfractalLive>;
    vizRef: RefObject<VizBands>;
}) {
    const tint = useMemo(() => new THREE.Color("#6ec8ff"), []);
    const highlight = useMemo(() => new THREE.Color("#ff7ad9"), []);
    const cameraT = useRef(0);
    const lastT = useRef(0);
    const colorEnv = useRef(0);
    const colorPrev = useRef(0);
    const flickerEnv = useRef(0);
    const flickerPrev = useRef(0);
    const motionKick = useRef(createMotionKickState());
    const twinkleHue = useRef(0);
    const twinklePulse = useRef(createTwinklePulseEnv());

    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: quaternionfractalVertexShader,
                fragmentShader: quaternionfractalFragmentShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    iResolution: { value: new THREE.Vector3(1, 1, 1) },
                    uCameraT: { value: 0 },
                    uColor: { value: new THREE.Color("#6ec8ff") },
                    uHighlight: { value: new THREE.Color("#ff7ad9") },
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
        return registerRuntimeReset("quaternion_fractal", () => {
            cameraT.current = 0;
            lastT.current = 0;
            twinkleHue.current = 0;
            colorEnv.current = 0;
            flickerEnv.current = 0;
            twinklePulse.current = createTwinklePulseEnv();
            motionKick.current = createMotionKickState();
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
        const colorPunch = drivenLevel(colorRaw, live.colorDrive);
        const colorArmed = reactive && live.colorChannel !== "off";
        const mode = live.colorMode;

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

        cameraT.current +=
            dt * Math.max(0.05, live.cameraSpeed) * speedMul;

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

        m.uniforms.uCameraT!.value = cameraT.current;
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

export default function QuaternionfractalCanvas({
    liveRef,
    vizRef,
}: QuaternionfractalCanvasProps) {
    const dpr = useRenderDpr("quaternion_fractal", 1, 1.25);
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
            <QuaternionfractalQuad liveRef={liveRef} vizRef={vizRef} />
        </Canvas>
    );
}
