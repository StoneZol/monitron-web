import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared look for panel chrome buttons (PanelButton + NavBackButton). */
export const panelButtonClassName =
  "inline-flex items-center justify-center border border-signal bg-screen/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-signal shadow-[2px_2px_0_var(--magenta)] transition-[color,border-color,box-shadow,transform] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-cyan hover:text-cyan hover:shadow-[3px_3px_0_var(--magenta)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none";

type PanelButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  /** For CSS glitch layers (`content: attr(data-text)`). */
  "data-text"?: string;
};

export function PanelButton({
  children,
  onClick,
  disabled = false,
  className,
  type = "button",
  "data-text": dataText,
}: PanelButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-text={dataText}
      className={cn(panelButtonClassName, className)}
    >
      {children}
    </button>
  );
}
