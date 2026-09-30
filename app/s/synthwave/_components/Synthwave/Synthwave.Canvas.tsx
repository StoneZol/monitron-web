"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { VizBands } from "@/lib/audioBus";
import { sliceBands } from "@/lib/audioDerive";
import {
    neonGridFragmentShader,
    neonGridVertexShader,
} from "./shaders/neongrid";
import {
    neonSunFragmentShader,
    neonSunVertexShader,
} from "./shaders/neonsun";
import {
    neonSkyFragmentShader,
    neonSkyVertexShader,
} from "./shaders/neonsky";
import type { ReactiveChannel, SynthwaveLive } from "./Synthwave.types";

type SynthwaveCanvasProps = {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
};

/** World cell size — square on every plane. */
const CELL = 0.2;
/** Short default (~⅓ of the view); slider only extends from here. */
const DEPTH_MIN = 2.35;
const DEPTH_MAX = 10;
const WALL_LEN = 8;
const WALL_SEGS = Math.max(2, Math.round(WALL_LEN / CELL));
/** Floor extends this far past the camera (+Z) so near edge goes off-screen. */
const Z_PAD = 1.35;

function roadDepth(length01: number) {
    const t = Math.min(1, Math.max(0, length01));
    return DEPTH_MIN + t * (DEPTH_MAX - DEPTH_MIN);
}

const BEAT_GAIN = 5;

function beatRaw(viz: VizBands) {
    const crest = Math.max(0, viz.peak - viz.rms * 1.2);
    return Math.max(viz.peak, crest * 1.35) * BEAT_GAIN;
}

function softPeak01(x: number) {
    return Math.tanh(Math.max(0, x));
}

function channelLevel(viz: VizBands, ch: ReactiveChannel): number {
    if (ch === "off") return 0;
    if (ch === "beat") return softPeak01(beatRaw(viz));
    if (ch === "bass") return sliceBands(viz.bands, 30, 180);
    if (ch === "mid") return sliceBands(viz.bands, 200, 2000);
    return sliceBands(viz.bands, 2000, 10000);
}

function hexToVec3(hex: string, target: THREE.Color) {
    return target.set(hex);
}

function Sky({
    liveRef,
    meshRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    meshRef: RefObject<THREE.Mesh | null>;
}) {
    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: neonSkyVertexShader,
                fragmentShader: neonSkyFragmentShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    uTime: { value: 0 },
                    uCloudSpeeds: { value: new THREE.Vector2(0.0007, -0.0011) },
                    uCloudScales: { value: new THREE.Vector4(1.1, 1.1, 0.7, 0.7) },
                    uAspect: { value: 1 },
                    uColorClouds: { value: new THREE.Color(0.05, 0.15, 0.4) },
                    uColorHorizon: { value: new THREE.Color(0.05, 0.15, 0.4) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);

    const { size } = useThree();
    useEffect(() => {
        matRef.current.uniforms.uAspect!.value =
            size.width / Math.max(1, size.height);
    }, [size.width, size.height]);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        if (!knobs) return;
        hexToVec3(knobs.skyTop, m.uniforms.uColorClouds!.value);
        hexToVec3(knobs.skyHorizon, m.uniforms.uColorHorizon!.value);
    });

    return (
        <mesh ref={meshRef} renderOrder={-10} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

function NeonSun({
    liveRef,
    vizRef,
    groupRef,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
    groupRef: RefObject<THREE.Group | null>;
}) {
    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: neonSunVertexShader,
                fragmentShader: neonSunFragmentShader,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                blending: THREE.NormalBlending,
                uniforms: {
                    uTime: { value: 0 },
                    uColorSunTop: { value: new THREE.Color(1, 0.85, 0.05) },
                    uColorSunBottom: { value: new THREE.Color(1, 0, 0.35) },
                },
            }),
        [],
    );
    const matRef = useRef(mat);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(({ clock }) => {
        const m = matRef.current;
        const knobs = liveRef.current;
        const viz = vizRef.current;
        m.uniforms.uTime!.value = clock.elapsedTime;
        if (!knobs) return;
        hexToVec3(knobs.sunRim, m.uniforms.uColorSunTop!.value);
        hexToVec3(knobs.sunCore, m.uniforms.uColorSunBottom!.value);
        void viz;
        const depth = roadDepth(knobs.roadLength);
        const zFar = -(depth - Z_PAD);
        if (groupRef.current) {
            groupRef.current.position.set(0, 0.22, zFar - 0.12);
        }
    });

    const base = 2.4;
    return (
        <group
            ref={groupRef}
            position={[0, 0.22, -(DEPTH_MIN - Z_PAD) - 0.12]}
            renderOrder={-5}
        >
            <SunPulse liveRef={liveRef} vizRef={vizRef} baseScale={base}>
                <mesh renderOrder={-5} frustumCulled={false}>
                    <planeGeometry args={[1, 1]} />
                    <primitive object={mat} attach="material" />
                </mesh>
            </SunPulse>
        </group>
    );
}

function SunPulse({
    liveRef,
    vizRef,
    baseScale,
    children,
}: {
    liveRef: RefObject<SynthwaveLive>;
    vizRef: RefObject<VizBands>;
    baseScale: number;
    children: ReactNode;
}) {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        const knobs = liveRef.current;
        const viz = vizRef.current;
        if (!ref.current || !knobs) return;
        const reactive = Boolean(viz?.enabled);
        const sunLv = reactive ? channelLevel(viz!, knobs.sunChannel) : 0;
        const s = baseScale * knobs.sunSize * (0.9 + sunLv * 0.12);
        ref.current.scale.setScalar(s);
    });
    return <group ref={ref}>{children}</group>;
}

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
            uZNear: { value: Z_PAD },
            uZFar: { value: -(DEPTH_MIN - Z_PAD) },
            uTaper: { value: 0.55 },
            uNearWidth: { value: 1.35 },
            uColorGridNear: { value: new THREE.Color(1, 0, 0.2) },
            uColorGridFar: { value: new THREE.Color(0, 0, 1) },
            uColorGridBackground: { value: new THREE.Color(0.1, 0, 0.1) },
        },
    });
}

/** Planar wall quad that follows the tapered floor edge (no vertex X-warp). */
function taperScale(depthT: number, taper: number, nearWidth: number) {
    const farScale = Math.max(nearWidth * (1 - taper), nearWidth * 0.42);
    return nearWidth + (farScale - nearWidth) * depthT;
}

function buildWallGeometry(
    side: -1 | 1,
    hinge: number,
    zNear: number,
    zFar: number,
    taper: number,
    nearWidth: number,
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

    for (let iv = 0; iv <= segsV; iv++) {
        const v = iv / segsV;
        const z = zNear + (zFar - zNear) * v;
        const depthT = (zNear - z) / Math.max(1e-4, zNear - zFar);
        const s = taperScale(depthT, taper, nearWidth);
        const xBot = side * hinge * s;
        const xTop = xBot - side * tipIn;

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

function NeonGrid({
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

    const lastModeRef = useRef<"flat" | "channel" | null>(null);
    const lastAngleRef = useRef(-1);
    const lastOffsetRef = useRef(-1);
    const lastLengthRef = useRef(-1);
    const lastTaperRef = useRef(-1);
    const lastNearRef = useRef(-1);
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

        const mode = knobs.terrainMode;
        const leanDeg = mode === "flat" ? 0 : knobs.wallAngle;
        const offsetCells = Math.max(1, Math.round(knobs.wallOffset));
        const depth = roadDepth(knobs.roadLength);
        const cellsV = depth / CELL;
        const depthSegs = Math.max(2, Math.round(depth / CELL));

        const rate = 2 * knobs.roadSpeed * (1 + roadLv * knobs.drive * 0.5);
        scrollRef.current += Math.max(0, dt) * rate;

        // Perspective: stretch near, ease far crush (channel only).
        const persp = Math.min(12, Math.max(-12, knobs.wallPerspective));
        const t = (persp + 12) / 24;
        const zNear = Z_PAD;
        const zFar = -(depth - Z_PAD);
        const taper = mode === "flat" ? 0 : 0.08 + t * 0.72;
        const nearWidth = mode === "flat" ? 1 : 1.22 + t * 0.5;

        const syncUniforms = (
            mat: THREE.ShaderMaterial,
            taperAmt: number,
            nearW: number,
        ) => {
            mat.uniforms.uScroll!.value = scrollRef.current;
            mat.uniforms.uZNear!.value = zNear;
            mat.uniforms.uZFar!.value = zFar;
            mat.uniforms.uTaper!.value = taperAmt;
            mat.uniforms.uNearWidth!.value = nearW;
            hexToVec3(knobs.roadColor, mat.uniforms.uColorGridNear!.value);
            hexToVec3(knobs.roadFar, mat.uniforms.uColorGridFar!.value);
            hexToVec3(knobs.roadFloor, mat.uniforms.uColorGridBackground!.value);
        };
        syncUniforms(floorM, taper, nearWidth);
        syncUniforms(wallM, 0, 1);

        const floor = floorRef.current;
        const left = leftRef.current;
        const right = rightRef.current;
        if (!floor || !left || !right) return;

        if (
            builtRef.current &&
            mode === lastModeRef.current &&
            Math.abs(leanDeg - lastAngleRef.current) < 0.05 &&
            offsetCells === lastOffsetRef.current &&
            Math.abs(depth - lastLengthRef.current) < 0.01 &&
            Math.abs(taper - lastTaperRef.current) < 0.005 &&
            Math.abs(nearWidth - lastNearRef.current) < 0.005
        ) {
            return;
        }
        lastModeRef.current = mode;
        lastAngleRef.current = leanDeg;
        lastOffsetRef.current = offsetCells;
        lastLengthRef.current = depth;
        lastTaperRef.current = taper;
        lastNearRef.current = nearWidth;
        builtRef.current = true;

        // Flat: wide sheet that fills left/right. Channel: road + hinged walls.
        const floorCellsU =
            mode === "flat" ? 96 : Math.max(1, offsetCells) * 2;
        const floorW = floorCellsU * CELL;
        floorM.uniforms.uCellsU!.value = floorCellsU;
        floorM.uniforms.uCellsV!.value = cellsV;
        wallM.uniforms.uCellsU!.value = wallCellsU;
        wallM.uniforms.uCellsV!.value = cellsV;

        // Near edge at +Z_PAD (past camera), far at −(depth−Z_PAD) toward the sun.
        const zCenter = (Z_PAD - (depth - Z_PAD)) / 2;
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

        const showWalls = mode === "channel";
        const lean = (Math.min(90, Math.max(-90, leanDeg)) * Math.PI) / 180;
        const hinge = floorW / 2;

        const placeWall = (mesh: THREE.Mesh, side: -1 | 1) => {
            mesh.visible = showWalls;
            if (!showWalls) return;
            mesh.geometry.dispose();
            // Planar wall glued to tapered floor edge (no shader X-warp on walls).
            mesh.geometry = buildWallGeometry(
                side,
                hinge,
                zNear,
                zFar,
                taper,
                nearWidth,
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

function Bloom({
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

    // Visibility toggle is reliable (layers were flaky). Bloom sky+sun, then opaque grid on top.
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

function CameraRig({ liveRef }: { liveRef: RefObject<SynthwaveLive> }) {
    useFrame(({ camera }) => {
        const knobs = liveRef.current;
        const cam = camera as THREE.PerspectiveCamera;
        if (!knobs) return;

        const channel = knobs.terrainMode === "channel";
        const half = Math.max(1, Math.round(knobs.wallOffset)) * CELL;
        // Only pull cam in when road is narrower than ±4 cells.
        // At 4+ keep the framing locked — no further back/up shift as offset grows.
        const refHalf = 4 * CELL;
        const t = channel ? Math.min(1, Math.max(0.6, half / refHalf)) : 1;

        const y = channel ? 0.14 + 0.28 * t : 0.42;
        const z = channel ? 0 + 1.2 * t : 1.55;
        const lookY = channel ? 0.06 + 0.08 * t : 0.12;
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
            <Sky liveRef={liveRef} meshRef={skyRef} />
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
