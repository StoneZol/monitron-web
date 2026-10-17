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
import type { FairysmokeLive } from "./Fairysmoke.types";
import {
    fairysmokeFragmentShader,
    fairysmokeVertexShader,
} from "./shaders/fairysmoke";

const COLOR_DECAY = 11;
const COLOR_EDGE = 0.045;
const COLOR_EDGE_MIN = 0.05;
const FLICKER_DECAY = 9;
const FLICKER_EDGE = 0.04;
const FLICKER_EDGE_MIN = 0.05;

/** Mode → shader uColorMode */
const MODE_CODE = { original: 0, twinkle: 1, palette: 2 } as const;

type FairysmokeCanvasProps = {
    liveRef: RefObject<FairysmokeLive>;
    vizRef: RefObject<VizBands>;
};

function FairysmokeQuad({
    liveRef,
    vizRef,
}: {
    liveRef: RefObject<FairysmokeLive>;
    vizRef: RefObject<VizBands>;
}) {
    const tint = useMemo(() => new THREE.Color("#ff7ad9"), []);
    const highlight = useMemo(() => new THREE.Color("#7af0ff"), []);
    const smokeT = useRef(0);
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
                vertexShader: fairysmokeVertexShader,
                fragmentShader: fairysmokeFragmentShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    iResolution: { value: new THREE.Vector3(1, 1, 1) },
                    iTime: { value: 0 },
                    uSmokeT: { value: 0 },
                    uColor: { value: new THREE.Color("#7aff9c") },
                    uHighlight: { value: new THREE.Color("#7af0ff") },
                    uSaturation: { value: 1 },
                    uPeakFlicker: { value: 0 },
                    uChaos: { value: 0 },
                    uSteps: { value: 80 },
                    uColorMode: { value: 0 },
                },
            }),
        [],
    );
    const matRef = useRef(mat);

    const { size } = useThree();
    useEffect(() => {
        matRef.current.uniforms.iResolution!.value.set(size.width, size.height, 1);
    }, [size.height, size.width]);

    useEffect(() => () => mat.dispose(), [mat]);

    useEffect(() => {
        return registerRuntimeReset("fairysmoke", () => {
            smokeT.current = 0;
            lastT.current = 0;
            twinkleHue.current = 0;
            twinklePulse.current = createTwinklePulseEnv();
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
        smokeT.current += dt * Math.max(0.05, live.smokeSpeed) * speedMul;

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
                // Stronger fairy flicker — snappier body + deeper quiet floor feel
                const boosted = Math.min(1, Math.pow(pulseAmt, 0.5));
                const drive = Math.min(2, live.colorDrive * 1.35);
                pulseTwinkleLight(tint, boosted, drive);
                highlight.copy(tint);
                pulseTwinkleLight(highlight, Math.min(1, boosted * 1.2), drive);
                peakFlicker = Math.max(peakFlicker, boosted);
            } else {
                highlight.copy(tint);
            }
        } else if (mode === "palette") {
            if (colorArmed && colorAmt > 0.001) {
                lerpHex(live.color, live.colorPeak, colorAmt, tint);
                hexToVec3(live.colorPeak, highlight);
            } else {
                hexToVec3(live.color, tint);
                hexToVec3(live.colorPeak, highlight);
            }
        } else {
            // original — shader owns hue; CPU tints unused (keep sane values)
            hexToVec3(live.color, tint);
            hexToVec3(live.colorPeak, highlight);
        }

        m.uniforms.iTime!.value = t;
        m.uniforms.uSmokeT!.value = smokeT.current;
        m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
        m.uniforms.uPeakFlicker!.value = peakFlicker;
        m.uniforms.uChaos!.value = Math.max(0, live.chaos);
        // Density is ×40 multiplier (2 → Himred 80)
        m.uniforms.uSteps!.value = 40 * Math.max(1, live.density);
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

export default function FairysmokeCanvas({
    liveRef,
    vizRef,
}: FairysmokeCanvasProps) {
    const dpr = useRenderDpr("fairysmoke", 1, 1.25);
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
            <FairysmokeQuad liveRef={liveRef} vizRef={vizRef} />
        </Canvas>
    );
}
