/**
 * Road / wall layout.
 *
 * Geometry is Euclidean: rectangular floor, planar hinged walls.
 * Perspective comes from the camera (see CameraRig + wallPerspective),
 * not from warping X along Z — that broke the ridge when walls close.
 *
 * Grid paint is UV-based; floor & walls share `uv.y × cellsV` so seams lock.
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

export function roadDepth(length01: number) {
    const t = Math.min(1, Math.max(0, length01));
    return DEPTH_MIN + t * (DEPTH_MAX - DEPTH_MIN);
}

/**
 * wallPerspective (−12…+12) → how hard the camera looks into the vanishing point.
 *  −12 = higher / flatter, +12 = lower / stronger foreshortening.
 */
export function cameraPerspective(wallPerspective: number) {
    const persp = Math.min(12, Math.max(-12, wallPerspective));
    return (persp + 12) / 24; // 0…1
}
