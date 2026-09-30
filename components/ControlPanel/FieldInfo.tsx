"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type FieldInfoProps = {
  text: string;
  className?: string;
};

type TipCoords = { top: number; left: number };

/**
 * Optional "?" next to a control title — opens a description popover
 * portaled to `document.body` so panel overflow doesn't clip / scroll it.
 */
export function FieldInfo({ text, className }: FieldInfoProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TipCoords | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const place = () => {
      const btn = rootRef.current?.getBoundingClientRect();
      if (!btn) return;

      const tipEl = tipRef.current;
      const tipW = tipEl?.offsetWidth ?? 224;
      const tipH = tipEl?.offsetHeight ?? 80;
      const gap = 4;
      const pad = 8;

      let top = btn.bottom + gap;
      if (top + tipH > window.innerHeight - pad) {
        top = Math.max(pad, btn.top - tipH - gap);
      }

      let left = btn.left;
      left = Math.min(left, window.innerWidth - tipW - pad);
      left = Math.max(pad, left);

      setCoords({ top, left });
    };

    place();
    // second pass after tip mounts with real size
    const raf = requestAnimationFrame(place);

    window.addEventListener("resize", place);
    // capture scroll from panel / ancestors
    window.addEventListener("scroll", place, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || tipRef.current?.contains(t)) return;
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

  return (
    <span ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={tipId}
        aria-label="Info"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-muted text-[8px] leading-none text-muted",
          "hover:border-cyan hover:text-cyan",
          "focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-signal",
          open && "border-cyan text-cyan",
        )}
      >
        ?
      </button>
      {open
        ? createPortal(
            <span
              ref={tipRef}
              id={tipId}
              role="tooltip"
              style={
                coords
                  ? { top: coords.top, left: coords.left }
                  : { top: 0, left: 0, visibility: "hidden" }
              }
              className="fixed z-50 w-56 border border-signal bg-screen/95 p-2.5 font-mono text-[11px] normal-case leading-snug tracking-[0.04em] text-signal shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

/** Label + optional info chip (keeps title row compact). */
export function FieldLabel({
  label,
  info,
  trailing,
}: {
  label: ReactNode;
  info?: string;
  trailing?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="truncate">{label}</span>
      {info ? <FieldInfo text={info} /> : null}
      {trailing}
    </span>
  );
}
