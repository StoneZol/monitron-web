"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL } from "./Synthwave.constants";
import type { SynthwaveLive } from "./Synthwave.types";

export function CameraRig({ liveRef }: { liveRef: RefObject<SynthwaveLive> }) {
    useFrame(({ camera }) => {
        const knobs = liveRef.current;
        const cam = camera as THREE.PerspectiveCamera;
        if (!knobs) return;

        const half = Math.max(1, Math.round(knobs.wallOffset)) * CELL;
        // Only pull cam in when road is narrower than ±4 cells.
        const refHalf = 4 * CELL;
        const t = Math.min(1, Math.max(0.6, half / refHalf));

        const y = 0.14 + 0.28 * t;
        const z = 0 + 1.2 * t;
        const lookY = 0.06 + 0.08 * t;
        const lookZ = -2.2;

        cam.position.set(0, y, z);
        cam.fov = 75;
        cam.near = 0.05;
        cam.far = 60;
        cam.updateProjectionMatrix();
        cam.lookAt(0, lookY, lookZ);
    });
    return null;
}
