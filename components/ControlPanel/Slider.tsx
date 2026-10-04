import { cn } from "@/lib/utils";
import { FieldLabel } from "./FieldInfo";
import {
  fieldControlRow,
  fieldLabelRow,
  fieldRoot,
  fieldStepBtn,
} from "./field";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  format?: (value: number) => string;
  /** Optional help text — shows a "?" tip next to the title */
  info?: string;
  className?: string;
};

function stepDecimals(step: number): number {
  const s = String(step);
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

/** Nudge by ±step and snap to the min-aligned grid. */
function nudge(
  value: number,
  min: number,
  max: number,
  step: number,
  dir: -1 | 1,
): number {
  if (!(step > 0)) return Math.min(max, Math.max(min, value));
  const next = value + dir * step;
  const snapped = min + Math.round((next - min) / step) * step;
  const decimals = stepDecimals(step);
  const rounded =
    decimals > 0 ? Number(snapped.toFixed(decimals)) : Math.round(snapped);
  return Math.min(max, Math.max(min, rounded));
}

/** Not a `<label>` wrap — that steals clicks from the "?" info button. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  format = (v) => String(v),
  info,
  className,
}: SliderProps) {
  const atMin = value <= min + 1e-9;
  const atMax = value >= max - 1e-9;

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
        <span className="tabular-nums text-cyan">{format(value)}</span>
      </div>
      <div className={cn(fieldControlRow, "h-7 gap-1")}>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || atMin}
          onClick={() => onChange(nudge(value, min, max, step, -1))}
          className={fieldStepBtn}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          onWheel={(e) => {
            e.currentTarget.blur();
          }}
          className={cn(
            "h-1.5 min-w-0 flex-1 cursor-pointer appearance-none bg-line accent-signal",
            "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-signal",
            "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-signal",
          )}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || atMax}
          onClick={() => onChange(nudge(value, min, max, step, 1))}
          className={fieldStepBtn}
        >
          +
        </button>
      </div>
    </div>
  );
}
