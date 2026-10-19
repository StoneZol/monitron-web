"use client";

import { cn } from "@/lib/utils";
import { FieldLabel } from "./FieldInfo";
import { fieldLabelRow, fieldRoot, fieldStepBtn } from "./field";

export type DurationFieldProps = {
  label: string;
  /** Duration in seconds */
  value: number;
  min?: number;
  max?: number;
  /** Fine step (seconds) for ±s */
  step?: number;
  /** Coarse step (seconds) — button label shows ±{N}s; default 60 */
  coarseStep?: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
  info?: string;
  className?: string;
};

function clampSec(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function formatClock(totalSec: number): { mm: string; ss: string } {
  const t = Math.max(0, Math.round(totalSec));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return {
    mm: String(m).padStart(2, "0"),
    ss: String(s).padStart(2, "0"),
  };
}

/**
 * Interval / duration control — digital MM:SS face + coarse/fine steppers.
 * Not a generic slider; meant for slideshow timing and similar clocks.
 */
export function DurationField({
  label,
  value,
  min = 1,
  max = 600,
  step = 1,
  coarseStep = 60,
  onChange,
  disabled = false,
  info,
  className,
}: DurationFieldProps) {
  const sec = clampSec(value, min, max);
  const { mm, ss } = formatClock(sec);
  const atMin = sec <= min;
  const atMax = sec >= max;
  const coarseLabel = `${coarseStep}s`;

  const nudge = (delta: number) => {
    if (disabled) return;
    onChange(clampSec(sec + delta, min, max));
  };

  return (
    <div
      className={cn(
        fieldRoot,
        disabled ? "pointer-events-none text-muted opacity-40" : "text-signal",
        className,
      )}
    >
      <div className={fieldLabelRow}>
        <FieldLabel label={label} info={info} />
        <span className="font-mono text-[9px] normal-case tracking-normal text-muted">
          {sec}s
        </span>
      </div>

      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label} by ${coarseStep}s`}
          disabled={disabled || atMin}
          onClick={() => nudge(-coarseStep)}
          className={cn(fieldStepBtn, "min-w-9 px-1 text-[8px]")}
        >
          −{coarseLabel}
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label} by ${step}s`}
          disabled={disabled || atMin}
          onClick={() => nudge(-step)}
          className={cn(fieldStepBtn, "w-8 text-[9px]")}
        >
          −s
        </button>

        <div
          className="flex h-7 min-w-0 flex-1 items-center justify-center gap-0.5 border border-signal bg-screen px-2"
          aria-hidden
        >
          <span className="font-mono text-base tabular-nums leading-none tracking-[0.12em] text-cyan">
            {mm}
          </span>
          <span className="font-mono text-base leading-none text-signal/50 animate-pulse">
            :
          </span>
          <span className="font-mono text-base tabular-nums leading-none tracking-[0.12em] text-cyan">
            {ss}
          </span>
        </div>

        <button
          type="button"
          aria-label={`Increase ${label} by ${step}s`}
          disabled={disabled || atMax}
          onClick={() => nudge(step)}
          className={cn(fieldStepBtn, "w-8 text-[9px]")}
        >
          +s
        </button>
        <button
          type="button"
          aria-label={`Increase ${label} by ${coarseStep}s`}
          disabled={disabled || atMax}
          onClick={() => nudge(coarseStep)}
          className={cn(fieldStepBtn, "min-w-9 px-1 text-[8px]")}
        >
          +{coarseLabel}
        </button>
      </div>
    </div>
  );
}
