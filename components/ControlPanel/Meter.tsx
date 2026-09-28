import { cn } from "@/lib/utils";

type MeterProps = {
  label: string;
  value: number;
  className?: string;
};

/** Read-only 0..1 level bar (same scale as audio bus / Matrix constants) */
export function Meter({ label, value, className }: MeterProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.2em] text-signal",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-cyan">{clamped.toFixed(2)}</span>
      </span>
      <div className="h-1.5 w-full border border-line bg-screen">
        <div
          className="h-full bg-signal transition-[width] duration-150 ease-out"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}
