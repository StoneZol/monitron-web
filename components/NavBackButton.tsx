import Link from "next/link";
import { panelButtonClassName } from "@/components/ControlPanel/PanelButton";
import { cn } from "@/lib/utils";

type NavBackButtonProps = {
  href?: string;
  /** Accessible name — visible label is just the arrow */
  label?: string;
  className?: string;
};

export function NavBackButton({
  href = "/",
  label = "Back",
  className,
}: NavBackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        panelButtonClassName,
        "inline-flex size-7 shrink-0 items-center justify-center p-0 text-base leading-none",
        className,
      )}
    >
      ←
    </Link>
  );
}
