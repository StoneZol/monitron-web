"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    neonGridFragmentShader,
    neonGridVertexShader,
} from "./shaders/neongrid";
import { channelLevel, hexToVec3, hueWalkHex, lerpHex, drivenLevel } from "./Synthwave.audio";
import {
    CELL,
    CELL_SQUASH,
    DEPTH_MIN,
    cameraPerspective,
    liveRoadDepthRef,
    roadDepth,
    roadDepthStretched,
    WALL_LEN,
    WALL_SEGS,
    Z_PAD,
} from "./Synthwave.constants";
import type { SynthwaveLive } from "./Synthwave.types";

function makeGridMaterial(cellsU: number, cellsV: number) {
    return new THREE.ShaderMaterial({
        vertexShader: neonGridVertexShader,
        fragmentShader: neonGridFragmentShader,
        transparent: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
        uniforms: {
            uScroll: { value: 0 },
            uCellsU: { value: cellsU },
            uCellsV: { value: cellsV },
            uLineWidth: { value: 1 },
            uGlow: { value: 0.35 },
            uPerspective: { value: 0.5 },
            uHorizReach: { value: 0 },
            uColorGridNear: { value: new THREE.Color(1, 0, 0.2) },
            uColorGridFar: { value: new THREE.Color(0, 0, 1) },
            uColorGridBackground: { value: new THREE.Color(0.1, 0, 0.1) },
        },
    });
}

/**
 * True planar wall: constant hinge X along Z.
 * When sin(lean)*WALL_LEN === hinge, left+right tips meet as one straight ridge.
 */
function buildWallGeometry(
    side: -1 | 1,
    hinge: number,
    zNear: number,
    zFar: number,
    lean: number,
    segsU: number,
    segsV: number,
) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const tipIn = Math.sin(lean) * WALL_LEN;
    const tipUp = Math.cos(lean) * WALL_LEN;
    const cols = segsU + 1;
    const xBot = side * hinge;
    const xTop = xBot - side * tipIn;

    for (let iv = 0; iv <= segsV; iv++) {
        const v = iv / segsV;
        const z = zNear + (zFar - zNear) * v;

        for (let iu = 0; iu <= segsU; iu++) {
            const u = iu / segsU;
            positions.push(xBot + (xTop - xBot) * u, tipUp * u, z);
            uvs.push(u, v);
        }
    }

    for (let iv = 0; iv < segsV; iv++) {
        for (let iu = 0; iu < segsU; iu++) {
            const a = iv * cols + iu;
            const b = a + cols;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
}

export function NeonGrid({
    liveRef,
    vizRef,
    groupRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
    groupRef: RefObject<THREE.Group | null>;
}) {
    const scrollRef = useRef(0);
    const floorRef = useRef<THREE.Mesh>(null);
    const leftRef = useRef<THREE.Mesh>(null);
    const rightRef = useRef<THREE.Mesh>(null);

    const lastAngleRef = useRef(-1);
    const lastOffsetRef = useRef(-1);
    const lastLengthRef = useRef(-1);
    const builtRef = useRef(false);

    const wallCellsU = WALL_LEN / CELL;

    const floorMat = useMemo(
        () => makeGridMaterial(1, DEPTH_MIN / CELL),
        [],
    );
    const wallMat = useMemo(
        () => makeGridMaterial(wallCellsU, DEPTH_MIN / CELL),
        [wallCellsU],
    );
    const floorMatRef = useRef(floorMat);
    const wallMatRef = useRef(wallMat);
    const hueOffset = useRef(0);
    /** Peak-hold so bass kicks flash like Hexagons band flicker */
    const glowHold = useRef(0);
    const roadHold = useRef(0);
    /** Smoothed stretch 0…1 so mesh rebuilds aren't every kick sample */
    const stretchSmooth = useRef(0);

    useEffect(
        () => () => {
            floorMat.dispose();
            wallMat.dispose();
        },
        [floorMat, wallMat],
    );

    useFrame((_, dt) => {
        const knobs = liveRef.current;
        const viz = vizRef.current;
        const floorM = floorMatRef.current;
        const wallM = wallMatRef.current;
        if (!knobs) return;

        const reactive = Boolean(viz?.enabled);
        const roadRaw = reactive ? channelLevel(viz!, knobs.roadChannel) : 0;
        const glowRaw = reactive ? channelLevel(viz!, knobs.glowChannel) : 0;
        // Road: short sharp kicks. Glow can linger a bit longer for color flash.
        const roadDecay = Math.exp(-Math.max(0, dt) * 12);
        const glowDecay = Math.exp(-Math.max(0, dt) * 7);
        roadHold.current = Math.max(roadRaw, roadHold.current * roadDecay);
        glowHold.current = Math.max(glowRaw, glowHold.current * glowDecay);
        const roadPunch = Math.min(1, roadHold.current);
        const flash = Math.min(1, glowHold.current);
        // Emphasize peaks so mid mush disappears — idle floor stays 0.7
        const roadKick = roadPunch * roadPunch;

        if (knobs.gridTwinkle) {
            hueOffset.current =
                (hueOffset.current + knobs.colorSpeed * Math.max(0, dt)) % 360;
        } else {
            hueOffset.current = 0;
        }
        const hueOff = hueOffset.current;

        const leanDeg = knobs.wallAngle;
        const offsetCells = Math.max(1, Math.round(knobs.wallOffset));

        // Idle a bit slower when road channel is armed; peaks punch with roadDrive
        const roadArmed = reactive && knobs.roadChannel !== "off";
        const speedMul = roadArmed
            ? 0.7 + roadKick * (0.3 + knobs.roadDrive * 0.9)
            : 1;
        const rate = 2 * knobs.roadSpeed * speedMul;
        scrollRef.current += Math.max(0, dt) * rate;

        // Soft stretch envelope (linear punch, not squared) + slow ease in/out.
        // Geometry stays at base depth; group.scale.z does the rubber-band.
        const stretchTarget =
            knobs.roadStretch && roadArmed ? roadPunch : 0;
        const stretchRate = stretchTarget > stretchSmooth.current ? 2.2 : 1.4;
        const stretchEase = Math.exp(-Math.max(0, dt) * stretchRate);
        stretchSmooth.current =
            stretchTarget +
            (stretchSmooth.current - stretchTarget) * stretchEase;

        const baseDepth = roadDepth(knobs.roadLength);
        const depth = roadDepthStretched(
            knobs.roadLength,
            knobs.roadStretch,
            roadArmed,
            stretchSmooth.current,
        );
        liveRoadDepthRef.current = depth;
        const stretchScale = baseDepth > 1e-4 ? depth / baseDepth : 1;
        if (groupRef.current) {
            groupRef.current.scale.set(1, 1, stretchScale);
        }

        // Mesh built at base depth only — stretch is scale, no per-kick rebuild.
        const depthBuild = baseDepth;
        const cellsV = depthBuild / CELL;
        const depthSegs = Math.max(2, Math.round(depthBuild / CELL));
        const cellU = CELL * CELL_SQUASH;

        // Idle dim when glow channel is armed so peaks read as a flash
        const glowArmed = reactive && knobs.glowChannel !== "off";
        const glowFlash = drivenLevel(flash, knobs.glowDrive);
        const glowUi = Math.min(
            40,
            knobs.roadGlow * (glowArmed ? 0.7 + glowFlash * 0.3 : 1) +
                glowFlash * 8,
        );

        const syncUniforms = (
            mat: THREE.ShaderMaterial,
            horizReach: number,
        ) => {
            mat.uniforms.uScroll!.value = scrollRef.current;
            mat.uniforms.uLineWidth!.value = knobs.roadThickness;
            mat.uniforms.uGlow!.value = Math.min(1, Math.max(0, glowUi / 40));
            mat.uniforms.uPerspective!.value = cameraPerspective(
                knobs.wallPerspective,
            );
            mat.uniforms.uHorizReach!.value = horizReach;
            const near = mat.uniforms.uColorGridNear!.value as THREE.Color;
            const far = mat.uniforms.uColorGridFar!.value as THREE.Color;
            if (knobs.gridTwinkle) {
                if (hueOff) {
                    hueWalkHex(knobs.roadColor, hueOff, near);
                    hueWalkHex(knobs.roadFar, hueOff, far);
                } else {
                    hexToVec3(knobs.roadColor, near);
                    hexToVec3(knobs.roadFar, far);
                }
            } else {
                const level = glowArmed ? glowFlash : 0;
                lerpHex(knobs.roadColor, knobs.roadColorPeak, level, near);
                lerpHex(knobs.roadFar, knobs.roadFarPeak, level, far);
            }
            hexToVec3(knobs.roadFloor, mat.uniforms.uColorGridBackground!.value);
        };
        // Flat floor keeps aggressive far-kill; walls open up past −85° lean.
        const wallReach =
            leanDeg <= -85
                ? 0
                : Math.min(1, Math.max(0, (leanDeg + 85) / 50));
        syncUniforms(floorM, 0);
        syncUniforms(wallM, wallReach);

        const floor = floorRef.current;
        const left = leftRef.current;
        const right = rightRef.current;
        if (!floor || !left || !right) return;

        if (
            builtRef.current &&
            Math.abs(leanDeg - lastAngleRef.current) < 0.05 &&
            offsetCells === lastOffsetRef.current &&
            Math.abs(depthBuild - lastLengthRef.current) < 0.01
        ) {
            return;
        }
        lastAngleRef.current = leanDeg;
        lastOffsetRef.current = offsetCells;
        lastLengthRef.current = depthBuild;
        builtRef.current = true;

        const floorCellsU = Math.max(1, offsetCells) * 2;
        // ×2 keeps screen proportions; paint still uses floorCellsU (= offset×2 tiles).
        const floorW = floorCellsU * CELL * 2;
        floorM.uniforms.uCellsU!.value = floorCellsU;
        floorM.uniforms.uCellsV!.value = cellsV;
        wallM.uniforms.uCellsU!.value = WALL_LEN / cellU;
        wallM.uniforms.uCellsV!.value = cellsV;

        const zNear = Z_PAD;
        const zFar = -(depthBuild - Z_PAD);
        const zCenter = (zNear + zFar) / 2;

        floor.geometry.dispose();
        {
            const g = new THREE.PlaneGeometry(
                floorW,
                depthBuild,
                Math.max(1, floorCellsU),
                depthSegs,
            );
            g.rotateX(-Math.PI / 2);
            g.translate(0, 0, zCenter);
            floor.geometry = g;
        }
        floor.visible = true;

        const lean = (Math.min(90, Math.max(-90, leanDeg)) * Math.PI) / 180;
        const hinge = floorW / 2;

        const placeWall = (mesh: THREE.Mesh, side: -1 | 1) => {
            mesh.visible = true;
            mesh.geometry.dispose();
            mesh.geometry = buildWallGeometry(
                side,
                hinge,
                zNear,
                zFar,
                lean,
                WALL_SEGS,
                depthSegs,
            );
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
            mesh.scale.set(1, 1, 1);
        };

        placeWall(left, -1);
        placeWall(right, 1);
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <mesh ref={floorRef} material={floorMat} renderOrder={1} />
            <mesh ref={leftRef} material={wallMat} renderOrder={1} />
            <mesh ref={rightRef} material={wallMat} renderOrder={1} />
        </group>
    );
}
