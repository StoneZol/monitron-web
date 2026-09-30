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
 * wallPerspective (0…40) → how hard the camera looks into the vanishing point.
 *  0 = higher / flatter, 40 = lower / stronger foreshortening.
 */
export const PERSPECTIVE_MIN = 0;
export const PERSPECTIVE_MAX = 40;
export const PERSPECTIVE_DEFAULT = 20;

export function cameraPerspective(wallPerspective: number) {
    const p = Math.min(PERSPECTIVE_MAX, Math.max(PERSPECTIVE_MIN, wallPerspective));
    return (p - PERSPECTIVE_MIN) / (PERSPECTIVE_MAX - PERSPECTIVE_MIN); // 0…1
}
