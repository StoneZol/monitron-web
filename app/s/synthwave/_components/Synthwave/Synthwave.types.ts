import type { AudioSource } from "@/hooks/useAudioReactive";

export type SynthwaveProps = {
  showOverlay?: boolean;
};

export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

export type SynthwaveLive = {
  /** Grid near (pink) — WE gridnear */
  roadColor: string;
  /** Grid far (blue) — WE gridfar */
  roadFar: string;
  /** Terrain fill — WE gridbackground */
  roadFloor: string;
  /** Grid line glow / halo (0…40) */
  roadGlow: number;
  /** Grid line thickness scale (0.5…3, 1 = default) */
  roadThickness: number;
  /** Scroll multiplier (WE base ≈ 1 → uScrollSpeed 2) */
  roadSpeed: number;
  /** Sun top — WE colorsuntop */
  sunRim: string;
  /** Unused mid stop in WE sun (kept for prefs) */
  sunMid: string;
  /** Sun bottom — WE colorsunbottom */
  sunCore: string;
  /** Multiplier on WE sun scale */
  sunSize: number;
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
  /** Sky / cloud tint */
  skyTop: string;
  /** Horizon glow tint */
  skyHorizon: string;
  /** Band that accelerates road scroll */
  roadChannel: ReactiveChannel;
  /** Hue walk on sun top/bottom from picked colors */
  sunTwinkle: boolean;
  /** Hue walk on grid near/far from picked colors */
  gridTwinkle: boolean;
  /** Hue walk on sky / horizon from picked colors */
  skyTwinkle: boolean;
  drive: number;
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};
