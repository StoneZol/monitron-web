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
   * Garland fog: fixed pickers (no hue cycle).
   * Mutually exclusive with fogParallel; both off = fog follows edge.
   */
  fogFixed: boolean;
  /** Garland fog: hue-cycle fogIdle/fogPeak in parallel with edge */
  fogParallel: boolean;
  /** Multiplier on colorSpeed for parallel fog hue cycle */
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
  /** Scales the aux ground grid helper */
  gridScale: number;
  garland: boolean;
  /**
   * Spectrum caps mode — replaces garland.
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
  /** Hue degrees per second when garland is on */
  colorSpeed: number;
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
  spinAccel: number;
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
  /** When reactive: bounce hex groups on spectrum lows/mids/highs */
  bandBounce: boolean;
  /** When reactive: caps / fog / grid color flicker from spectrum */
  bandFlicker: boolean;
  /** Multiplies low-slice → color/spin speed punch */
  bassBoost: number;
};
