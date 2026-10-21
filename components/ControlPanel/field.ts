import { cn } from "@/lib/utils";

/**
 * Shared ControlPanel field rhythm.
 * Always bound by parent width (`max-w-full`) so wrap chips never spill
 * into the next column. Cap width on sm+ so rows of knobs stay compact.
 */
export const fieldRoot =
  "flex w-full min-w-0 max-w-full flex-col gap-0.5 self-start text-[10px] uppercase tracking-[0.2em] sm:max-w-42";

/** Wider blocks (media / bus / twinkle) — still clipped to parent */
export const fieldBlock =
  "w-full min-w-0 max-w-full self-start";

export const fieldLabelRow =
  "flex h-3.5 shrink-0 items-center justify-between gap-2 leading-none";

export const fieldControlRow =
  "flex h-6 w-full shrink-0 items-center";

/** Native color swatch size (ColorField + ColorTable) */
export const fieldSwatch =
  "h-6 w-8 shrink-0 cursor-pointer border border-signal bg-screen p-0.5 disabled:cursor-default disabled:border-muted";

/** Stepper ± / ‹› buttons (Select + Slider) */
export const fieldStepBtn = cn(
  "flex h-7 w-7 shrink-0 items-center justify-center border border-signal bg-screen text-[11px] text-signal",
  "hover:border-cyan hover:text-cyan",
  "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal",
  "disabled:pointer-events-none disabled:opacity-40",
);
