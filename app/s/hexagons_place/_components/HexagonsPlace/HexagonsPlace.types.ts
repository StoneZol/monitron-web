export type HexagonsPlaceProps = {
  showOverlay?: boolean;
};

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
  /** Beat washes fog in caps mode */
  capBeatFogIdle: string;
  capBeatFogPeak: string;
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
  /** Base spin rate multiplier (BPM still scales on top when reactive) */
  spinSpeed: number;
  /** How high the fog layer sits above the grid (world Y at zoom=1) */
  fogHeight: number;
  /** 0 = clear, 1 = opaque haze inside the fog layer */
  fogDensity: number;
  /** Grid extent (NxN hexes) */
  hexGrid: number;
  /** Individual hex radius / spacing scale */
  hexSize: number;
  /** Random height range of hexes — mountains through fog */
  hexHeightSpread: number;
  /** Prefer extension reactive when plugin is online */
  reactive: boolean;
  /** When reactive: bounce hex groups on bass/mid/high/beat */
  bandBounce: boolean;
  /** Multiplies bass → color/spin speed punch */
  bassBoost: number;
};
