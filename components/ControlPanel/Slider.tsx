import { cn } from "@/lib/utils";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  format?: (value: number) => string;
  className?: string;
};

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  format = (v) => String(v),
  className,
}: SliderProps) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.2em]",
        disabled ? "pointer-events-none text-muted opacity-40" : "text-signal",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-cyan">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none bg-line accent-signal",
          "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-signal",
          "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-signal",
        )}
      />
    </label>
  );
}
