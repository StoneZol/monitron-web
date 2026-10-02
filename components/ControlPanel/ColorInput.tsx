"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
  type Hsv,
} from "@/lib/color";
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

type TipCoords = { top: number; left: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * Shared color control — lamp swatch opens an HSV popover (hex out, no alpha yet).
 * - `label` set → described field
 * - no `label` → compact stack for ColorTable cells
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
  const hex = normalizeHex(value);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TipCoords | null>(null);
  const [draft, setDraft] = useState(hex);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(hex));
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();

  useEffect(() => {
    if (open) return;
    const next = normalizeHex(value);
    setDraft(next);
    setHsv(hexToHsv(next));
  }, [value, open]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const place = () => {
      const btn = btnRef.current?.getBoundingClientRect();
      if (!btn) return;
      const tipEl = popRef.current;
      const tipW = tipEl?.offsetWidth ?? 200;
      const tipH = tipEl?.offsetHeight ?? 220;
      const gap = 6;
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
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
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

  const commitHsv = (next: Hsv) => {
    setHsv(next);
    const out = hsvToHex(next.h, next.s, next.v);
    setDraft(out);
    onChange(out);
  };

  const commitHexText = (raw: string) => {
    const out = normalizeHex(raw, draft);
    setDraft(out);
    setHsv(hexToHsv(out));
    onChange(out);
  };

  const swatch = (
    <button
      ref={btnRef}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? label ?? value}
      aria-expanded={open}
      aria-controls={popId}
      onClick={() => {
        if (disabled) return;
        setOpen((v) => !v);
      }}
      className={cn(
        fieldSwatch,
        "relative overflow-hidden",
        open && "border-cyan shadow-[0_0_8px_var(--signal-soft)]",
        !disabled && "hover:border-cyan",
      )}
      style={{ backgroundColor: hex }}
    />
  );

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popRef}
            id={popId}
            role="dialog"
            aria-label="Color picker"
            style={
              coords
                ? { top: coords.top, left: coords.left }
                : { top: 0, left: 0, visibility: "hidden" }
            }
            className="fixed z-50 w-50 border border-signal bg-screen/95 p-2 font-mono shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SaturationPad hsv={hsv} onChange={commitHsv} />
            <HueSlider
              hue={hsv.h}
              onChange={(h) => commitHsv({ ...hsv, h })}
              className="mt-2"
            />
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="h-6 w-6 shrink-0 border border-signal"
                style={{ backgroundColor: draft }}
                aria-hidden
              />
              <input
                type="text"
                value={draft}
                spellCheck={false}
                aria-label="Hex color"
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft(v);
                  if (/^#?[a-f\d]{6}$/i.test(v.trim())) {
                    commitHexText(v);
                  }
                }}
                onBlur={() => commitHexText(draft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitHexText(draft);
                    setOpen(false);
                  }
                }}
                className="min-w-0 flex-1 border border-line bg-screen px-1.5 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan outline-none focus:border-signal"
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  if (label) {
    return (
      <div
        className={cn(
          fieldRoot,
          disabled
            ? "pointer-events-none text-muted opacity-40"
            : "text-signal",
          className,
        )}
      >
        <div className={fieldLabelRow}>
          <FieldLabel label={label} info={info} />
        </div>
        <div className={cn(fieldControlRow, "w-auto gap-2")}>
          {swatch}
          <span className="tabular-nums text-cyan">{hex}</span>
        </div>
        {popover}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-0.5",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      <span className="normal-case tabular-nums text-[8px] leading-none tracking-[0.12em] text-cyan">
        {hex}
      </span>
      {swatch}
      {popover}
    </div>
  );
}

function SaturationPad({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const apply = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp01((clientX - rect.left) / rect.width);
    const v = clamp01(1 - (clientY - rect.top) / rect.height);
    onChange({ h: hsv.h, s, v });
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(e.clientX, e.clientY);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    apply(e.clientX, e.clientY);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const hueHex = hsvToHex(hsv.h, 1, 1);

  return (
    <div
      ref={ref}
      className="relative h-28 w-full cursor-crosshair touch-none border border-line"
      style={{
        backgroundImage: `
          linear-gradient(to top, #000, transparent),
          linear-gradient(to right, #fff, ${hueHex})
        `,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="presentation"
    >
      <span
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-signal bg-screen shadow-[0_0_4px_var(--magenta)]"
        style={{
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v),
        }}
      />
    </div>
  );
}

function HueSlider({
  hue,
  onChange,
  className,
}: {
  hue: number;
  onChange: (h: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const apply = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onChange(clamp01((clientX - rect.left) / rect.width) * 360);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    apply(e.clientX);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-3 w-full cursor-ew-resize touch-none border border-line",
        className,
      )}
      style={{
        background:
          "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hue)}
      aria-label="Hue"
    >
      <span
        className="pointer-events-none absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 border border-signal bg-screen"
        style={{ left: `${(hue / 360) * 100}%` }}
      />
    </div>
  );
}
