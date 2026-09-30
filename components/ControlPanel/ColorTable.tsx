import { cn } from "@/lib/utils";
import { ColorInput } from "./ColorInput";
import { FieldInfo } from "./FieldInfo";

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
    /** Optional help text — "?" tip next to the table title (or alone) */
    info?: string;
    className?: string;
};

export function ColorTable({
    label,
    columns,
    rows,
    disabled = false,
    lockedColumns = [],
    columnStamps,
    info,
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
            {label || info ? (
                <div className="mb-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.24em] text-muted">
                    {label ? <span>{label}</span> : null}
                    {info ? <FieldInfo text={info} /> : null}
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
                                    <span className="relative inline-block">
                                        {stamp ? (
                                            <span
                                                className="stamp absolute top-1/2 z-10 whitespace-nowrap px-1 py-0.5 text-[7px] tracking-[0.16em]"
                                                style={{
                                                    left: "0.55rem",
                                                    transform: "translate(-5%, -148%) rotate(14deg)",
                                                }}
                                                title={
                                                    stamp === "audio"
                                                        ? "Requires audio source (mic or plugin)"
                                                        : stamp === "twinkle"
                                                            ? "Peak unused while twinkle is on"
                                                            : undefined
                                                }
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
