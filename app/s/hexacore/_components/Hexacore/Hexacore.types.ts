export type HexacoreProps = {
  showOverlay?: boolean;
};

export type HexacoreLive = {
  /** Camera advance along the tunnel (1 ≈ Shadertoy default) */
  flightSpeed: number;
  /** Crystal / energy tint */
  color: string;
  /** Energy pulse + emissive circuitry (“garland”) */
  garland: boolean;
};

export const HEXACORE_DEFAULTS: HexacoreLive = {
  flightSpeed: 1,
  color: "#c8a0ff",
  garland: true,
};

export const HEXACORE_RANGES = {
  flightSpeed: { min: 0.1, max: 3, step: 0.05 },
} as const;
