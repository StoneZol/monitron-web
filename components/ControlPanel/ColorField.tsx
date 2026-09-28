import { cn } from "@/lib/utils";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function ColorField({
  label,
  value,
  onChange,
  disabled = false,
  className,
}: ColorFieldProps) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em]",
        disabled ? "pointer-events-none text-muted opacity-40" : "text-signal",
        className,
      )}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums text-cyan">{value}</span>
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-7 w-9 cursor-pointer border border-signal bg-screen p-0.5",
            "disabled:cursor-default disabled:border-muted",
          )}
        />
      </span>
    </label>
  );
}
