import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ControlClusterProps = {
    children: ReactNode;
    className?: string;
    /**
     * `stack` — one column (twinkle over palette).
     * `cols` — up to 2 columns when the parent chip is wide (slider packs).
     */
    layout?: "stack" | "cols";
};

/**
 * Groups related knobs inside a ControlSubSection.
 * Parent sub should be `@container` so `cols` can react to chip width.
 */
export function ControlCluster({
    children,
    className,
    layout = "cols",
}: ControlClusterProps) {
    return (
        <div
            className={cn(
                "w-full min-w-0 gap-1 *:min-w-0 *:max-w-none!",
                layout === "stack"
                    ? "flex flex-col"
                    : "grid grid-cols-1 @min-[22rem]:grid-cols-2",
                className,
            )}
        >
            {children}
        </div>
    );
}
