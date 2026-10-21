"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { FieldLabel } from "./FieldInfo";
import {
  fieldControlRow,
  fieldLabelRow,
  fieldRoot,
  fieldStepBtn,
} from "./field";

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
  /** Optional help text — shows a "?" tip next to the title */
  info?: string;
  className?: string;
};

type ListCoords = { top: number; left: number; width: number };

function stepEnabledIndex<T extends string>(
  options: SelectOption<T>[],
  current: T,
  delta: 1 | -1,
): T | null {
  if (options.length === 0) return null;
  const enabled = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.disabled);
  if (enabled.length === 0) return null;

  let pos = enabled.findIndex(({ o }) => o.value === current);
  if (pos < 0) pos = 0;
  else pos = (pos + delta + enabled.length) % enabled.length;
  return enabled[pos]!.o.value;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  info,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<ListCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];
  const canStep = options.filter((o) => !o.disabled).length > 1;

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const place = () => {
      const btn = triggerRef.current?.getBoundingClientRect();
      if (!btn) return;

      const listEl = listRef.current;
      const listH = listEl?.offsetHeight ?? 192;
      const gap = 4;
      const pad = 8;

      let top = btn.bottom + gap;
      if (top + listH > window.innerHeight - pad) {
        top = Math.max(pad, btn.top - listH - gap);
      }

      let left = btn.left;
      left = Math.min(left, window.innerWidth - btn.width - pad);
      left = Math.max(pad, left);

      setCoords({ top, left, width: btn.width });
    };

    place();
    const raf = requestAnimationFrame(place);

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
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

  const step = (delta: 1 | -1) => {
    const next = stepEnabledIndex(options, value, delta);
    if (next != null && next !== value) onChange(next);
  };

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
        <FieldLabel label={label} info={info} />
      </span>
      <div className={cn(fieldControlRow, "relative h-7 gap-1")}>
        <button
          type="button"
          aria-label={`Previous ${label}`}
          disabled={disabled || !canStep}
          onClick={() => step(-1)}
          className={fieldStepBtn}
        >
          ‹
        </button>
        <div className="relative min-w-0 flex-1">
          <button
            ref={triggerRef}
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
            <span className="truncate">{selected?.label ?? value}</span>
            <span className="shrink-0 text-magenta" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </button>
          {open
            ? createPortal(
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  style={
                    coords
                      ? {
                          top: coords.top,
                          left: coords.left,
                          width: coords.width,
                        }
                      : { top: 0, left: 0, width: 0, visibility: "hidden" }
                  }
                  className="fixed z-50 max-h-48 overflow-y-auto border border-signal bg-screen/95 shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm"
                  onMouseDown={(e) => e.stopPropagation()}
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
                </ul>,
                document.body,
              )
            : null}
        </div>
        <button
          type="button"
          aria-label={`Next ${label}`}
          disabled={disabled || !canStep}
          onClick={() => step(1)}
          className={fieldStepBtn}
        >
          ›
        </button>
      </div>
    </div>
  );
}
