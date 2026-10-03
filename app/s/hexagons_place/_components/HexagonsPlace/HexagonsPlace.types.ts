import type { AudioSource } from "@/hooks/useAudioReactive";

export type HexagonsPlaceProps = {
  showOverlay?: boolean;
};

/** Shared reactive driver for fog / grid / spin */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

/** Live knobs read each frame by the Three scene */
export type HexagonsPlaceLive = {
  edgeColor: string;
  /** Fog rest tint (non-caps) */
  fogIdle: string;
  /** Fog bass-hit tint (non-caps) */
  fogPeak: string;
  /**
   * Twinkle fog: fixed pickers (no hue cycle).
   * Mutually exclusive with fogParallel; both off = fog follows edge.
   */
  fogFixed: boolean;
  /** Twinkle fog: hue-cycle fog in parallel with edge */
  fogParallel: boolean;
  /** Multiplier on twinkleSpeed for parallel fog hue cycle */
  fogParallelSpeed: number;
  /** Aux ground grid tint when gridFixed */
  gridColor: string;
  /** Fixed picker vs follow edge / reactive grid palette */
  gridFixed: boolean;
  /** Grid palette — idle / peak (jumps driven by gridChannel when reactive) */
  capGridIdle: string;
  capGridPeak: string;
  /** Reactive: which audio band drives grid idle→peak; off = static idle */
  gridChannel: ReactiveChannel;
  /** Color / twinkle pulse boost for grid (0…2) */
  gridDrive: number;
  /** Scales the aux ground grid helper */
  gridScale: number;
  /** HSL twinkle on edges / fog (title "twinkle"); mutex with caps */
  twinkle: boolean;
  twinkleSpeed: number;
  twinkleS: number;
  twinkleL: number;
  /**
   * Spectrum caps mode — replaces twinkle.
   * Black edges; top faces colored by bass/mid/high.
   */
  caps: boolean;
  /** Caps palette — idle (rest) / peak (hit) */
  capBassIdle: string;
  capBassPeak: string;
  capMidIdle: string;
  capMidPeak: string;
  capHighIdle: string;
  capHighPeak: string;
  /** Caps fog palette — idle / peak (jumps via fogChannel when reactive) */
  capFogIdle: string;
  capFogPeak: string;
  /** Reactive: which audio band drives caps/non-fixed fog idle→peak; off = static idle */
  fogChannel: ReactiveChannel;
  /** Color / twinkle pulse boost for fog (0…2) */
  fogDrive: number;
  /** Pitch down in degrees — tips the view, does not move the camera */
  cameraAngle: number;
  /** Camera position.y — independent of angle */
  cameraHeight: number;
  /** Orbit radius from town axis (XZ distance) */
  cameraOffset: number;
  /** Uniform scale of the hex field (approach / pull back) */
  cameraZoom: number;
  /** Camera orbit yaw in degrees — pans the view left / right */
  cameraRotate: number;
  /** Auto-spin the hex field */
  spin: boolean;
  /** true = left (CCW), false = right (CW) */
  spinLeft: boolean;
  /** Base spin rate multiplier */
  spinSpeed: number;
  /** Reactive: which band punches spin speed; off = constant spinSpeed */
  spinChannel: ReactiveChannel;
  /** Multiplies spin channel punches (acceleration feel) */
  spinDrive: number;
  /** How high the fog layer sits above the grid (world Y at zoom=1) */
  fogHeight: number;
  /** 0 = clear, 1 = opaque haze inside the fog layer */
  fogDensity: number;
  /** Scene light multiplier (1 = default ambient/spot/point) */
  lightIntensity: number;
  /** Grid extent (NxN hexes) */
  hexGrid: number;
  /** Individual hex radius / spacing scale */
  hexSize: number;
  /** Random height range of hexes — mountains through fog */
  hexHeightSpread: number;
  /** Audio feed: off | mic | plugin (legacy `reactive` migrated in hooks) */
  audioSource: AudioSource;
  /** Mic noise-gate threshold (only used when audioSource === mic) */
  micGate: number;
  /** Peak ×gain for bus meters + viz (owned by useAudioReactive) */
  peakGain: number;
  /** When reactive: bounce hex groups on spectrum lows/mids/highs */
  bandBounce: boolean;
  /** When reactive: caps / fog / grid color flicker from spectrum */
  bandFlicker: boolean;
  /** Legacy prefs only — was hue-speed mul under garland */
  bassBoost: number;
};

/** Spin punch drive */
export const HEXAGONS_DRIVE_MAX = 8;
/** Fog / grid color punch */
export const HEXAGONS_COLOR_DRIVE_MAX = 2;
