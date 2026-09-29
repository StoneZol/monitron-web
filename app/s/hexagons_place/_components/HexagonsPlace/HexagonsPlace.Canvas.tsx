"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { injectGroundFogShader, FOG_NEUTRAL } from "./HexagonsPlace.fog";
import { applyGlow } from "./HexagonsPlace.glow";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

const ROTATION_SPEED = 0.00005;
/** Spin rate at this BPM when reactive; scales linearly with estimated tempo */
const SPIN_BPM_REF = 30;
const FLAT_TOP = Math.PI / 6;
/**
 * Hex center pitch vs tight pack. 1 = touching faces; >1 opens a seam
 * so glowing edges stay visible between neighbours.
 */
const HEX_GAP = 1;
/** Fixed camera Z — zoom scales the scene, rotate yaws the camera in place. */
const CAMERA_Z = 20;
const CAMERA_FOV = 10;

/** Smooth bass → garland hue only (no beat — that drives hex height). */
function audioColorMul(viz: VizBands, bassBoost: number) {
    if (!viz.enabled) return 1;
    return 1 + Math.max(0, bassBoost) * Math.max(0, viz.bass) * 0.45;
}

const BEAT_EDGE = 0.06;
const BEAT_MIN = 0.08;

type BandKey = "bass" | "beat" | "mid" | "high";

const BAND_KEYS: BandKey[] = ["bass", "beat", "mid", "high"];

/** Per-band height dance (internal — Band bounce toggle gates all of it) */
const BAND_HEIGHT: Record<
    BandKey,
    { amp: number; decay: number; follow: number; punch: number }
> = {
    bass: { amp: 0.32, decay: 3.0, follow: 0.55, punch: 2 },
    beat: { amp: 0.06, decay: 5.2, follow: 0.12, punch: 1.5 },
    mid: { amp: 0.05, decay: 4.0, follow: 0.4, punch: 1 },
    high: { amp: 0.04, decay: 6.0, follow: 0.5, punch: 1 },
};

/** Interleave hexes into 4 fixed band groups across the field */
function buildBandGroups(count: number): Record<BandKey, Uint32Array> {
    const buckets: number[][] = [[], [], [], []];
    for (let i = 0; i < count; i++) {
        buckets[i % 4]!.push(i);
    }
    return {
        bass: new Uint32Array(buckets[0]),
        beat: new Uint32Array(buckets[1]),
        mid: new Uint32Array(buckets[2]),
        high: new Uint32Array(buckets[3]),
    };
}

function hexPosition(iCol: number, iRow: number, origin: number, R: number) {
    const pitch = R * HEX_GAP;
    const dx = 1.5 * pitch;
    const dz = Math.sqrt(3) * pitch;
    const col = iCol - origin;
    const row = iRow - origin;
    // Stagger by grid index (not centered col) — col is *.5 when N is even
    const x = col * dx;
    const z = row * dz + (iCol % 2 !== 0 ? dz / 2 : 0);
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
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
    const edges = new THREE.EdgesGeometry(geometry);

    for (let iCol = 0; iCol < n; iCol++) {
        for (let iRow = 0; iRow < n; iRow++) {
            const { x, z } = hexPosition(iCol, iRow, origin, R);
            const height = minH + Math.random() * (maxH - minH);
            const tower = new THREE.Mesh(geometry, bodyMaterial);
            tower.rotation.y = FLAT_TOP;
            tower.scale.y = height;
            tower.position.set(x, height / 2, z);
            tower.userData.baseH = height;
            const outline = new THREE.LineSegments(edges, edgeMaterial);
            outline.renderOrder = 1;
            tower.add(outline);
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
    const prevBands = useRef({ bass: 0, beat: 0, mid: 0, high: 0 });

    useEffect(() => {
        liveRef.current = live;
    }, [live]);

    const edgeMaterial = useMemo(
        () =>
            new THREE.LineBasicMaterial({
                color: live.edgeColor,
                depthWrite: false,
            }),
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
        const n = group.children.length;
        group.userData.pulses = new Float32Array(n);
        group.userData.bandGroups = buildBandGroups(n);
        return { town: group, shared };
    }, [edgeMaterial, hexGrid, hexSize, hexHeightSpread]);

    useEffect(() => {
        townRef.current = town;
        prevBands.current = { bass: 0, beat: 0, mid: 0, high: 0 };
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

        // Reactive band bounce: 4 interleaved hex groups → bass/beat/mid/high
        const n = field.children.length;
        const pulses = field.userData.pulses as Float32Array | undefined;
        const groups = field.userData.bandGroups as
            | Record<BandKey, Uint32Array>
            | undefined;
        if (pulses && pulses.length === n && groups) {
            const bounce = reactive && knobs.bandBounce && viz;

            if (bounce) {
                for (const key of BAND_KEYS) {
                    const cfg = BAND_HEIGHT[key];
                    const level = Math.max(0, viz[key] ?? 0);
                    const prev = prevBands.current[key];
                    const onset =
                        level > prev + BEAT_EDGE && level >= BEAT_MIN;
                    const follow = level * cfg.follow;
                    const punch = onset
                        ? (0.45 + level * 0.55) * cfg.punch
                        : 0;
                    const strength = Math.max(follow, punch);
                    const idxs = groups[key];
                    for (let t = 0; t < idxs.length; t++) {
                        const idx = idxs[t]!;
                        pulses[idx] = Math.max(pulses[idx], strength);
                    }
                    prevBands.current[key] = level;
                }
            } else {
                prevBands.current = { bass: 0, beat: 0, mid: 0, high: 0 };
            }

            for (let i = 0; i < n; i++) {
                const mesh = field.children[i] as THREE.Mesh;
                const baseH =
                    typeof mesh.userData.baseH === "number"
                        ? mesh.userData.baseH
                        : mesh.scale.y;
                const band = BAND_KEYS[i % 4]!;
                const decay = Math.exp(-dt * BAND_HEIGHT[band].decay);
                pulses[i] *= bounce ? decay : Math.exp(-dt * 8);
                if (pulses[i] < 0.008) pulses[i] = 0;
                const h = baseH * (1 + pulses[i] * BAND_HEIGHT[band].amp);
                mesh.scale.y = h;
                mesh.position.y = h / 2;
            }
        }

        if (knobs.spin) {
            const dir = knobs.spinLeft ? 1 : -1;
            // Reactive: follow locked BPM; until lock, nudge from live energy
            let tempoMul = 1;
            if (reactive && viz) {
                const bpm = viz.bpm;
                if (bpm > 0) {
                    tempoMul = THREE.MathUtils.clamp(bpm / SPIN_BPM_REF, 0.45, 2.4);
                } else {
                    tempoMul =
                        1 +
                        Math.max(0, viz.bass) * 0.55 +
                        Math.max(0, viz.beat) * 0.35;
                }
            }
            city.rotation.y += dir * 8 * ROTATION_SPEED * tempoMul;
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
