"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** Bloom sky+sun, then opaque grid on top (visibility toggle — layers were flaky). */
export function Bloom({
    skyRef,
    sunRef,
    gridRef,
}: {
    skyRef: RefObject<THREE.Mesh | null>;
    sunRef: RefObject<THREE.Group | null>;
    gridRef: RefObject<THREE.Group | null>;
}) {
    const { gl, scene, camera, size } = useThree();
    const composer = useRef<EffectComposer | null>(null);

    useEffect(() => {
        const c = new EffectComposer(gl);
        c.addPass(new RenderPass(scene, camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(size.width, size.height),
            0.28,
            0.75,
            0.55,
        );
        c.addPass(bloom);
        composer.current = c;
        return () => {
            c.dispose();
            composer.current = null;
        };
    }, [gl, scene, camera, size.width, size.height]);

    useEffect(() => {
        composer.current?.setSize(size.width, size.height);
    }, [size]);

    useFrame(({ gl: frameGl, scene: frameScene, camera: frameCam }) => {
        const sky = skyRef.current;
        const sun = sunRef.current;
        const grid = gridRef.current;
        const prevAutoClear = frameGl.autoClear;

        if (grid) grid.visible = false;
        if (sky) sky.visible = true;
        if (sun) sun.visible = true;

        if (!composer.current) {
            frameGl.render(frameScene, frameCam);
        } else {
            composer.current.render();
        }

        if (grid) grid.visible = true;
        if (sky) sky.visible = false;
        if (sun) sun.visible = false;

        frameGl.autoClear = false;
        frameGl.clearDepth();
        frameGl.render(frameScene, frameCam);

        if (sky) sky.visible = true;
        if (sun) sun.visible = true;
        frameGl.autoClear = prevAutoClear;
    }, 1);

    return null;
}
