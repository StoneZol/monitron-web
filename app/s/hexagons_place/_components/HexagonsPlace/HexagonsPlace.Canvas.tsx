"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { injectGroundFogShader, FOG_NEUTRAL } from "./HexagonsPlace.fog";
import { applyGlow } from "./HexagonsPlace.glow";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

const ROTATION_SPEED = 0.00005;
const FLAT_TOP = Math.PI / 6;
/** Fixed camera Z — zoom scales the scene, rotate yaws the camera in place. */
const CAMERA_Z = 20;
const CAMERA_FOV = 10;

/** Smooth bass → garland hue only (no beat — that drives hex height). */
function audioColorMul(viz: VizBands, bassBoost: number) {
    if (!viz.enabled) return 1;
    return 1 + Math.max(0, bassBoost) * Math.max(0, viz.bass) * 0.45;
}

const BEAT_EDGE = 0.07;
const BEAT_MIN = 0.1;
/** Beat → hex height punch (internal only, not in UI) */
const BEAT_HEIGHT = {
    /** Fraction of towers that react to beat (fixed set, not random) */
    hitFrac: 0.2,
    /** Max extra height vs base (0.05 = +5%) */
    amp: 0.2,
    decay: 4.5,
} as const;

/** Evenly spaced tower indices — same hexes every beat */
function pickBeatTargets(count: number, frac: number): Uint32Array {
    const hits = Math.max(1, Math.floor(count * frac));
    const step = count / hits;
    const out = new Uint32Array(hits);
    for (let i = 0; i < hits; i++) {
        out[i] = Math.min(count - 1, Math.floor(i * step + step * 0.5));
    }
    return out;
}

function hexPosition(col: number, row: number, R: number) {
    const dx = 1.5 * R;
    const dz = Math.sqrt(3) * R;
    const x = col * dx;
    const z = row * dz + (col % 2 !== 0 ? dz / 2 : 0);
    return { x, z };
}

function buildTown(
    town: THREE.Group,
    edgeMaterial: THREE.LineBasicMaterial,
    opts: { grid: number; size: number; heightSpread: number },
): { geometry: THREE.CylinderGeometry; bodyMaterial: THREE.MeshStandardMaterial } {
    const R = Math.max(0.2, opts.size);
    const n = Math.max(4, Math.round(opts.grid));
    const origin = (n - 1) / 2;
    // Flat floor → tall peaks as spread grows (mountains through fog)
    const minH = 0.12 * R;
    const maxH = minH + Math.max(0.05, opts.heightSpread) * 1.6 * R;

    const geometry = new THREE.CylinderGeometry(R, R, 1, 6, 1, false);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const edges = new THREE.EdgesGeometry(geometry);

    for (let iCol = 0; iCol < n; iCol++) {
        for (let iRow = 0; iRow < n; iRow++) {
            const col = iCol - origin;
            const row = iRow - origin;
            const { x, z } = hexPosition(col, row, R);
            const height = minH + Math.random() * (maxH - minH);
            const tower = new THREE.Mesh(geometry, bodyMaterial);
            tower.rotation.y = FLAT_TOP;
            tower.scale.y = height;
            tower.position.set(x, height / 2, z);
            tower.userData.baseH = height;
            tower.add(new THREE.LineSegments(edges, edgeMaterial));
            town.add(tower);
        }
    }

    // Hex column stagger shifts the bbox — pin the field center to world origin
    const box = new THREE.Box3().setFromObject(town);
    const center = box.getCenter(new THREE.Vector3());
    for (const child of town.children) {
        child.position.x -= center.x;
        child.position.z -= center.z;
    }

    return { geometry, bodyMaterial };
}

function CameraRig({ live }: { live: HexagonsPlaceLive }) {
    const liveRef = useRef(live);

    useEffect(() => {
        liveRef.current = live;
    }, [live]);

    useFrame((state) => {
        const { cameraAngle, cameraHeight, cameraRotate } = liveRef.current;
        const cam = state.camera;

        cam.position.set(0, cameraHeight, CAMERA_Z);
        cam.rotation.order = "YXZ";
        cam.rotation.x = -THREE.MathUtils.degToRad(
            THREE.MathUtils.clamp(cameraAngle, 0, 89),
        );
        cam.rotation.y = THREE.MathUtils.degToRad(cameraRotate);
        cam.rotation.z = 0;
    });

    return null;
}

function City({
    live,
    vizRef,
}: {
    live: HexagonsPlaceLive;
    vizRef: RefObject<VizBands>;
}) {
    const liveRef = useRef(live);
    const cityRef = useRef<THREE.Group>(null);
    const lightBackRef = useRef<THREE.PointLight>(null);
    const hueOffset = useRef(0);
    const prevBeat = useRef(0);
    const pulsesRef = useRef<Float32Array | null>(null);
    const beatTargetsRef = useRef<Uint32Array | null>(null);

    useEffect(() => {
        liveRef.current = live;
    }, [live]);

    const edgeMaterial = useMemo(
        () => new THREE.LineBasicMaterial({ color: live.edgeColor }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- shared for town lifetime
        [],
    );

    const townRef = useRef<THREE.Group | null>(null);

    const hexGrid = live.hexGrid;
    const hexSize = live.hexSize;
    const hexHeightSpread = live.hexHeightSpread;

    const { town, shared } = useMemo(() => {
        const group = new THREE.Group();
        const shared = buildTown(group, edgeMaterial, {
            grid: hexGrid,
            size: hexSize,
            heightSpread: hexHeightSpread,
        });
        return { town: group, shared };
    }, [edgeMaterial, hexGrid, hexSize, hexHeightSpread]);

    useEffect(() => {
        townRef.current = town;
        const n = town.children.length;
        pulsesRef.current = new Float32Array(n);
        beatTargetsRef.current = pickBeatTargets(n, BEAT_HEIGHT.hitFrac);
        prevBeat.current = 0;
    }, [town]);

    useEffect(() => {
        return () => {
            shared.geometry.dispose();
            shared.bodyMaterial.dispose();
            const first = town.children[0] as THREE.Mesh | undefined;
            const line = first?.children[0] as THREE.LineSegments | undefined;
            line?.geometry.dispose();
            town.clear();
        };
    }, [town, shared]);

    useEffect(() => {
        return () => {
            edgeMaterial.dispose();
        };
    }, [edgeMaterial]);

    useFrame((state, dt) => {
        const knobs = liveRef.current;
        const viz = vizRef.current;
        const reactive = Boolean(viz?.enabled);
        const colorMul = viz ? audioColorMul(viz, knobs.bassBoost) : 1;

        if (knobs.garland) {
            hueOffset.current =
                (hueOffset.current + knobs.colorSpeed * colorMul * dt) % 360;
        }

        const fog = state.scene.fog;
        const bg = state.scene.background;
        const light = lightBackRef.current;
        const zoom = THREE.MathUtils.clamp(knobs.cameraZoom, 0.25, 3);

        if (fog instanceof THREE.Fog && bg instanceof THREE.Color && light) {
            applyGlow(edgeMaterial, fog, bg, light, knobs, hueOffset.current, {
                enabled: reactive,
                bass: viz?.bass ?? 0,
            });
            const density = THREE.MathUtils.clamp(knobs.fogDensity, 0, 1);
            const ceil = Math.max(0.05, knobs.fogHeight) * zoom;
            fog.near = density;
            fog.far = Math.max(ceil, density + 0.001);
        }

        const city = cityRef.current;
        const field = townRef.current;
        if (!city || !field) return;
        field.scale.setScalar(zoom);

        // Beat → height punches on a fixed subset (spin stays steady)
        const n = field.children.length;
        let pulses = pulsesRef.current;
        if (!pulses || pulses.length !== n) {
            pulses = new Float32Array(n);
            pulsesRef.current = pulses;
            beatTargetsRef.current = pickBeatTargets(n, BEAT_HEIGHT.hitFrac);
        }
        const targets = beatTargetsRef.current;
        const beat = reactive ? Math.max(0, viz?.beat ?? 0) : 0;
        if (
            reactive &&
            targets &&
            beat > prevBeat.current + BEAT_EDGE &&
            beat >= BEAT_MIN
        ) {
            const strength = 0.55 + beat * 0.45;
            for (let t = 0; t < targets.length; t++) {
                const idx = targets[t];
                pulses[idx] = Math.max(pulses[idx], strength);
            }
        }
        prevBeat.current = beat;

        const decay = Math.exp(-dt * BEAT_HEIGHT.decay);
        for (let i = 0; i < n; i++) {
            const mesh = field.children[i] as THREE.Mesh;
            const baseH =
                typeof mesh.userData.baseH === "number"
                    ? mesh.userData.baseH
                    : mesh.scale.y;
            pulses[i] *= decay;
            if (pulses[i] < 0.008) pulses[i] = 0;
            const h = baseH * (1 + pulses[i] * BEAT_HEIGHT.amp);
            mesh.scale.y = h;
            mesh.position.y = h / 2;
        }

        if (knobs.spin) {
            const dir = knobs.spinLeft ? 1 : -1;
            city.rotation.y += dir * 8 * ROTATION_SPEED;
        }
        if (city.rotation.x < -0.05) city.rotation.x = -0.05;
    });

    return (
        <group ref={cityRef}>
            <primitive object={town} />
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.01, 0]}
                receiveShadow
            >
                <planeGeometry args={[100, 100]} />
                <meshPhongMaterial
                    color={0x000000}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.95}
                />
            </mesh>
            <spotLight
                position={[5, 5, 5]}
                rotation={[(45 * Math.PI) / 180, 0, (-45 * Math.PI) / 180]}
                intensity={10}
                distance={10}
                penumbra={0.2}
                castShadow
                shadow-mapSize={[6000, 6000]}
            />
            <pointLight ref={lightBackRef} position={[0, 6, 0]} intensity={0.5} />
            <gridHelper args={[100, 100, 0x000000, 0x000000]} />
        </group>
    );
}

export type HexagonsCanvasProps = {
    live: HexagonsPlaceLive;
    vizRef: RefObject<VizBands>;
};

export default function HexagonsCanvas({ live, vizRef }: HexagonsCanvasProps) {
    return (
        <Canvas
            className="absolute inset-0 h-full w-full"
            camera={{ fov: CAMERA_FOV, position: [0, 4, CAMERA_Z], near: 1, far: 100 }}
            dpr={[1, 2]}
            gl={{ antialias: true }}
            onCreated={({ gl, camera, scene }) => {
                injectGroundFogShader();
                scene.traverse((obj) => {
                    const mesh = obj as THREE.Mesh;
                    if (!mesh.isMesh || !mesh.material) return;
                    const mats = Array.isArray(mesh.material)
                        ? mesh.material
                        : [mesh.material];
                    for (const m of mats) m.needsUpdate = true;
                });
                camera.lookAt(0, 0, 0);
                if (window.innerWidth > 800) {
                    gl.shadowMap.enabled = true;
                    gl.shadowMap.type = THREE.PCFShadowMap;
                }
            }}
        >
            <color attach="background" args={[FOG_NEUTRAL]} />
            {/* near=density, far=fog ceiling — see HexagonsPlace.fog */}
            <fog attach="fog" args={[FOG_NEUTRAL, 0.9, 0.85]} />
            <ambientLight intensity={4} />
            <CameraRig live={live} />
            <City live={live} vizRef={vizRef} />
        </Canvas>
    );
}
