"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import {
    neonGridFragmentShader,
    neonGridVertexShader,
} from "./shaders/neongrid";
import { channelLevel, hexToVec3 } from "./Synthwave.audio";
import {
    CELL,
    CELL_SQUASH,
    DEPTH_MIN,
    roadDepth,
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
        const roadLv = reactive ? channelLevel(viz!, knobs.roadChannel) : 0;

        const leanDeg = knobs.wallAngle;
        const offsetCells = Math.max(1, Math.round(knobs.wallOffset));
        const depth = roadDepth(knobs.roadLength);
        // Shared depth axis (seams). Squash only U — counters foreshortening.
        const cellsV = depth / CELL;
        const depthSegs = Math.max(2, Math.round(depth / CELL));
        const cellU = CELL * CELL_SQUASH;

        const rate = 2 * knobs.roadSpeed * (1 + roadLv * knobs.drive * 0.5);
        scrollRef.current += Math.max(0, dt) * rate;

        const syncUniforms = (mat: THREE.ShaderMaterial) => {
            mat.uniforms.uScroll!.value = scrollRef.current;
            hexToVec3(knobs.roadColor, mat.uniforms.uColorGridNear!.value);
            hexToVec3(knobs.roadFar, mat.uniforms.uColorGridFar!.value);
            hexToVec3(knobs.roadFloor, mat.uniforms.uColorGridBackground!.value);
        };
        syncUniforms(floorM);
        syncUniforms(wallM);

        const floor = floorRef.current;
        const left = leftRef.current;
        const right = rightRef.current;
        if (!floor || !left || !right) return;

        if (
            builtRef.current &&
            Math.abs(leanDeg - lastAngleRef.current) < 0.05 &&
            offsetCells === lastOffsetRef.current &&
            Math.abs(depth - lastLengthRef.current) < 0.01
        ) {
            return;
        }
        lastAngleRef.current = leanDeg;
        lastOffsetRef.current = offsetCells;
        lastLengthRef.current = depth;
        builtRef.current = true;

        const floorCellsU = Math.max(1, offsetCells) * 2;
        const floorW = floorCellsU * CELL;
        // Denser U than world-square: floor X and wall height compressed for screen.
        floorM.uniforms.uCellsU!.value = floorW / cellU;
        floorM.uniforms.uCellsV!.value = cellsV;
        wallM.uniforms.uCellsU!.value = WALL_LEN / cellU;
        wallM.uniforms.uCellsV!.value = cellsV;

        const zNear = Z_PAD;
        const zFar = -(depth - Z_PAD);
        const zCenter = (zNear + zFar) / 2;

        floor.geometry.dispose();
        {
            const g = new THREE.PlaneGeometry(
                floorW,
                depth,
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
