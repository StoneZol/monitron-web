export type FairysmokeProps = {
    showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot. */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

/**
 * Color look:
 * - original — Himred cos(z+t) phase palette (default, the good stuff)
 * - twinkle — solid HSL hue walk + audio light pulse (no phase rainbow)
 * - palette — solid idle→peak (no phase rainbow)
 */
export type FairysmokeColorMode = "original" | "twinkle" | "palette";

export type FairysmokeLive = {
    /** Smoke / turbulence clock (1 ≈ Shadertoy iTime) */
    smokeSpeed: number;
    colorMode: FairysmokeColorMode;
    /** Shell tint — idle (palette mode) */
    color: string;
    /** Tint at audio peak (palette mode) */
    colorPeak: string;
    /** HSL hue cycle prefs (twinkle mode, title "twinkle") */
    twinkleSpeed: number;
    twinkleS: number;
    twinkleL: number;
    /** Look chroma (0 = gray, 1 = default) */
    saturation: number;
    colorChannel: ReactiveChannel;
    colorDrive: number;
    speedChannel: ReactiveChannel;
    speedDrive: number;
};

/** Speed punch drive */
export const FAIRYSMOKE_DRIVE_MAX = 8;
/** Color / twinkle punch — short 0…2 boost */
export const FAIRYSMOKE_COLOR_DRIVE_MAX = 2;

export const FAIRYSMOKE_DEFAULTS: FairysmokeLive = {
    smokeSpeed: 1,
    colorMode: "original",
    color: "#7afdff",
    colorPeak: "#98ff7a",
    twinkleSpeed: 1,
    twinkleS: 100,
    twinkleL: 55,
    saturation: 1,
    colorChannel: "bass",
    colorDrive: 1.2,
    speedChannel: "bass",
    speedDrive: 2,
};

export const FAIRYSMOKE_RANGES = {
    smokeSpeed: { min: 0.1, max: 3, step: 0.05 },
    saturation: { min: 0, max: 2, step: 0.05 },
    colorDrive: { min: 0, max: FAIRYSMOKE_COLOR_DRIVE_MAX, step: 0.05 },
    speedDrive: { min: 0, max: FAIRYSMOKE_DRIVE_MAX, step: 0.1 },
} as const;
