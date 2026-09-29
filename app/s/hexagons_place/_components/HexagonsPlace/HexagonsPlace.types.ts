export type HexagonsPlaceProps = {
  showOverlay?: boolean;
};

/** Live knobs read each frame by the Three scene */
export type HexagonsPlaceLive = {
  edgeColor: string;
  fogColor: string;
  /** Fog tinted by fogColor / garland; off = neutral grey */
  coloredFog: boolean;
  garland: boolean;
  /** Hue degrees per second when garland is on */
  colorSpeed: number;
  /** Pitch down in degrees — rotation.x */
  cameraAngle: number;
  /** Camera position.y */
  cameraHeight: number;
  /** Uniform scale of the hex field */
  cameraZoom: number;
  /** Camera yaw in place — rotation.y, degrees */
  cameraRotate: number;
  /** Auto-spin the hex field */
  spin: boolean;
  /** true = left (CCW), false = right (CW) */
  spinLeft: boolean;
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
  /** Multiplies bass → color/spin speed punch */
  bassBoost: number;
};
