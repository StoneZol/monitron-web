"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cameraPerspective, CELL } from "./Synthwave.constants";
import type { SynthwaveLive } from "./Synthwave.types";

export function CameraRig({ liveRef }: { liveRef: RefObject<SynthwaveLive> }) {
    useFrame(({ camera }) => {
        const knobs = liveRef.current;
        const cam = camera as THREE.PerspectiveCamera;
        if (!knobs) return;

        const half = Math.max(1, Math.round(knobs.wallOffset)) * CELL;
        // Pull cam in only when road is narrower than ±4 cells.
        const refHalf = 4 * CELL;
        const widthT = Math.min(1, Math.max(0.6, half / refHalf));
        // Perspective knob: foreshortening via camera height / look, not mesh warp.
        const perspT = cameraPerspective(knobs.wallPerspective);

        const y = (0.18 + 0.32 * widthT) * (1.15 - 0.55 * perspT);
        const z = (0.15 + 1.15 * widthT) * (0.85 + 0.35 * perspT);
        const lookY = 0.04 + 0.1 * widthT * (1 - 0.5 * perspT);
        const lookZ = -2.2;

        cam.position.set(0, y, z);
        cam.fov = 68 + 14 * perspT;
        cam.near = 0.05;
        cam.far = 60;
        cam.updateProjectionMatrix();
        cam.lookAt(0, lookY, lookZ);
    });
    return null;
}
