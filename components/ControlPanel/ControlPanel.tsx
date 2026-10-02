"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScreensOverlay } from "@/components/ScreensOverlay/ScreensOverlay.context";
import { FieldInfo } from "./FieldInfo";
import { PanelButton } from "./PanelButton";

type ControlPanelProps = {
  title: string;
  children: ReactNode;
  /** Fixed under the title — outside the scroll body (back / reset / fullscreen) */
  actions?: ReactNode;
  className?: string;
};

export function ControlPanel({
  title,
  children,
  actions,
  className,
}: ControlPanelProps) {
  const overlay = useScreensOverlay();

  return (
    <div
      className={cn(
        "flex max-h-[min(80vh,720px)] flex-col border border-signal bg-screen/85 font-mono text-signal shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.28em]">{title}</span>
        {overlay ? (
          <div className="flex items-center gap-1.5">
            <PanelButton onClick={overlay.sync} className="px-2 py-1">
              sync
            </PanelButton>
            <PanelButton onClick={overlay.hide} className="px-2 py-1">
              hide
            </PanelButton>
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="shrink-0 border-b border-line px-3 py-2">
          {actions}
        </div>
      ) : null}
      <div className="control-panel-scroll flex flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain p-3">
        {children}
      </div>
    </div>
  );
}

type ControlSectionProps = {
  label: string;
  children: ReactNode;
  /** Optional help text — shows a "?" tip next to the section title */
  info?: string;
  className?: string;
};

export function ControlSection({
  label,
  children,
  info,
  className,
}: ControlSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2 pt-1", className)}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.24em] text-muted">
        <span>{label}</span>
        {info ? <FieldInfo text={info} /> : null}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}
