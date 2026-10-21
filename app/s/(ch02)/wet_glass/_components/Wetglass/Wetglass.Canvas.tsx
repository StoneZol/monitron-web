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
  libraryImageSrc,
} from "@/lib/userMedia";
import { getSessionVideoEntry } from "@/lib/sessionVideo";
import { setBgCropFromAspects } from "./Wetglass.bgCrop";
import type { WetglassLive } from "./Wetglass.types";
import {
  wetglassFragmentShader,
  wetglassVertexShader,
} from "./shaders/wetglass";

type WetglassCanvasProps = {
  liveRef: RefObject<WetglassLive>;
};

/** Crossfade duration when the background key changes */
const CROSSFADE_SEC = 1.15;

function prepBgTexture(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  // Same mip path for stills + video so textureLod glass fog matches.
  // VideoTexture re-uploads each frame; WebGL2 regenerateMipmap keeps frost real.
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function disposeBgTexture(tex: THREE.Texture | null) {
  if (!tex) return;
  const img = tex.image as unknown;
  if (img instanceof HTMLVideoElement) {
    img.pause();
    img.removeAttribute("src");
    img.load();
  }
  tex.dispose();
}

function loadVideoTexture(url: string): Promise<THREE.VideoTexture> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = () => {
      video.removeAttribute("src");
      video.load();
      reject(new Error("video load failed"));
    };
    video.addEventListener(
      "loadeddata",
      () => {
        void video.play().catch(() => {
          /* muted autoplay usually ok; keep texture anyway */
        });
        const tex = new THREE.VideoTexture(video);
        prepBgTexture(tex);
        resolve(tex);
      },
      { once: true },
    );
    video.addEventListener("error", fail, { once: true });
  });
}

function texSize(tex: THREE.Texture): { w: number; h: number } {
  const img = tex.image as
    | HTMLVideoElement
    | { width?: number; height?: number; videoWidth?: number; videoHeight?: number }
    | undefined;
  if (img && typeof HTMLVideoElement !== "undefined" && img instanceof HTMLVideoElement) {
    return {
      w: Math.max(1, img.videoWidth || img.width || 1),
      h: Math.max(1, img.videoHeight || img.height || 1),
    };
  }
  return {
    w: Math.max(1, img?.width ?? 1),
    h: Math.max(1, img?.height ?? 1),
  };
}

function resolveBgUrl(
  live: WetglassLive,
): { key: string; url: string; kind: "image" | "video" } {
  if (live.bgSource === "video" && live.videoId) {
    const entry = getSessionVideoEntry(live.videoId);
    if (entry) {
      return { key: `vid:${entry.id}`, url: entry.objectUrl, kind: "video" };
    }
  }
  if (live.bgSource === "session" && live.sessionId) {
    const entry = getSessionMediaEntry(live.sessionId);
    if (entry) {
      return { key: `sess:${entry.id}`, url: entry.objectUrl, kind: "image" };
    }
  }
  if (live.bgSource === "library" && live.libraryId) {
    const entry = getMediaLibraryEntry(live.libraryId);
    // Remote URLs via same-origin proxy (prod CORS / hotlink 403)
    if (entry) {
      return {
        key: `lib:${entry.id}`,
        url: libraryImageSrc(entry),
        kind: "image",
      };
    }
  }
  const stockId = live.stockId || DEFAULT_STOCK_ID;
  return {
    key: `stock:${stockId}`,
    url: stockPlaceholderSrc(stockId),
    kind: "image",
  };
}

function WetglassQuad({ liveRef }: { liveRef: RefObject<WetglassLive> }) {
  const loader = useMemo(() => new THREE.TextureLoader(), []);
  const fromRef = useRef<THREE.Texture | null>(null);
  const toRef = useRef<THREE.Texture | null>(null);
  const fromKey = useRef<string | undefined>(undefined);
  const toKey = useRef<string | undefined>(undefined);
  const inflightKey = useRef<string | null>(null);
  const crossfade = useRef(0);
  const fading = useRef(false);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: wetglassVertexShader,
        fragmentShader: wetglassFragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          iResolution: { value: new THREE.Vector3(1, 1, 1) },
          iTime: { value: 0 },
          iChannel0: { value: null },
          iChannel1: { value: null },
          iChannelResolution0: { value: new THREE.Vector2(1, 1) },
          iChannelResolution1: { value: new THREE.Vector2(1, 1) },
          uCrossfade: { value: 0 },
          uBgAlign: { value: new THREE.Vector2(0.5, 0.5) },
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

  const bindSlot = (
    slot: 0 | 1,
    tex: THREE.Texture | null,
  ) => {
    const m = matRef.current;
    if (slot === 0) {
      m.uniforms.iChannel0!.value = tex;
      if (tex) {
        const { w, h } = texSize(tex);
        m.uniforms.iChannelResolution0!.value.set(w, h);
      }
    } else {
      m.uniforms.iChannel1!.value = tex;
      if (tex) {
        const { w, h } = texSize(tex);
        m.uniforms.iChannelResolution1!.value.set(w, h);
      }
    }
  };

  const publishCrop = () => {
    const m = matRef.current;
    const useTo = fading.current && crossfade.current >= 0.5;
    const res = useTo
      ? m.uniforms.iChannelResolution1!.value
      : m.uniforms.iChannelResolution0!.value;
    setBgCropFromAspects(drawSize.x, drawSize.y, res.x, res.y);
  };

  const finishCrossfade = () => {
    const prev = fromRef.current;
    const next = toRef.current;
    if (next) {
      fromRef.current = next;
      fromKey.current = toKey.current;
      bindSlot(0, next);
      bindSlot(1, next);
    }
    toRef.current = null;
    toKey.current = undefined;
    crossfade.current = 0;
    fading.current = false;
    matRef.current.uniforms.uCrossfade!.value = 0;
    if (prev && prev !== next) disposeBgTexture(prev);
    publishCrop();
  };

  const startCrossfade = (key: string, tex: THREE.Texture) => {
    prepBgTexture(tex);
    // First image — no fade
    if (!fromRef.current) {
      fromRef.current = tex;
      fromKey.current = key;
      bindSlot(0, tex);
      bindSlot(1, tex);
      crossfade.current = 0;
      fading.current = false;
      matRef.current.uniforms.uCrossfade!.value = 0;
      inflightKey.current = null;
      publishCrop();
      return;
    }
    // Already showing this key
    if (fromKey.current === key && !fading.current) {
      disposeBgTexture(tex);
      inflightKey.current = null;
      return;
    }
    // Interrupt in-progress fade: snap to mid target, then fade to new
    if (fading.current && toRef.current) {
      const mid = toRef.current;
      const old = fromRef.current;
      fromRef.current = mid;
      fromKey.current = toKey.current;
      bindSlot(0, mid);
      if (old && old !== mid) disposeBgTexture(old);
    }
    const staleTo = toRef.current;
    toRef.current = tex;
    toKey.current = key;
    bindSlot(1, tex);
    crossfade.current = 0;
    fading.current = true;
    matRef.current.uniforms.uCrossfade!.value = 0;
    inflightKey.current = null;
    if (staleTo && staleTo !== tex && staleTo !== fromRef.current) {
      disposeBgTexture(staleTo);
    }
    publishCrop();
  };

  useEffect(() => {
    gl.getDrawingBufferSize(drawSize);
    matRef.current.uniforms.iResolution!.value.set(drawSize.x, drawSize.y, 1);
    publishCrop();
  }, [drawSize, gl, size.height, size.width]);

  useEffect(
    () => () => {
      mat.dispose();
      disposeBgTexture(fromRef.current);
      disposeBgTexture(toRef.current);
    },
    [mat],
  );

  useEffect(() => {
    return registerRuntimeReset("wet_glass", () => {
      fromKey.current = undefined;
      toKey.current = undefined;
      inflightKey.current = null;
      fading.current = false;
      crossfade.current = 0;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fallbackStock = () => {
      const stockId = liveRef.current.stockId || DEFAULT_STOCK_ID;
      const fbKey = `stock:${stockId}`;
      const fbUrl = stockPlaceholderSrc(stockId);
      if (
        fbKey === fromKey.current ||
        fbKey === toKey.current ||
        fbKey === inflightKey.current
      ) {
        return;
      }
      inflightKey.current = fbKey;
      loadKey(fbKey, fbUrl, "image");
    };

    const loadKey = (
      key: string,
      url: string,
      kind: "image" | "video",
    ) => {
      if (kind === "video") {
        void loadVideoTexture(url).then(
          (tex) => {
            if (cancelled) {
              disposeBgTexture(tex);
              return;
            }
            if (inflightKey.current !== key) {
              disposeBgTexture(tex);
              return;
            }
            startCrossfade(key, tex);
          },
          () => {
            if (cancelled) return;
            if (inflightKey.current !== key) return;
            inflightKey.current = null;
            fallbackStock();
          },
        );
        return;
      }

      loader.setCrossOrigin("anonymous");
      loader.load(
        url,
        (tex) => {
          if (cancelled) {
            disposeBgTexture(tex);
            return;
          }
          if (inflightKey.current !== key) {
            disposeBgTexture(tex);
            return;
          }
          startCrossfade(key, tex);
        },
        undefined,
        () => {
          if (cancelled) return;
          if (inflightKey.current !== key) return;
          inflightKey.current = null;
          if (key.startsWith("lib:") || key.startsWith("vid:")) {
            fallbackStock();
          }
        },
      );
    };

    const tick = () => {
      const { key, url, kind } = resolveBgUrl(liveRef.current);
      if (
        key === fromKey.current ||
        key === toKey.current ||
        key === inflightKey.current
      ) {
        return;
      }
      inflightKey.current = key;
      loadKey(key, url, kind);
    };

    tick();
    const id = window.setInterval(tick, 350);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [liveRef, loader]);

  useFrame(({ clock, gl: g }, dt) => {
    const m = matRef.current;
    const live = liveRef.current;
    g.getDrawingBufferSize(drawSize);
    m.uniforms.iResolution!.value.set(drawSize.x, drawSize.y, 1);
    m.uniforms.iTime!.value = clock.elapsedTime;
    m.uniforms.uRainAmount!.value = live.rainAmount;
    m.uniforms.uDropSpeed!.value = live.dropSpeed;
    m.uniforms.uGlass!.value = live.glass;
    m.uniforms.uLightning!.value = live.lightning;
    m.uniforms.uBgAlign!.value.set(live.bgAlignX, live.bgAlignY);

    // Video metadata can arrive after first bind — keep cover UV honest
    const t0 = fromRef.current;
    const t1 = toRef.current ?? t0;
    if (t0) {
      const { w, h } = texSize(t0);
      m.uniforms.iChannelResolution0!.value.set(w, h);
    }
    if (t1) {
      const { w, h } = texSize(t1);
      m.uniforms.iChannelResolution1!.value.set(w, h);
    }

    if (fading.current) {
      const dur = Math.min(
        CROSSFADE_SEC,
        Math.max(0.35, live.slideshowIntervalSec * 0.2),
      );
      crossfade.current = Math.min(1, crossfade.current + dt / dur);
      m.uniforms.uCrossfade!.value = crossfade.current;
      if (crossfade.current >= 1) finishCrossfade();
    }

    publishCrop();
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function WetglassCanvas({ liveRef }: WetglassCanvasProps) {
  const dpr = useRenderDpr("wet_glass", 1, 2);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      dpr={dpr}
      orthographic
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <WetglassQuad liveRef={liveRef} />
    </Canvas>
  );
}
