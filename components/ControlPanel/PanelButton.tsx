import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
};

export function PanelButton({
  children,
  onClick,
  disabled = false,
  className,
  type = "button",
}: PanelButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "border border-signal bg-screen/80 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-signal shadow-[2px_2px_0_var(--magenta)] transition-[color,border-color,box-shadow,transform]",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-cyan hover:text-cyan hover:shadow-[3px_3px_0_var(--magenta)]",
        "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal",
        "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
        className,
      )}
    >
      {children}
    </button>
  );
}
