"use client";

import { ScreensOverlayProps } from "./ScreensOverlay.types";
import useScreensOverlayHook from "./ScreensOverlay.hooks";
import { NavBackButton } from "@/components/NavBackButton";
import { cn } from "@/lib/utils";

const ScreensOverlay = ({ children }: ScreensOverlayProps) => {
    const { hideHud } = useScreensOverlayHook();

    return (
        <div
            className={cn(
                "absolute inset-0 z-10 flex h-screen w-screen items-center justify-center bg-black/30 transition-opacity duration-300",
                hideHud && "pointer-events-none opacity-0",
            )}
            aria-hidden={hideHud}
        >
            <NavBackButton className="absolute top-4 left-4 z-20" />

            <div className="relative z-20 max-h-[min(80vh,720px)] w-80 overflow-y-auto">
              {children}
            </div>
        </div>
    );
};

export default ScreensOverlay;
