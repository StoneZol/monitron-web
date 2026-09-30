import { cn } from "@/lib/utils";
import { FieldLabel } from "./FieldInfo";
import {
  fieldControlRow,
  fieldLabelRow,
  fieldRoot,
  fieldSwatch,
} from "./field";

export type ColorInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** With label → full panel field; without → compact swatch for tables */
  label?: string;
  disabled?: boolean;
  /** Optional help text — shows a "?" tip next to the title */
  info?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Shared color control.
 * - `label` set → described field (hex beside title, swatch below)
 * - no `label` → compact stack (hex above swatch) for ColorTable cells
 */
export function ColorInput({
  value,
  onChange,
  label,
  disabled = false,
  info,
  className,
  "aria-label": ariaLabel,
}: ColorInputProps) {
  const swatch = (
    <input
      type="color"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel ?? label ?? value}
      onChange={(e) => onChange(e.target.value)}
      className={fieldSwatch}
    />
  );

  if (label) {
    return (
      <label
        className={cn(
          fieldRoot,
          disabled
            ? "pointer-events-none text-muted opacity-40"
            : "text-signal",
          className,
        )}
      >
        <span className={fieldLabelRow}>
          <FieldLabel label={label} info={info} />
          <span className="tabular-nums text-cyan">{value}</span>
        </span>
        <span className={fieldControlRow}>{swatch}</span>
      </label>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-1",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      <span className="tabular-nums text-[8px] tracking-[0.12em] text-cyan normal-case">
        {value}
      </span>
      {swatch}
    </div>
  );
}
