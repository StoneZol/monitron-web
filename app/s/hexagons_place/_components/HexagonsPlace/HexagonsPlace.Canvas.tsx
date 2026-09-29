"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { injectGroundFogShader, FOG_NEUTRAL } from "./HexagonsPlace.fog";
import { applyGlow } from "./HexagonsPlace.glow";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

const ROTATION_SPEED = 0.00005;
/** Spin rate at this BPM when reactive; lower = stronger tempo influence */
const SPIN_BPM_REF = 20;
const FLAT_TOP = Math.PI / 6;
/**
 * Hex center pitch vs tight pack. 1 = touching faces; >1 opens a seam
 * so glowing edges stay visible between neighbours.
 */
const HEX_GAP = 1;
/** Fixed orbit radius — Angle pitches in place; Zoom scales the field. */
const CAMERA_Z = 20;
const CAMERA_FOV = 20;

/** Smooth bass → garland hue only (no beat — that drives hex height). */
function audioColorMul(viz: VizBands, bassBoost: number) {
    if (!viz.enabled) return 1;
    return 1 + Math.max(0, bassBoost) * Math.max(0, viz.bass) * 0.45;
}

const BEAT_EDGE = 0.06;
const BEAT_MIN = 0.08;

/** Hex cap / bounce groups — beat drives fog, not a hex pile */
type CapBand = "bass" | "mid" | "high";

const CAP_BANDS: CapBand[] = ["bass", "mid", "high"];

/** Per-band height dance (Band bounce toggle) */
const BAND_HEIGHT: Record<
    CapBand,
    { amp: number; decay: number; follow: number; punch: number }
> = {
    bass: { amp: 0.32, decay: 3.0, follow: 0.55, punch: 2 },
    mid: { amp: 0.24, decay: 4.0, follow: 0.4, punch: 1 },
    high: { amp: 0.44, decay: 6.0, follow: 0.5, punch: 1 },
};

/** Interleave hexes into 3 fixed band groups */
function buildBandGroups(count: number): Record<CapBand, Uint32Array> {
    const buckets: number[][] = [[], [], []];
    for (let i = 0; i < count; i++) {
        buckets[i % 3]!.push(i);
    }
    return {
        bass: new Uint32Array(buckets[0]),
        mid: new Uint32Array(buckets[1]),
        high: new Uint32Array(buckets[2]),
    };
}

/** Caps palette defaults (overridden by live prefs each frame) */
const BAND_CAP_FALLBACK: Record<CapBand, { idle: number; peak: number }> = {
    bass: { idle: 0x8f0070, peak: 0xff2ed2 },
    mid: { idle: 0xccbb00, peak: 0xfef606 },
    high: { idle: 0x0644fe, peak: 0x3496fe },
};

function cssHexToInt(hex: string, fallback: number): number {
    const raw = hex.replace("#", "").trim();
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return parseInt(raw, 16);
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
        return parseInt(
            raw
                .split("")
                .map((c) => c + c)
                .join(""),
            16,
        );
    }
    return fallback;
}

const _capIdle = new THREE.Color();
const _capPeak = new THREE.Color();
const _capColor = new THREE.Color();
const _fogIdle = new THREE.Color();
const _fogPeak = new THREE.Color();

type TownShared = {
    geometry: THREE.CylinderGeometry;
    sideMaterial: THREE.MeshStandardMaterial;
    bottomMaterial: THREE.MeshStandardMaterial;
    capMaterials: Record<CapBand, THREE.MeshStandardMaterial>;
};

function createCapMaterials(): Record<CapBand, THREE.MeshStandardMaterial> {
    const out = {} as Record<CapBand, THREE.MeshStandardMaterial>;
    for (const key of CAP_BANDS) {
        out[key] = new THREE.MeshStandardMaterial({
            color: BAND_CAP_FALLBACK[key].idle,
            emissive: BAND_CAP_FALLBACK[key].idle,
            emissiveIntensity: 0.35,
            metalness: 0.15,
            roughness: 0.5,
        });
    }
    return out;
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
): TownShared {
    const R = Math.max(0.2, opts.size);
    const n = Math.max(4, Math.round(opts.grid));
    const origin = (n - 1) / 2;
    const minH = 0.12 * R;
    const maxH = minH + Math.max(0.05, opts.heightSpread) * 1.6 * R;

    const geometry = new THREE.CylinderGeometry(R, R, 1, 6, 1, false);
    // Cylinder groups: 0 = side, 1 = top, 2 = bottom
    const sideMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
    const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const capMaterials = createCapMaterials();
    const edges = new THREE.EdgesGeometry(geometry);

    let index = 0;
    for (let iCol = 0; iCol < n; iCol++) {
        for (let iRow = 0; iRow < n; iRow++) {
            const { x, z } = hexPosition(iCol, iRow, origin, R);
            const height = minH + Math.random() * (maxH - minH);
            const band = CAP_BANDS[index % 3]!;
            const tower = new THREE.Mesh(geometry, [
                sideMaterial,
                capMaterials[band],
                bottomMaterial,
            ]);
            tower.rotation.y = FLAT_TOP;
            tower.scale.y = height;
            tower.position.set(x, height / 2, z);
            tower.userData.baseH = height;
            tower.userData.band = band;
            const outline = new THREE.LineSegments(edges, edgeMaterial);
            outline.renderOrder = 1;
            tower.add(outline);
            town.add(tower);
            index++;
        }
    }

    const box = new THREE.Box3().setFromObject(town);
    const center = box.getCenter(new THREE.Vector3());
    for (const child of town.children) {
        child.position.x -= center.x;
        child.position.z -= center.z;
    }

    return { geometry, sideMaterial, bottomMaterial, capMaterials };
}

function CameraRig({ live }: { live: HexagonsPlaceLive }) {
    const liveRef = useRef(live);

    useEffect(() => {
        liveRef.current = live;
    }, [live]);

    useFrame((state) => {
        const {
            cameraAngle,
            cameraHeight,
            cameraOffset,
            cameraRotate,
        } = liveRef.current;
        const cam = state.camera;

        const pitch = THREE.MathUtils.degToRad(
            THREE.MathUtils.clamp(cameraAngle, 0, 89),
        );
        const yaw = THREE.MathUtils.degToRad(cameraRotate);
        const radius = Math.max(0.5, cameraOffset);

        // Fixed seat on +Z — Offset = distance, Height = Y.
        // Rotate yaws the camera in place (look left/right), does not spin the town.
        cam.position.set(0, cameraHeight, radius);
        cam.rotation.order = "YXZ";
        cam.rotation.x = -pitch;
        cam.rotation.y = yaw;
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
    const fogHueOffset = useRef(0);
    const prevBands = useRef({ bass: 0, mid: 0, high: 0 });

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
        group.userData.capMaterials = shared.capMaterials;
        return { town: group, shared };
    }, [edgeMaterial, hexGrid, hexSize, hexHeightSpread]);

    useEffect(() => {
        townRef.current = town;
        prevBands.current = { bass: 0, mid: 0, high: 0 };
    }, [town]);

    useEffect(() => {
        return () => {
            shared.geometry.dispose();
            shared.sideMaterial.dispose();
            shared.bottomMaterial.dispose();
            for (const key of CAP_BANDS) shared.capMaterials[key].dispose();
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

        if (knobs.garland && !knobs.caps) {
            const step = knobs.colorSpeed * colorMul * dt;
            hueOffset.current = (hueOffset.current + step) % 360;
            if (knobs.fogParallel) {
                const fogMul = THREE.MathUtils.clamp(
                    knobs.fogParallelSpeed,
                    0.1,
                    5,
                );
                fogHueOffset.current =
                    (fogHueOffset.current + step * fogMul) % 360;
            }
        }

        const fog = state.scene.fog;
        const bg = state.scene.background;
        const light = lightBackRef.current;
        const zoom = THREE.MathUtils.clamp(knobs.cameraZoom, 0.25, 3);

        if (fog instanceof THREE.Fog && bg instanceof THREE.Color && light) {
            applyGlow(
                edgeMaterial,
                fog,
                bg,
                light,
                knobs,
                hueOffset.current,
                fogHueOffset.current,
                {
                    enabled: reactive && !knobs.caps,
                    bass: viz?.bass ?? 0,
                },
            );
            // Caps: beat washes the fog (idle → peak), not a 4th hex group
            if (knobs.caps) {
                const beat = reactive
                    ? Math.max(0, Math.min(1, viz?.beat ?? 0))
                    : 0;
                _fogIdle.setHex(
                    cssHexToInt(knobs.capBeatFogIdle, 0x1a0c14),
                );
                _fogPeak.setHex(
                    cssHexToInt(knobs.capBeatFogPeak, 0x4a1830),
                );
                fog.color.copy(_fogIdle).lerp(_fogPeak, beat);
                bg.copy(fog.color);
            }
            const density = THREE.MathUtils.clamp(knobs.fogDensity, 0, 1);
            const ceil = Math.max(0.05, knobs.fogHeight) * zoom;
            fog.near = density;
            fog.far = Math.max(ceil, density + 0.001);
        }

        const city = cityRef.current;
        const field = townRef.current;
        if (!city || !field) return;
        field.scale.setScalar(zoom);

        // Caps: solid color lerp idle → peak (no transparency)
        const capMats = field.userData.capMaterials as
            | Record<CapBand, THREE.MeshStandardMaterial>
            | undefined;
        if (capMats) {
            const palette: Record<CapBand, { idle: string; peak: string }> = {
                bass: { idle: knobs.capBassIdle, peak: knobs.capBassPeak },
                mid: { idle: knobs.capMidIdle, peak: knobs.capMidPeak },
                high: { idle: knobs.capHighIdle, peak: knobs.capHighPeak },
            };
            for (const key of CAP_BANDS) {
                const mat = capMats[key];
                if (knobs.caps) {
                    const level = reactive
                        ? Math.max(0, Math.min(1, viz?.[key] ?? 0))
                        : 0;
                    const fb = BAND_CAP_FALLBACK[key];
                    const pal = palette[key];
                    _capIdle.setHex(cssHexToInt(pal.idle, fb.idle));
                    _capPeak.setHex(cssHexToInt(pal.peak, fb.peak));
                    _capColor.copy(_capIdle).lerp(_capPeak, level);
                    mat.color.copy(_capColor);
                    mat.emissive.copy(_capColor);
                    mat.emissiveIntensity = THREE.MathUtils.lerp(0.25, 0.9, level);
                    mat.transparent = false;
                    mat.opacity = 1;
                    mat.depthWrite = true;
                } else {
                    mat.color.setHex(0x000000);
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                    mat.transparent = false;
                    mat.opacity = 1;
                }
            }
        }

        // Reactive band bounce: 3 groups → bass / mid / high
        const n = field.children.length;
        const pulses = field.userData.pulses as Float32Array | undefined;
        const groups = field.userData.bandGroups as
            | Record<CapBand, Uint32Array>
            | undefined;
        if (pulses && pulses.length === n && groups) {
            const bounce = reactive && knobs.bandBounce && viz;

            if (bounce) {
                for (const key of CAP_BANDS) {
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
                prevBands.current = { bass: 0, mid: 0, high: 0 };
            }

            for (let i = 0; i < n; i++) {
                const mesh = field.children[i] as THREE.Mesh;
                const baseH =
                    typeof mesh.userData.baseH === "number"
                        ? mesh.userData.baseH
                        : mesh.scale.y;
                const band = CAP_BANDS[i % 3]!;
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
                    tempoMul = THREE.MathUtils.clamp(bpm / SPIN_BPM_REF, 0.35, 5);
                } else {
                    tempoMul =
                        1 +
                        Math.max(0, viz.bass) * 0.7 +
                        Math.max(0, viz.beat) * 0.45;
                }
            }
            city.rotation.y +=
                dir * 8 * ROTATION_SPEED * knobs.spinSpeed * tempoMul;
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
                <planeGeometry args={[1000, 1000]} />
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
                shadow-mapSize={[1000, 1000]}
            />
            <pointLight ref={lightBackRef} position={[0, 4, 0]} intensity={0.5} />
            <gridHelper args={[1000, 1000, 0x000000, live.edgeColor]} />
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
            camera={{
                fov: CAMERA_FOV,
                position: [0, 4, CAMERA_Z],
                near: 0.1,
                far: 2000,
            }}
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
