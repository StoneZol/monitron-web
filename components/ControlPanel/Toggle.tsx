import { cn } from "@/lib/utils";
import { fieldControlRow, fieldRoot } from "./field";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
};

export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  readOnly = false,
  className,
}: ToggleProps) {
  const inert = disabled || readOnly;

  return (
    <label
      className={cn(
        fieldRoot,
        inert ? "text-muted" : "text-signal",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      <span className={cn(fieldControlRow, "justify-between gap-3")}>
        <span className="leading-none">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-readonly={readOnly || undefined}
          disabled={disabled}
          onClick={() => {
            if (!inert) onChange(!checked);
          }}
          className={cn(
            "relative h-5 w-9 shrink-0 border transition-colors",
            checked ? "border-signal bg-signal/25" : "border-muted bg-screen",
            !inert &&
              "hover:border-cyan focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3.5 w-3.5 transition-transform",
              checked
                ? "left-4 bg-signal shadow-[0_0_6px_var(--signal)]"
                : "left-0.5 bg-muted",
            )}
          />
        </button>
      </span>
    </label>
  );
}
