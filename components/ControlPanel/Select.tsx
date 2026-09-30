"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fieldControlRow, fieldLabelRow, fieldRoot } from "./field";

export type SelectOption<T extends string = string> = {
    value: T;
    label: string;
    /** Shown but not selectable */
    disabled?: boolean;
};

type SelectProps<T extends string = string> = {
    label: string;
    value: T;
    options: SelectOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
};

export function Select<T extends string>({
    label,
    value,
    options,
    onChange,
    disabled = false,
    className,
}: SelectProps<T>) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const selected = options.find((o) => o.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div
            ref={rootRef}
            className={cn(
                fieldRoot,
                "relative",
                disabled ? "pointer-events-none text-muted opacity-40" : "text-signal",
                className,
            )}
        >
            <span className={fieldLabelRow}>
                <span>{label}</span>
            </span>
            <div className={cn(fieldControlRow, "relative")}>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    disabled={disabled}
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        "flex h-7 w-full items-center justify-between gap-2 border border-signal bg-screen px-2 text-left text-[10px] uppercase tracking-[0.18em] text-signal",
                        "hover:border-cyan hover:text-cyan",
                        "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal",
                        open && "border-cyan text-cyan",
                    )}
                >
                    <span>{selected?.label ?? value}</span>
                    <span className="text-magenta" aria-hidden>
                        {open ? "▴" : "▾"}
                    </span>
                </button>
                {open ? (
                    <ul
                        id={listId}
                        role="listbox"
                        className="absolute top-full left-0 z-30 mt-1 max-h-48 w-full overflow-y-auto border border-signal bg-screen/95 shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm"
                    >
                        {options.map((opt) => {
                            const active = opt.value === value;
                            const optDisabled = Boolean(opt.disabled);
                            return (
                                <li
                                    key={opt.value}
                                    role="option"
                                    aria-selected={active}
                                    aria-disabled={optDisabled || undefined}
                                >
                                    <button
                                        type="button"
                                        disabled={optDisabled}
                                        className={cn(
                                            "flex w-full px-2 py-1.5 text-left text-[10px] uppercase tracking-[0.18em]",
                                            optDisabled
                                                ? "cursor-not-allowed text-muted opacity-40"
                                                : active
                                                  ? "bg-signal/20 text-cyan"
                                                  : "text-signal hover:bg-signal/10 hover:text-cyan",
                                        )}
                                        onClick={() => {
                                            if (optDisabled) return;
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </div>
        </div>
    );
}
