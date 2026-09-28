import Link from "next/link";
import { cn } from "@/lib/utils";

type NavBackButtonProps = {
    href?: string;
    label?: string;
    className?: string;
};

export function NavBackButton({
    href = "/",
    label = "library",
    className,
}: NavBackButtonProps) {
    return (
        <Link
            href={href}
            className={cn(
                "group border border-signal bg-screen/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-signal shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm transition-[color,border-color,box-shadow,transform] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-cyan hover:text-cyan hover:shadow-[3px_3px_0_var(--magenta)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-signal",
                className,
            )}
        >
            <span className="text-magenta group-hover:text-warn">←</span> {label}
        </Link>
    );
}
