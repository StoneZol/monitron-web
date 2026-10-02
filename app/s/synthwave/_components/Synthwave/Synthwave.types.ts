import type { AudioSource } from "@/hooks/useAudioReactive";

export type SynthwaveProps = {
  showOverlay?: boolean;
};

export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

export type SynthwaveLive = {
  /** Grid near idle — WE gridnear */
  roadColor: string;
  /** Grid near peak (glow channel) */
  roadColorPeak: string;
  /** Grid far idle — WE gridfar */
  roadFar: string;
  /** Grid far peak (glow channel) */
  roadFarPeak: string;
  /** Terrain fill — WE gridbackground */
  roadFloor: string;
  /** Grid line glow / halo (0…40) */
  roadGlow: number;
  /** Grid line thickness scale (0.5…3, 1 = default) */
  roadThickness: number;
  /** Scroll multiplier (WE base ≈ 1 → uScrollSpeed 2) */
  roadSpeed: number;
  /** Sun top idle — WE colorsuntop */
  sunRim: string;
  /** Sun top peak (sun channel) */
  sunRimPeak: string;
  /** Sun bottom idle */
  sunMid: string;
  /** Sun bottom peak (sun channel) */
  sunMidPeak: string;
  /** Sun glow / halo tint */
  sunCore: string;
  /** Multiplier on WE sun scale */
  sunSize: number;
  /** Disk brightness (1 = default) */
  sunBrightness: number;
  /** Bottom color fill up the disk (0 = tip only, 1 = full gradient) */
  sunGradientStart: number;
  /** Glow / halo brightness (1 = default) */
  sunGlowBrightness: number;
  /** Unused legacy tint */
  mountPeak: string;
  /** Wall lean from vertical (−90 flat outward … 0 vertical … +90 flat over the road) */
  wallAngle: number;
  /** How far walls sit from center near the camera (cells of flat road each side) */
  wallOffset: number;
  /** Camera foreshortening (0 flat … 40 strong vanishing point); geometry stays planar */
  wallPerspective: number;
  /** Marks 0…40 perspective scale (migrates old signed −12…+12). */
  perspV2?: boolean;
  /** Extra road length beyond the short default (0 = ~⅓ screen, 1 = full stretch) */
  roadLength: number;
  /** Audio kicks stretch road toward horizon; idle returns to roadLength */
  roadStretch: boolean;
  /** Sky / cloud idle */
  skyTop: string;
  /** Sky / cloud peak (beat) */
  skyTopPeak: string;
  /** Decorative horizon glow (static — not twinkled / not beat-lerped) */
  skyHorizon: string;
  /** Legacy prefs only; horizon is decorative and ignores peak */
  skyHorizonPeak: string;
  /** Cloud drift speed (1 = WE-ish base) */
  skySpeed: number;
  /** Cloud drift direction in degrees (0 = +X, −90 = −Y) */
  skyDirection: number;
  /** Band that accelerates road scroll */
  roadChannel: ReactiveChannel;
  /** How hard road channel punches scroll (legacy single `drive`) */
  roadDrive: number;
  /** Band that flashes grid glow / line brightness */
  glowChannel: ReactiveChannel;
  /** Multiplier on glow channel level (1 = previous hardcoded feel) */
  glowDrive: number;
  /** Band that punches sun / glow brightness */
  sunChannel: ReactiveChannel;
  /** Multiplier on sun channel level (1 = previous hardcoded feel) */
  sunDrive: number;
  /** Garland hue walk on sun (from idle); peak unused while on */
  sunTwinkle: boolean;
  /** Hue walk on sun glow (halo) color */
  sunGlowTwinkle: boolean;
  /** Garland hue walk on grid (from idle) */
  gridTwinkle: boolean;
  /** Garland hue walk on sky clouds only (horizon excluded) */
  skyTwinkle: boolean;
  /** Hue degrees per second while any twinkle is on */
  colorSpeed: number;
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};
