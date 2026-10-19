"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRenderDpr } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import {
  DEFAULT_STOCK_ID,
  stockPlaceholderSrc,
} from "@/lib/stockPlaceholders";
import {
  getMediaLibraryEntry,
  getSessionMediaEntry,
} from "@/lib/userMedia";
import type { HeartfeltLive } from "./Heartfelt.types";
import {
  heartfeltFragmentShader,
  heartfeltVertexShader,
} from "./shaders/heartfelt";

type HeartfeltCanvasProps = {
  liveRef: RefObject<HeartfeltLive>;
};

function prepBgTexture(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function resolveBgUrl(live: HeartfeltLive): { key: string; url: string } {
  if (live.bgSource === "session" && live.sessionId) {
    const entry = getSessionMediaEntry(live.sessionId);
    if (entry) return { key: `sess:${entry.id}`, url: entry.objectUrl };
  }
  if (live.bgSource === "library" && live.libraryId) {
    const entry = getMediaLibraryEntry(live.libraryId);
    if (entry) return { key: `lib:${entry.id}`, url: entry.url };
  }
  const stockId = live.stockId || DEFAULT_STOCK_ID;
  return { key: `stock:${stockId}`, url: stockPlaceholderSrc(stockId) };
}

function HeartfeltQuad({ liveRef }: { liveRef: RefObject<HeartfeltLive> }) {
  const loader = useMemo(() => new THREE.TextureLoader(), []);
  const channelRef = useRef<THREE.Texture | null>(null);
  const loadedKey = useRef<string | undefined>(undefined);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: heartfeltVertexShader,
        fragmentShader: heartfeltFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          iChannel0: { value: null },
          iChannelResolution: { value: new THREE.Vector2(1, 1) },
          uRainAmount: { value: 0.75 },
          uDropSpeed: { value: 1 },
          uGlass: { value: 0.85 },
          uLightning: { value: 0.35 },
        },
      }),
    [],
  );
  const matRef = useRef(mat);
  const drawSize = useMemo(() => new THREE.Vector2(), []);

  const { gl, size } = useThree();
  useEffect(() => {
    gl.getDrawingBufferSize(drawSize);
    matRef.current.uniforms.iResolution!.value.set(drawSize.x, drawSize.y, 1);
  }, [drawSize, gl, size.height, size.width]);

  useEffect(
    () => () => {
      mat.dispose();
      channelRef.current?.dispose();
    },
    [mat],
  );

  useEffect(() => {
    return registerRuntimeReset("heartfelt", () => {
      loadedKey.current = undefined;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inflight: string | null = null;

    const applyTex = (key: string, tex: THREE.Texture) => {
      prepBgTexture(tex);
      const prev = channelRef.current;
      channelRef.current = tex;
      matRef.current.uniforms.iChannel0!.value = tex;
      const img = tex.image as { width?: number; height?: number } | undefined;
      matRef.current.uniforms.iChannelResolution!.value.set(
        Math.max(1, img?.width ?? 1),
        Math.max(1, img?.height ?? 1),
      );
      loadedKey.current = key;
      inflight = null;
      if (prev && prev !== tex) prev.dispose();
    };

    const tick = () => {
      const { key, url } = resolveBgUrl(liveRef.current);
      if (key === loadedKey.current || key === inflight) return;
      inflight = key;

      // Remote URLs need CORS; stock is same-origin
      loader.setCrossOrigin("anonymous");
      loader.load(
        url,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          applyTex(key, tex);
        },
        undefined,
        () => {
          if (cancelled) return;
          inflight = null;
          // Fallback to stock if remote fails
          if (key.startsWith("lib:")) {
            const stockId = liveRef.current.stockId || DEFAULT_STOCK_ID;
            const fbKey = `stock:${stockId}`;
            const fbUrl = stockPlaceholderSrc(stockId);
            inflight = fbKey;
            loader.load(
              fbUrl,
              (tex) => {
                if (cancelled) {
                  tex.dispose();
                  return;
                }
                applyTex(fbKey, tex);
              },
              undefined,
              () => {
                inflight = null;
              },
            );
          }
        },
      );
    };

    tick();
    const id = window.setInterval(tick, 350);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [liveRef, loader]);

  useFrame(({ clock, gl: g }) => {
    const m = matRef.current;
    const live = liveRef.current;
    g.getDrawingBufferSize(drawSize);
    m.uniforms.iResolution!.value.set(drawSize.x, drawSize.y, 1);
    m.uniforms.iTime!.value = clock.elapsedTime;
    m.uniforms.uRainAmount!.value = live.rainAmount;
    m.uniforms.uDropSpeed!.value = live.dropSpeed;
    m.uniforms.uGlass!.value = live.glass;
    m.uniforms.uLightning!.value = live.lightning;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function HeartfeltCanvas({ liveRef }: HeartfeltCanvasProps) {
  const dpr = useRenderDpr("heartfelt", 1, 2);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      dpr={dpr}
      orthographic
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <HeartfeltQuad liveRef={liveRef} />
    </Canvas>
  );
}
