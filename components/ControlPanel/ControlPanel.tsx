import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ControlPanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function ControlPanel({ title, children, className }: ControlPanelProps) {
  return (
    <div
      className={cn(
        "flex max-h-[min(80vh,720px)] flex-col border border-signal bg-screen/85 font-mono text-signal shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="shrink-0 border-b border-line px-3 py-2 text-[10px] uppercase tracking-[0.28em]">
        {title}
      </div>
      <div className="control-panel-scroll flex flex-col gap-3 overflow-y-auto overscroll-contain p-3">
        {children}
      </div>
    </div>
  );
}

type ControlSectionProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function ControlSection({
  label,
  children,
  className,
}: ControlSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="text-[9px] uppercase tracking-[0.24em] text-muted">
        {label}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
