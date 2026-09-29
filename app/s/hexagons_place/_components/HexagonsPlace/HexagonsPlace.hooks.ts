"use client";

import { useSyncExternalStore } from "react";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import type { HexagonsPlaceLive } from "./HexagonsPlace.types";

export const HEXAGONS_DEFAULTS: HexagonsPlaceLive = {
  edgeColor: "#ff9940",
  fogColor: "#4b4b4b",
  coloredFog: false,
  garland: false,
  colorSpeed: 40,
  cameraAngle: 11,
  cameraHeight: 8,
  cameraZoom: 1,
  cameraRotate: -60,
  spin: true,
  spinLeft: false,
  fogHeight: 2,
  fogDensity: 0.7,
  hexGrid: 56,
  hexSize: 1.5,
  hexHeightSpread: 1,
  reactive: false,
  bandBounce: true,
  bassBoost: 2,
};

const BASS_BOOST_MAX = 8;

const SCREEN_ID = "hexagons_place";

/** All bands drive hex groups; bass also colors fog / garland speed */
const HEX_VIZ_BANDS = {
  bass: true,
  mid: true,
  high: true,
  beat: true,
} as const;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cached: HexagonsPlaceLive | null = null;

function readPrefs(): HexagonsPlaceLive {
  if (cached) return cached;
  const loaded = loadScreenPrefs(SCREEN_ID, { ...HEXAGONS_DEFAULTS });
  const {
    cameraRotation: _r,
    cameraFocus: _f,
    fogStrength: legacyStrength,
    ...rest
  } = loaded as HexagonsPlaceLive & {
    cameraRotation?: number;
    cameraFocus?: number;
    fogStrength?: number;
  };
  cached = { ...HEXAGONS_DEFAULTS, ...rest };
  // Legacy dolly zoom was ~6–40; scene scale lives in 0.25–2.5
  if (cached.cameraZoom > 3) cached.cameraZoom = HEXAGONS_DEFAULTS.cameraZoom;
  if (
    cached.fogDensity === HEXAGONS_DEFAULTS.fogDensity &&
    typeof legacyStrength === "number"
  ) {
    cached.fogDensity = legacyStrength;
  }
  return cached;
}

function writePrefs(next: HexagonsPlaceLive) {
  cached = next;
  saveScreenPrefs(SCREEN_ID, next);
  emit();
}

export default function useHexagonsPlaceHook() {
  const live = useSyncExternalStore(
    subscribe,
    readPrefs,
    () => HEXAGONS_DEFAULTS,
  );

  const commit = (patch: Partial<HexagonsPlaceLive>) => {
    writePrefs({ ...readPrefs(), ...patch });
  };

  const visualizer = useAudioReactive({
    bands: HEX_VIZ_BANDS,
    preferredReactive: live.reactive,
    onReactiveChange: (reactive) => commit({ reactive }),
  });

  return {
    live,
    visualizer,
    controls: {
      edgeColor: live.edgeColor,
      setEdgeColor: (edgeColor: string) => commit({ edgeColor }),
      fogColor: live.fogColor,
      setFogColor: (fogColor: string) => commit({ fogColor }),
      coloredFog: live.coloredFog,
      setColoredFog: (coloredFog: boolean) => commit({ coloredFog }),
      garland: live.garland,
      setGarland: (garland: boolean) => commit({ garland }),
      colorSpeed: live.colorSpeed,
      setColorSpeed: (colorSpeed: number) => commit({ colorSpeed }),
      cameraAngle: live.cameraAngle,
      setCameraAngle: (cameraAngle: number) => commit({ cameraAngle }),
      cameraHeight: live.cameraHeight,
      setCameraHeight: (cameraHeight: number) => commit({ cameraHeight }),
      cameraZoom: live.cameraZoom,
      setCameraZoom: (cameraZoom: number) => commit({ cameraZoom }),
      cameraRotate: live.cameraRotate,
      setCameraRotate: (cameraRotate: number) => commit({ cameraRotate }),
      spin: live.spin,
      setSpin: (spin: boolean) => commit({ spin }),
      spinLeft: live.spinLeft,
      setSpinLeft: (spinLeft: boolean) => commit({ spinLeft }),
      fogHeight: live.fogHeight,
      setFogHeight: (fogHeight: number) => commit({ fogHeight }),
      fogDensity: live.fogDensity,
      setFogDensity: (fogDensity: number) => commit({ fogDensity }),
      hexGrid: live.hexGrid,
      setHexGrid: (hexGrid: number) => commit({ hexGrid }),
      hexSize: live.hexSize,
      setHexSize: (hexSize: number) => commit({ hexSize }),
      hexHeightSpread: live.hexHeightSpread,
      setHexHeightSpread: (hexHeightSpread: number) =>
        commit({ hexHeightSpread }),
      bandBounce: live.bandBounce,
      setBandBounce: (bandBounce: boolean) => commit({ bandBounce }),
      bassBoost: live.bassBoost,
      setBassBoost: (bassBoost: number) => commit({ bassBoost }),
      bassBoostMax: BASS_BOOST_MAX,
      reset: () => writePrefs({ ...HEXAGONS_DEFAULTS }),
      fullscreen: () => void toggleFullscreen(),
    },
  };
}
