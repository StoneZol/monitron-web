import { cn } from "@/lib/utils";

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
  className?: string;
};

export function ColorTable({
  label,
  columns,
  rows,
  disabled = false,
  className,
}: ColorTableProps) {
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
            {columns.map((col) => (
              <th key={col} className="px-1 py-1 text-center font-normal">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1 pr-2 text-left text-muted">{row.label}</td>
              {row.cells.map((cell, i) => {
                const col = columns[i] ?? `col-${i}`;
                const cellDisabled = disabled || cell.disabled;
                return (
                  <td key={`${row.label}-${col}`} className="px-1 py-1 text-center">
                    <input
                      type="color"
                      aria-label={`${row.label} ${col}`}
                      value={cell.value}
                      disabled={cellDisabled}
                      onChange={(e) => cell.onChange(e.target.value)}
                      className={cn(
                        "mx-auto h-7 w-9 cursor-pointer border border-signal bg-screen p-0.5",
                        "disabled:cursor-default disabled:border-muted",
                      )}
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
