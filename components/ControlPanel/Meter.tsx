import { cn } from "@/lib/utils";
import { FieldLabel } from "./FieldInfo";
import { fieldControlRow, fieldLabelRow, fieldRoot } from "./field";

type MeterProps = {
  label: string;
  value: number;
  /** Optional help text — shows a "?" tip next to the title */
  info?: string;
  className?: string;
};

/** Read-only 0..1 level bar (same scale as audio bus / Matrix constants) */
export function Meter({ label, value, info, className }: MeterProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div className={cn(fieldRoot, "text-signal", className)}>
      <span className={fieldLabelRow}>
        <FieldLabel label={label} info={info} />
        <span className="tabular-nums text-cyan">{clamped.toFixed(2)}</span>
      </span>
      <span className={fieldControlRow}>
        <span className="h-1.5 w-full border border-line bg-screen">
          <span
            className="block h-full bg-signal transition-[width] duration-150 ease-out"
            style={{ width: `${clamped * 100}%` }}
          />
        </span>
      </span>
    </div>
  );
}
