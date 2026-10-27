export type OldguardProps = {
  showOverlay?: boolean;
};

export type OldguardFlagSource = "stock" | "library" | "session";

export type OldguardLive = {
  /** Wave clock (1 ≈ Shadertoy iTime) */
  waveSpeed: number;
  /** Fabric displace + shade strength */
  waveAmount: number;
  saturation: number;
  flagSource: OldguardFlagSource;
  stockId: string;
  libraryId: string | null;
  sessionId: string | null;
};

export const OLDGUARD_DEFAULTS: OldguardLive = {
  waveSpeed: 1,
  waveAmount: 1,
  saturation: 1,
  flagSource: "stock",
  stockId: "RI",
  libraryId: null,
  sessionId: null,
};

export const OLDGUARD_RANGES = {
  waveSpeed: { min: 0.05, max: 3, step: 0.05 },
  waveAmount: { min: 0, max: 2, step: 0.05 },
  saturation: { min: 0, max: 2, step: 0.05 },
} as const;
