"use client";

import { useRef, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { Bloom } from "./Synthwave.Bloom";
import { CameraRig } from "./Synthwave.Camera";
import { NeonGrid } from "./Synthwave.Grid";
import { Sky } from "./Synthwave.Sky";
import { NeonSun } from "./Synthwave.Sun";
import type { SynthwaveLive } from "./Synthwave.types";

type SynthwaveCanvasProps = {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
};

function Scene({
    liveRef,
    vizRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
}) {
    const skyRef = useRef<THREE.Mesh | null>(null);
    const sunRef = useRef<THREE.Group | null>(null);
    const gridRef = useRef<THREE.Group | null>(null);

    return (
        <>
            <CameraRig liveRef={liveRef} />
            <Sky liveRef={liveRef} vizRef={vizRef} meshRef={skyRef} />
            <NeonSun liveRef={liveRef} vizRef={vizRef} groupRef={sunRef} />
            <NeonGrid liveRef={liveRef} vizRef={vizRef} groupRef={gridRef} />
            <Bloom skyRef={skyRef} sunRef={sunRef} gridRef={gridRef} />
        </>
    );
}

export default function SynthwaveCanvas({
    liveRef,
    vizRef,
}: SynthwaveCanvasProps) {
    return (
        <Canvas
            className="absolute inset-0 h-full w-full"
            dpr={[1, 2]}
            camera={{
                position: [0, 0.4, 1.4],
                fov: 75,
                near: 0.05,
                far: 60,
            }}
            gl={{
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
            }}
            onCreated={({ camera, gl }) => {
                camera.lookAt(0, 0.12, -2.2);
                gl.setClearColor("#000000");
                gl.toneMapping = THREE.NoToneMapping;
            }}
        >
            <Scene liveRef={liveRef} vizRef={vizRef} />
        </Canvas>
    );
}
