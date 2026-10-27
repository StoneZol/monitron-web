/** Shared 12×12 stroke glyphs for ControlPanel window chrome. */

const svgProps = {
  viewBox: "0 0 12 12",
  className: "size-3.5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  "aria-hidden": true as const,
};

/** Hide HUD / overlay (not window chrome). */
export function HideHudIcon() {
  return (
    <svg {...svgProps}>
      <path d="M1.5 6C2.8 3.6 4.4 2.5 6 2.5S9.2 3.6 10.5 6C9.2 8.4 7.6 9.5 6 9.5S2.8 8.4 1.5 6Z" />
      <circle cx="6" cy="6" r="1.35" />
      <path d="M2.2 10.3 9.8 1.7" strokeWidth="1.35" />
    </svg>
  );
}

/** Enter page fullscreen. */
export function FullscreenEnterIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2 4.25V2h2.25M10 4.25V2H7.75M2 7.75V10h2.25M10 7.75V10H7.75" />
    </svg>
  );
}

/**
 * Exit fullscreen — former PiP overlapping-windows glyph
 * (restore / leave immersive window).
 */
export function FullscreenExitIcon() {
  return (
    <svg {...svgProps}>
      <rect x="1.5" y="3.5" width="7" height="7" />
      <rect
        x="3.5"
        y="1.5"
        width="7"
        height="7"
        fill="var(--color-screen, #0a0a0a)"
      />
    </svg>
  );
}

/** Classic picture-in-picture — frame + inset. */
export function PipEnterIcon() {
  return (
    <svg {...svgProps}>
      <rect x="1.5" y="1.5" width="9" height="9" />
      <rect
        x="5.75"
        y="5.75"
        width="4.25"
        height="4.25"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </svg>
  );
}

/** PiP active — inset solid (tap to dock back). */
export function PipExitIcon() {
  return (
    <svg {...svgProps}>
      <rect x="1.5" y="1.5" width="9" height="9" />
      <rect x="5.75" y="5.75" width="4.25" height="4.25" fill="currentColor" />
    </svg>
  );
}
