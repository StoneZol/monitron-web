import type { ReactiveChannel } from "@/lib/visualAudio";
import {
    TWINKLE_DEFAULT_L,
    TWINKLE_DEFAULT_S,
    TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type StarleidoscopeProps = {
    showOverlay?: boolean;
};

/**
 * Color look (coral-style):
 * - original — stock DanielXMoore sin-palette + stock iChannel0 FFT hue (default)
 * - paletteTwinkle — stock RGB, HSL hue rotates full cycle (+ stock FFT)
 * - twinkle — solid HSL hue walk
 * - palette — solid idle→peak
 */
export type StarleidoscopeColorMode =
    | "original"
    | "paletteTwinkle"
    | "twinkle"
    | "palette";

export type StarleidoscopeLive = {
    /** Kaleidoscope / layer scroll (1 ≈ Shadertoy iTime) */
    patternSpeed: number;
    /**
     * Color clock — paletteTwinkle phase / twinkle HSL lap (1 ≈ 6s).
     * Original hues come from stock FFT, not this clock.
     */
    colorSpeed: number;
    colorMode: StarleidoscopeColorMode;
    color: string;
    colorPeak: string;
    twinkleS: number;
    twinkleL: number;
    saturation: number;
    /** Cruise — lifts color transition / twinkle rate */
    colorChannel: ReactiveChannel;
    colorDrive: number;
    /** Kick — color rate punches */
    colorAccelChannel: ReactiveChannel;
    colorAccelDrive: number;
    /** Cruise — lifts pattern clock */
    patternChannel: ReactiveChannel;
    patternDrive: number;
    /** Kick — pattern accel punches */
    patternAccelChannel: ReactiveChannel;
    patternAccelDrive: number;
};

export const STARLEIDOSCOPE_DRIVE_MAX = 8;
export const STARLEIDOSCOPE_COLOR_DRIVE_MAX = 4;

export const STARLEIDOSCOPE_DEFAULTS: StarleidoscopeLive = {
    patternSpeed: 1,
    colorSpeed: TWINKLE_DEFAULT_SPEED,
    colorMode: "original",
    color: "#a8c8ff",
    colorPeak: "#ff88cc",
    twinkleS: TWINKLE_DEFAULT_S,
    twinkleL: TWINKLE_DEFAULT_L,
    saturation: 1,
    colorChannel: "mid",
    colorDrive: 1.2,
    colorAccelChannel: "beat",
    colorAccelDrive: 1.2,
    patternChannel: "bass",
    patternDrive: 1.2,
    patternAccelChannel: "beat",
    patternAccelDrive: 1.2,
};

export const STARLEIDOSCOPE_RANGES = {
    patternSpeed: { min: 0.05, max: 10, step: 0.05 },
    colorSpeed: { min: 0, max: 4, step: 0.05 },
    saturation: { min: 0, max: 2, step: 0.05 },
    twinkleS: { min: 0, max: 100, step: 1 },
    twinkleL: { min: 0, max: 100, step: 1 },
    colorDrive: { min: 0, max: STARLEIDOSCOPE_COLOR_DRIVE_MAX, step: 0.1 },
    colorAccelDrive: { min: 0, max: STARLEIDOSCOPE_COLOR_DRIVE_MAX, step: 0.1 },
    patternDrive: { min: 0, max: STARLEIDOSCOPE_DRIVE_MAX, step: 0.1 },
    patternAccelDrive: { min: 0, max: STARLEIDOSCOPE_DRIVE_MAX, step: 0.1 },
} as const;
