"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  getMediaLibraryEntry,
  getSessionMediaEntry,
  libraryImageSrc,
} from "@/lib/userMedia";
import { useRenderDpr } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import {
  DEFAULT_FLAG_ID,
  isOldGuardFlagId,
  oldGuardFlagSrc,
} from "./Oldguard.flags";
import type { OldguardLive } from "./Oldguard.types";
import {
  oldguardFragmentShader,
  oldguardVertexShader,
} from "./shaders/oldguard";

type OldguardCanvasProps = {
  liveRef: RefObject<OldguardLive>;
};

function resolveFlagUrl(live: OldguardLive): { key: string; url: string } {
  if (live.flagSource === "session" && live.sessionId) {
    const entry = getSessionMediaEntry(live.sessionId);
    if (entry) {
      return { key: `sess:${entry.id}`, url: entry.objectUrl };
    }
  }
  if (live.flagSource === "library" && live.libraryId) {
    const entry = getMediaLibraryEntry(live.libraryId);
    if (entry) {
      return { key: `lib:${entry.id}`, url: libraryImageSrc(entry) };
    }
  }
  const id = isOldGuardFlagId(live.stockId) ? live.stockId : DEFAULT_FLAG_ID;
  return { key: `stock:${id}`, url: oldGuardFlagSrc(id) };
}

function OldguardQuad({ liveRef }: { liveRef: RefObject<OldguardLive> }) {
  const waveT = useRef(0);
  const lastT = useRef(0);
  const texKey = useRef<string>("");
  const texRef = useRef<THREE.Texture | null>(null);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: oldguardVertexShader,
        fragmentShader: oldguardFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          uWaveT: { value: 0 },
          uWaveAmount: { value: 1 },
          uSaturation: { value: 1 },
          iChannel0: { value: null },
        },
      }),
    [],
  );
  const matRef = useRef(mat);

  const { size } = useThree();
  useEffect(() => {
    matRef.current.uniforms.iResolution!.value.set(
      size.width,
      size.height,
      1,
    );
  }, [size.height, size.width]);

  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    return registerRuntimeReset("old_guard", () => {
      waveT.current = 0;
      lastT.current = 0;
    });
  }, []);

  useFrame(({ clock }) => {
    const m = matRef.current;
    const live = liveRef.current;
    const t = clock.elapsedTime;
    const dt = Math.min(0.05, Math.max(0, t - lastT.current));
    lastT.current = t;

    waveT.current += dt * Math.max(0.05, live.waveSpeed);

    const { key, url } = resolveFlagUrl(live);
    if (key !== texKey.current) {
      texKey.current = key;
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (tex) => {
          if (texKey.current !== key) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.generateMipmaps = true;
          tex.needsUpdate = true;
          texRef.current?.dispose();
          texRef.current = tex;
          m.uniforms.iChannel0!.value = tex;
        },
        undefined,
        () => {
          /* keep previous tex on fail */
        },
      );
    }

    m.uniforms.uWaveT!.value = waveT.current;
    m.uniforms.uWaveAmount!.value = Math.max(0, live.waveAmount);
    m.uniforms.uSaturation!.value = Math.max(0, live.saturation);
  });

  useEffect(
    () => () => {
      texRef.current?.dispose();
      texRef.current = null;
    },
    [],
  );

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function OldguardCanvas({ liveRef }: OldguardCanvasProps) {
  const dpr = useRenderDpr("old_guard", 1, 1.5);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      dpr={dpr}
      orthographic
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000");
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <OldguardQuad liveRef={liveRef} />
    </Canvas>
  );
}
