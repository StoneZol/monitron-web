import type { ReactiveChannel } from "@/lib/visualAudio";
import {
    TWINKLE_DEFAULT_L,
    TWINKLE_DEFAULT_S,
    TWINKLE_DEFAULT_SPEED,
} from "@/lib/twinkleHsl";

export type { ReactiveChannel };

export type QuaternionfractalProps = {
    showOverlay?: boolean;
};

/**
 * Color look:
 * - original — stock hue × idle/peak pickers (default)
 * - twinkle — solid HSL hue walk
 */
export type QuaternionfractalColorMode = "original" | "twinkle";

export type QuaternionfractalLive = {
    /** Camera orbit / zoom clock (1 ≈ Shadertoy iTime) */
    cameraSpeed: number;
    colorMode: QuaternionfractalColorMode;
    /** Idle tint (original mode) */
    color: string;
    /** Peak / light target (original mode) */
    colorPeak: string;
    twinkleSpeed: number;
    twinkleS: number;
    twinkleL: number;
    saturation: number;
    /** Light — idle→peak + surface punch */
    colorChannel: ReactiveChannel;
    colorDrive: number;
    /** Cruise — lifts camera clock */
    speedChannel: ReactiveChannel;
    speedDrive: number;
    /** Kick — camera accel punches */
    accelChannel: ReactiveChannel;
    accelDrive: number;
};

export const QUATERNIONFRACTAL_DRIVE_MAX = 8;
export const QUATERNIONFRACTAL_COLOR_DRIVE_MAX = 4;

export const QUATERNIONFRACTAL_DEFAULTS: QuaternionfractalLive = {
    cameraSpeed: 1,
    colorMode: "original",
    color: "#6ec8ff",
    colorPeak: "#ff7ad9",
    twinkleSpeed: TWINKLE_DEFAULT_SPEED,
    twinkleS: TWINKLE_DEFAULT_S,
    twinkleL: TWINKLE_DEFAULT_L,
    saturation: 1,
    colorChannel: "mid",
    colorDrive: 1.3,
    speedChannel: "bass",
    speedDrive: 1.4,
    accelChannel: "beat",
    accelDrive: 1.5,
};

export const QUATERNIONFRACTAL_RANGES = {
    cameraSpeed: { min: 0.05, max: 4, step: 0.05 },
    saturation: { min: 0, max: 2, step: 0.05 },
    colorDrive: { min: 0, max: QUATERNIONFRACTAL_COLOR_DRIVE_MAX, step: 0.1 },
    speedDrive: { min: 0, max: QUATERNIONFRACTAL_DRIVE_MAX, step: 0.1 },
    accelDrive: { min: 0, max: QUATERNIONFRACTAL_DRIVE_MAX, step: 0.1 },
} as const;
