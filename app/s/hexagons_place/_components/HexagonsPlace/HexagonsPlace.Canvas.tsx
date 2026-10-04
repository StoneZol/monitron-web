"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VizBands } from "@/lib/audioBus";
import { sliceBands, risingEdge } from "@/lib/audioDerive";
import {
    advanceTwinkleHue,
    createTwinklePulseEnv,
    updateTwinklePulseEnv,
} from "@/lib/twinkleHsl";
import { beatRaw, channelLevel } from "@/lib/visualAudio";
import { injectGroundFogShader, FOG_NEUTRAL } from "./HexagonsPlace.fog";
import { applyGlow } from "./HexagonsPlace.glow";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

const ROTATION_SPEED = 0.00005;
const SPIN_IMPULSE_DECAY = 3.2;
const SPIN_EDGE = 0.05;
const SPIN_MIN = 0.06;
const FLAT_TOP = Math.PI / 6;
/**
 * Hex center pitch vs tight pack. 1 = touching faces; >1 opens a seam
 * so glowing edges stay visible between neighbours.
 */
const HEX_GAP = 1;
/** Default light intensities at lightIntensity=1 */
const LIGHT_AMBIENT = 4;
const LIGHT_SPOT = 10;
const LIGHT_POINT = 0.5;
/** Auxiliary ground grid — base footprint / density at scale=1 */
const AUX_GRID_SIZE = 240;
const AUX_GRID_DIV = 48;

/**
 * Scale down → denser cells, same footprint.
 * Scale up → larger cells + wider footprint (grid doesn't shrink away).
 */
function resolveAuxGrid(scale: number) {
    const mul = THREE.MathUtils.clamp(scale, 0.25, 4);
    const baseCell = AUX_GRID_SIZE / AUX_GRID_DIV;
    const cell = baseCell * mul;
    const size = mul <= 1 ? AUX_GRID_SIZE : AUX_GRID_SIZE * mul;
    const divisions = Math.max(4, Math.round(size / cell));
    return { size, divisions, mul };
}
/** Initial camera Z before CameraRig; Offset slider is live radius. */
const CAMERA_Z = 20;
const CAMERA_FOV = 20;

/** Hex cap / bounce groups — beat is not a hex pile (fog uses fogChannel) */
type CapBand = "bass" | "mid" | "high";

const CAP_BANDS: CapBand[] = ["bass", "mid", "high"];

/** Map bus spectrum → classic low / mid / high energy (Hz slices). */
function spectrumTrio(viz: VizBands): Record<CapBand, number> {
    const bands = viz.bands;
    return {
        bass: sliceBands(bands, 30, 180),
        mid: sliceBands(bands, 200, 2000),
        high: sliceBands(bands, 2000, 10000),
    };
}

const BEAT_EDGE = 0.06;
const BEAT_MIN = 0.08;

/**
 * Per-band height dance (Band bounce toggle).
 * mid uses relative drive — plugin mid sits ~0.1 flat, so absolute follow looks dead.
 */
const BAND_HEIGHT: Record<
    CapBand,
    {
        amp: number;
        decay: number;
        follow: number;
        punch: number;
        /** absolute = raw×gain; relative = spikes above slow floor */
        drive: "absolute" | "relative";
        gain: number;
    }
> = {
    bass: {
        amp: 0.32,
        decay: 3.0,
        follow: 0.55,
        punch: 2,
        drive: "absolute",
        gain: 1,
    },
    mid: {
        amp: 0.22,
        decay: 5.5,
        follow: 0.95,
        punch: 1.8,
        drive: "relative",
        gain: 1,
    },
    high: {
        amp: 0.44,
        decay: 6.0,
        follow: 0.5,
        punch: 1,
        drive: "absolute",
        gain: 1,
    },
};

type BandEnv = { ema: number; prev: number; flash: number; primed: boolean };

function createBandEnvs(): Record<CapBand, BandEnv> {
    return {
        bass: { ema: 0, prev: 0, flash: 0, primed: false },
        mid: { ema: 0, prev: 0, flash: 0, primed: false },
        high: { ema: 0, prev: 0, flash: 0, primed: false },
    };
}

/**
 * Map plugin band → 0..1 hit for caps / bounce.
 * Relative mode (mid): ignore the flat floor, fire on micro-rises.
 */
function sampleBandHit(
    env: BandEnv,
    raw: number,
    dt: number,
    drive: "absolute" | "relative",
    gain: number,
): number {
    const x = Math.max(0, raw);
    if (drive === "absolute") {
        env.ema += (x - env.ema) * Math.min(1, dt * 4);
        env.prev = x;
        env.flash = 0;
        env.primed = true;
        return Math.min(1, x * gain);
    }

    // First sample: lock floor, don't count cold-start as a hit
    if (!env.primed) {
        env.ema = x;
        env.prev = x;
        env.primed = true;
        return 0;
    }

    // Slow floor — mid often parks ~0.1 with tiny wiggles
    const floorAlpha = 1 - Math.exp(-dt * 1.8);
    env.ema += (x - env.ema) * floorAlpha;
    const excess = Math.max(0, x - env.ema);
    const rise = Math.max(0, x - env.prev);
    env.prev = x;

    // Micro-transients: ±0.01 around the floor should still flash
    if (rise > 0.002 || excess > 0.004) {
        env.flash = Math.max(
            env.flash,
            Math.min(1, rise * 55 + excess * 35),
        );
    }
    env.flash *= Math.exp(-dt * 7);
    if (env.flash < 0.015) env.flash = 0;

    return Math.min(1, Math.max(excess * 25, env.flash));
}

/** Balanced random band tags (no striped %3 pattern) */
function shuffleBands(count: number): CapBand[] {
    const bands: CapBand[] = [];
    for (let i = 0; i < count; i++) bands.push(CAP_BANDS[i % 3]!);
    for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = bands[i]!;
        bands[i] = bands[j]!;
        bands[j] = a;
    }
    return bands;
}

/** Index lists from actual tower.userData.band */
function buildBandGroups(town: THREE.Group): Record<CapBand, Uint32Array> {
    const buckets: Record<CapBand, number[]> = {
        bass: [],
        mid: [],
        high: [],
    };
    town.children.forEach((child, i) => {
        const band = child.userData.band as CapBand;
        if (band in buckets) buckets[band].push(i);
    });
    return {
        bass: new Uint32Array(buckets.bass),
        mid: new Uint32Array(buckets.mid),
        high: new Uint32Array(buckets.high),
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
const _gridColor = new THREE.Color();

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

/** Flat-top odd-q offset → axial; matches iCol%2 stagger in hexPosition */
function offsetToAxial(iCol: number, iRow: number, n: number) {
    const q = iCol - Math.floor(n / 2);
    const row = iRow - Math.floor(n / 2);
    const r = row - (q - (q & 1)) / 2;
    return { q, r };
}

function axialHexDistance(q: number, r: number) {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
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
    // Big hex of the same cells — radius in hex steps from center
    const hexRadius = Math.floor((n - 1) / 2);

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

    const slots: { x: number; z: number }[] = [];
    for (let iCol = 0; iCol < n; iCol++) {
        for (let iRow = 0; iRow < n; iRow++) {
            const { q, r } = offsetToAxial(iCol, iRow, n);
            if (axialHexDistance(q, r) > hexRadius) continue;
            slots.push(hexPosition(iCol, iRow, origin, R));
        }
    }

    const bands = shuffleBands(slots.length);
    for (let i = 0; i < slots.length; i++) {
        const { x, z } = slots[i]!;
        const height = minH + Math.random() * (maxH - minH);
        const band = bands[i]!;
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
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const spotRef = useRef<THREE.SpotLight>(null);
    const lightBackRef = useRef<THREE.PointLight>(null);
    const gridRef = useRef<THREE.GridHelper>(null);
    const twinkleHue = useRef(0);
    const fogTwinkleHue = useRef(0);
    const twinklePulse = useRef(createTwinklePulseEnv());
    const prevBands = useRef({ bass: 0, mid: 0, high: 0 });
    const bandEnvs = useRef(createBandEnvs());
    const spinImpulse = useRef(0);
    const prevSpinLevel = useRef(0);
    const prevSpinRaw = useRef(0);

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
        group.userData.bandGroups = buildBandGroups(group);
        group.userData.capMaterials = shared.capMaterials;
        return { town: group, shared };
    }, [edgeMaterial, hexGrid, hexSize, hexHeightSpread]);

    useEffect(() => {
        townRef.current = town;
        prevBands.current = { bass: 0, mid: 0, high: 0 };
        bandEnvs.current = createBandEnvs();
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
        const flicker = reactive && knobs.bandFlicker;
        const trio = reactive && viz ? spectrumTrio(viz) : null;
        const twinkleOn = knobs.twinkle && !knobs.caps;
        const fogRaw =
            flicker && viz && knobs.fogChannel !== "off"
                ? channelLevel(viz, knobs.fogChannel)
                : 0;
        const pulseAmt =
            twinkleOn && flicker
                ? updateTwinklePulseEnv(
                      twinklePulse.current,
                      fogRaw,
                      knobs.fogDrive,
                      Math.max(0, dt),
                  )
                : 0;

        if (twinkleOn) {
            twinkleHue.current = advanceTwinkleHue(
                twinkleHue.current,
                Math.max(0, dt),
                knobs.twinkleSpeed,
            );
            if (knobs.fogParallel) {
                const fogMul = THREE.MathUtils.clamp(
                    knobs.fogParallelSpeed,
                    0.1,
                    5,
                );
                fogTwinkleHue.current = advanceTwinkleHue(
                    fogTwinkleHue.current,
                    Math.max(0, dt),
                    knobs.twinkleSpeed * fogMul,
                );
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
                twinkleHue.current,
                fogTwinkleHue.current,
                {
                    enabled: flicker && !knobs.caps && Boolean(viz),
                    bass: trio?.bass ?? 0,
                    mid: trio?.mid ?? 0,
                    high: trio?.high ?? 0,
                    beat: viz ? channelLevel(viz, "beat") : 0,
                    pulseAmt,
                },
            );
            // Aux grid: fixed | reactive jumps on capGridIdle→Peak via channel | edge
            const grid = gridRef.current;
            if (grid) {
                let c: THREE.Color;
                if (knobs.gridFixed) {
                    c = _gridColor.set(knobs.gridColor);
                } else if (twinkleOn) {
                    // Inherit edge rainbow (+ pulse) — grid palette hidden
                    c = edgeMaterial.color;
                } else if (flicker && viz && knobs.gridChannel !== "off") {
                    const level = Math.min(
                        1,
                        channelLevel(viz, knobs.gridChannel) *
                            Math.max(0, knobs.gridDrive),
                    );
                    _fogIdle.setHex(
                        cssHexToInt(knobs.capGridIdle, 0x1a4a20),
                    );
                    _fogPeak.setHex(
                        cssHexToInt(knobs.capGridPeak, 0x6dff4a),
                    );
                    c = _gridColor.copy(_fogIdle).lerp(_fogPeak, level);
                } else if (reactive && knobs.gridChannel === "off") {
                    // Static grid tint from palette idle (no audio jump)
                    c = _gridColor.set(knobs.capGridIdle);
                } else {
                    c = knobs.caps
                        ? _gridColor.set(knobs.capGridIdle)
                        : edgeMaterial.color;
                }
                const attr = grid.geometry.getAttribute(
                    "color",
                ) as THREE.BufferAttribute | null;
                if (attr) {
                    for (let i = 0; i < attr.count; i++) {
                        attr.setXYZ(i, c.r, c.g, c.b);
                    }
                    attr.needsUpdate = true;
                }
            }
            // Caps fog: palette idle→peak via fogChannel (spectrum)
            if (knobs.caps) {
                _fogIdle.setHex(cssHexToInt(knobs.capFogIdle, 0x0c1a2e));
                _fogPeak.setHex(cssHexToInt(knobs.capFogPeak, 0x1a4a9e));
                if (flicker && viz && knobs.fogChannel !== "off") {
                    const level = Math.min(
                        1,
                        channelLevel(viz, knobs.fogChannel) *
                            Math.max(0, knobs.fogDrive),
                    );
                    fog.color.copy(_fogIdle).lerp(_fogPeak, level);
                } else {
                    fog.color.copy(_fogIdle);
                }
                bg.copy(fog.color);
            }
            const density = THREE.MathUtils.clamp(knobs.fogDensity, 0, 1);
            const ceil = Math.max(0.05, knobs.fogHeight) * zoom;
            fog.near = density;
            fog.far = Math.max(ceil, density + 0.001);

            const lightMul = THREE.MathUtils.clamp(knobs.lightIntensity, 0, 2);
            if (ambientRef.current) {
                ambientRef.current.intensity = LIGHT_AMBIENT * lightMul;
            }
            if (spotRef.current) {
                spotRef.current.intensity = LIGHT_SPOT * lightMul;
            }
            // point intensity also set in applyGlow; keep in sync when caps skips glow fog path
            light.intensity = LIGHT_POINT * lightMul;
        }

        const city = cityRef.current;
        const field = townRef.current;
        if (!city || !field) return;
        field.scale.setScalar(zoom);

        // Sample spectrum slices once — bounce and/or flicker both consume hits
        const bandHits: Record<CapBand, number> = {
            bass: 0,
            mid: 0,
            high: 0,
        };
        const needHits =
            reactive &&
            viz &&
            trio &&
            (knobs.bandBounce || knobs.bandFlicker);
        if (needHits) {
            for (const key of CAP_BANDS) {
                const cfg = BAND_HEIGHT[key];
                bandHits[key] = sampleBandHit(
                    bandEnvs.current[key],
                    Math.max(0, trio[key]),
                    dt,
                    cfg.drive,
                    cfg.gain,
                );
            }
        } else if (
            bandEnvs.current.bass.primed ||
            bandEnvs.current.mid.primed ||
            bandEnvs.current.high.primed
        ) {
            bandEnvs.current = createBandEnvs();
        }

        // Caps: solid color lerp idle → peak (Flicker toggle)
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
                    const level = knobs.bandFlicker ? bandHits[key] : 0;
                    const fb = BAND_CAP_FALLBACK[key];
                    const pal = palette[key];
                    _capIdle.setHex(cssHexToInt(pal.idle, fb.idle));
                    _capPeak.setHex(cssHexToInt(pal.peak, fb.peak));
                    _capColor.copy(_capIdle).lerp(_capPeak, level);
                    mat.color.copy(_capColor);
                    mat.emissive.copy(_capColor);
                    mat.emissiveIntensity = THREE.MathUtils.lerp(
                        0.25,
                        0.9,
                        level,
                    );
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

        // Reactive band bounce: 3 groups → spectrum lows / mids / highs
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
                    const level = bandHits[key];
                    const prev = prevBands.current[key];
                    // Mid flashes are already spike-shaped — softer onset gate
                    const edge = cfg.drive === "relative" ? 0.04 : BEAT_EDGE;
                    const minHit = cfg.drive === "relative" ? 0.05 : BEAT_MIN;
                    const onset = level > prev + edge && level >= minHit;
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
                const band =
                    (mesh.userData.band as CapBand | undefined) ??
                    CAP_BANDS[i % 3]!;
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
            // Reactive spin: only via Spin channel select (beat = peak/Peak gain)
            let tempoMul = 1;
            if (reactive && viz && knobs.spinChannel !== "off") {
                const level = channelLevel(viz, knobs.spinChannel);
                // Beat: edge on unclipped raw so Peak gain ×3 still punches faster
                const edgeSrc =
                    knobs.spinChannel === "beat"
                        ? beatRaw(viz)
                        : level;
                const edgePrev =
                    knobs.spinChannel === "beat"
                        ? prevSpinRaw.current
                        : prevSpinLevel.current;
                if (
                    risingEdge(edgeSrc, edgePrev, SPIN_EDGE, SPIN_MIN)
                ) {
                    spinImpulse.current = Math.max(
                        spinImpulse.current,
                        Math.min(1, 0.4 + level * 0.65),
                    );
                }
                if (knobs.spinChannel === "beat") {
                    prevSpinRaw.current = edgeSrc;
                }
                prevSpinLevel.current = level;
                spinImpulse.current = Math.max(
                    spinImpulse.current * Math.exp(-dt * SPIN_IMPULSE_DECAY),
                    Math.pow(level, 1.45) * 0.55,
                );
                const accel = Math.max(0, knobs.spinDrive);
                tempoMul =
                    1 + Math.pow(spinImpulse.current, 1.55) * accel;
            } else {
                spinImpulse.current = 0;
                prevSpinLevel.current = 0;
                prevSpinRaw.current = 0;
            }
            city.rotation.y +=
                dir * 8 * ROTATION_SPEED * knobs.spinSpeed * tempoMul;
        }
        if (city.rotation.x < -0.05) city.rotation.x = -0.05;
    });

    const { size: gridSize, divisions: gridDiv } = useMemo(
        () => resolveAuxGrid(live.gridScale),
        [live.gridScale],
    );

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
                ref={spotRef}
                position={[5, 5, 5]}
                rotation={[(45 * Math.PI) / 180, 0, (-45 * Math.PI) / 180]}
                intensity={LIGHT_SPOT}
                distance={10}
                penumbra={0.2}
                castShadow
                shadow-mapSize={[1000, 1000]}
            />
            <pointLight
                ref={lightBackRef}
                position={[0, 4, 0]}
                intensity={LIGHT_POINT}
            />
            <ambientLight ref={ambientRef} intensity={LIGHT_AMBIENT} />
            <gridHelper
                key={`${gridSize}-${gridDiv}`}
                ref={gridRef}
                args={[gridSize, gridDiv, 0xffffff, 0xffffff]}
                position={[0, 0.05, 0]}
                onUpdate={(g) => {
                    const mats = Array.isArray(g.material)
                        ? g.material
                        : [g.material];
                    for (const m of mats) {
                        m.depthWrite = false;
                        m.transparent = true;
                        m.opacity = 0.45;
                    }
                }}
            />
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
            gl={{ antialias: true, preserveDrawingBuffer: true }}
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
            <CameraRig live={live} />
            <City live={live} vizRef={vizRef} />
        </Canvas>
    );
}
