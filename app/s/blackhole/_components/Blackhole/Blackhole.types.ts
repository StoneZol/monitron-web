export type BlackholeProps = {
    showOverlay?: boolean;
};

/** Audio band that drives a motion/look slot (same vocabulary as synthwave). */
export type ReactiveChannel = "off" | "bass" | "mid" | "high" | "beat";

/**
 * Live knobs.
 * Pitch in degrees; yaw/disk spin are unitless speed coeffs (like Shadertoy).
 */
export type BlackholeLive = {
    /** Horizon / disk tint — idle */
    holeColor: string;
    /** Horizon / disk tint — audio peak target */
    holeColorPeak: string;
    /** Hue walk from holeColor while on */
    holeTwinkle: boolean;
    /** Hue walk rate while twinkle is on */
    colorSpeed: number;
    /** Advances disk swirl / star drift */
    flightSpeed: number;
    exposure: number;
    /** Outer march steps (×6 inner) — Shadertoy/Brayns default ~20 */
    nbDisks: number;
    /** Accretion disk / horizon swirl (_Speed) */
    diskRotationSpeed: number;
    diskTextureLayers: number;
    /** Horizon / disk radius (_Size in shader) */
    blackHoleSize: number;
    /** Pulse / shake scale to the hole channel */
    scalePunch: boolean;
    /** How hard scale punches when scalePunch is on */
    scaleDrive: number;
    /** Camera yaw orbit rate — `angle.x += t * yawSpeed` (Shadertoy used 0.1) */
    yawSpeed: number;
    /** Camera pitch in degrees → angle.y */
    pitch: number;
    holeChannel: ReactiveChannel;
    holeDrive: number;
    yawChannel: ReactiveChannel;
    yawDrive: number;
};

export const BLACKHOLE_DEFAULTS: BlackholeLive = {
    holeColor: "#ffcc00",
    holeColorPeak: "#ff6600",
    holeTwinkle: false,
    colorSpeed: 40,
    flightSpeed: 1,
    exposure: 1,
    nbDisks: 20,
    diskRotationSpeed: 0.2,
    diskTextureLayers: 12,
    blackHoleSize: 0.2,
    scalePunch: true,
    scaleDrive: 0.1,
    yawSpeed: 0.1,
    /** Was mouseY 0.49 → angle.y ≈ 2° (mod 360) */
    pitch: 2,
    holeChannel: "bass",
    holeDrive: 1.2,
    yawChannel: "beat",
    yawDrive: 1.4,
};

export const BLACKHOLE_DRIVE_MAX = 8;

/** Temporary wide ranges — replace once dialed in. */
export const BLACKHOLE_RANGES = {
    yawSpeed: { min: 0.01, max: 1, step: 0.01 },
    pitch: { min: -180, max: 180, step: 1 },
    blackHoleSize: { min: 0.05, max: 2, step: 0.01 },
    diskRotationSpeed: { min: 0.05, max: 5, step: 0.05 },
    colorSpeed: { min: 1, max: 180, step: 1 },
    drive: { min: 0, max: BLACKHOLE_DRIVE_MAX, step: 0.1 },
} as const;
