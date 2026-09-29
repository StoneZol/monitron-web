import { cn } from "@/lib/utils";
import { ColorInput } from "./ColorInput";

export type ColorTableCell = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export type ColorTableRow = {
  label: string;
  cells: ColorTableCell[];
};

type ColorTableProps = {
  /** Optional boxed section title above the table */
  label?: string;
  /** Column headers (one per color cell) */
  columns: string[];
  rows: ColorTableRow[];
  disabled?: boolean;
  /** Column keys that are non-interactive (e.g. peak without reactive) */
  lockedColumns?: string[];
  /**
   * Stamp badge on a column header — e.g. `{ peak: "reactive" }`
   * when the plugin is offline and peak needs reactive.
   */
  columnStamps?: Partial<Record<string, string>>;
  className?: string;
};

export function ColorTable({
  label,
  columns,
  rows,
  disabled = false,
  lockedColumns = [],
  columnStamps,
  className,
}: ColorTableProps) {
  const locked = new Set(lockedColumns);

  return (
    <div
      className={cn(
        "border border-line/60 p-2",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      {label ? (
        <div className="mb-2 text-[9px] uppercase tracking-[0.24em] text-muted">
          {label}
        </div>
      ) : null}
      <table className="w-full border-collapse font-mono text-[9px] uppercase tracking-[0.2em] text-signal">
        <thead>
          <tr className="text-muted">
            <th className="py-1 pr-2 text-left font-normal" />
            {columns.map((col) => {
              const stamp = columnStamps?.[col];
              const isLocked = locked.has(col);
              return (
                <th
                  key={col}
                  className={cn(
                    "relative px-1 py-1 text-center font-normal",
                    isLocked && "opacity-50",
                  )}
                >
                  <span className="inline-flex flex-col items-center gap-1">
                    {stamp ? (
                      <span
                        className="stamp px-1 py-0.5 text-[7px] tracking-[0.16em]"
                        title="Requires Monitron extension + reactive"
                      >
                        {stamp}
                      </span>
                    ) : null}
                    <span>{col}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1 pr-2 text-left text-muted">{row.label}</td>
              {row.cells.map((cell, i) => {
                const col = columns[i] ?? `col-${i}`;
                const cellDisabled =
                  disabled || cell.disabled || locked.has(col);
                return (
                  <td
                    key={`${row.label}-${col}`}
                    className={cn(
                      "px-1 py-1.5 text-center align-middle",
                      locked.has(col) && "opacity-50",
                    )}
                  >
                    <ColorInput
                      value={cell.value}
                      onChange={cell.onChange}
                      disabled={cellDisabled}
                      aria-label={`${row.label} ${col}`.trim()}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
