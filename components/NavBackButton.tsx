import Link from "next/link";
import { panelButtonClassName } from "@/components/ControlPanel/PanelButton";
import { cn } from "@/lib/utils";

type NavBackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function NavBackButton({
  href = "/",
  label = "back",
  className,
}: NavBackButtonProps) {
  return (
    <Link href={href} className={cn(panelButtonClassName, className)}>
      ← {label}
    </Link>
  );
}
