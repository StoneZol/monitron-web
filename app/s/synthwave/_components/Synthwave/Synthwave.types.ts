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
  /** Sun top / disk — WE colorsuntop */
  sunRim: string;
  /** Sun disk bottom of the gradient */
  sunMid: string;
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
  /** Sky / cloud tint */
  skyTop: string;
  /** Horizon glow tint */
  skyHorizon: string;
  /** Band that accelerates road scroll */
  roadChannel: ReactiveChannel;
  /** Band that flashes grid glow / line brightness */
  glowChannel: ReactiveChannel;
  /** Band that punches sun / glow brightness */
  sunChannel: ReactiveChannel;
  /** Hue walk on sun disk (top) color */
  sunTwinkle: boolean;
  /** Hue walk on sun glow (halo) color */
  sunGlowTwinkle: boolean;
  /** Hue walk on grid near/far from picked colors */
  gridTwinkle: boolean;
  /** Hue walk on sky / horizon from picked colors */
  skyTwinkle: boolean;
  /** Hue degrees per second while any twinkle is on */
  colorSpeed: number;
  drive: number;
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};
