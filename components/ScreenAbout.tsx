"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PanelButton } from "@/components/ControlPanel/PanelButton";
import { cn } from "@/lib/utils";

type ScreenAboutProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
};

/**
 * Compact about sheet for a screen overlay — credit / license / notes.
 * Triggered from the panel `(c)` control (not HazardAlert).
 */
export function ScreenAbout({
  title,
  eyebrow = "::about",
  children,
  onClose,
}: ScreenAboutProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex w-full max-w-md flex-col border border-signal bg-screen/95 font-mono text-signal",
          "shadow-[4px_4px_0_var(--magenta)] outline-none",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-3 py-2">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.28em] text-muted">
              {eyebrow}
            </p>
            <h2
              id={titleId}
              className="truncate text-sm uppercase tracking-[0.2em] text-cyan"
            >
              {title}
            </h2>
          </div>
          <PanelButton
            onClick={onClose}
            className="shrink-0 px-2 py-1 shadow-none"
            title="Close"
          >
            close
          </PanelButton>
        </div>
        <div className="flex flex-col gap-2 px-3 py-3 text-[10px] leading-relaxed tracking-[0.06em] text-signal/90">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
