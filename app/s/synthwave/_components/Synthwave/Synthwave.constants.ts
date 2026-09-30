/**
 * Road / wall layout + perspective taper coeffs.
 *
 * Grid paint stays UV-based (floor & walls share uv.y × cellsV) so seams lock.
 * Taper only warps floor X in the vertex shader; walls are rebuilt to the
 * tapered edge in CPU geometry.
 *
 * Perspective knob (−12…+12) → t ∈ [0,1]:
 *   taper     = TAPER_MIN + t * TAPER_RANGE
 *   nearWidth = NEAR_W_BASE + t * NEAR_W_RANGE
 *   farScale  = max(nearWidth * (1 − taper), nearWidth * FAR_FLOOR)
 *   scale(z)  = mix(nearWidth, farScale, depthT)
 *
 * Tuning squares later = change these coeffs, not the UV seam contract.
 */

/** World cell size — square on every plane (UV × cells). */
export const CELL = 0.2;

/** Short default (~⅓ of the view); slider only extends from here. */
export const DEPTH_MIN = 2.35;
export const DEPTH_MAX = 10;

export const WALL_LEN = 8;
export const WALL_SEGS = Math.max(2, Math.round(WALL_LEN / CELL));

/** Floor extends this far past the camera (+Z) so near edge goes off-screen. */
export const Z_PAD = 1.35;

/** Perspective slider maps to taper / near stretch. */
export const TAPER_MIN = 0.08;
export const TAPER_RANGE = 0.72;
export const NEAR_W_BASE = 1.22;
export const NEAR_W_RANGE = 0.5;
/** Lower bound on farScale / nearWidth (avoids crushing far to a point). */
export const FAR_FLOOR = 0.42;

export function roadDepth(length01: number) {
    const t = Math.min(1, Math.max(0, length01));
    return DEPTH_MIN + t * (DEPTH_MAX - DEPTH_MIN);
}

/** Map wallPerspective (−12…+12) → taper + nearWidth. */
export function perspectiveParams(wallPerspective: number) {
    const persp = Math.min(12, Math.max(-12, wallPerspective));
    const t = (persp + 12) / 24;
    return {
        t,
        taper: TAPER_MIN + t * TAPER_RANGE,
        nearWidth: NEAR_W_BASE + t * NEAR_W_RANGE,
    };
}

/** X-scale at a depthT (0 = near, 1 = far). Shared by shader & wall builder. */
export function taperScale(depthT: number, taper: number, nearWidth: number) {
    const farScale = Math.max(nearWidth * (1 - taper), nearWidth * FAR_FLOOR);
    return nearWidth + (farScale - nearWidth) * depthT;
}
