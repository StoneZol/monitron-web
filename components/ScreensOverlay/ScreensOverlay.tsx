"use client";

import { AudioSpectrum } from "@/components/AudioSpectrum";
import { NavBackButton } from "@/components/NavBackButton";
import { cn } from "@/lib/utils";
import useScreensOverlayHook from "./ScreensOverlay.hooks";
import type { ScreensOverlayProps } from "./ScreensOverlay.types";

const ScreensOverlay = ({
  children,
  spectrumRef,
  pluginPresent = false,
}: ScreensOverlayProps) => {
  const { hideHud } = useScreensOverlayHook();

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex h-screen w-screen items-center justify-center",
        hideHud && "pointer-events-none opacity-0",
      )}
      aria-hidden={hideHud}
    >
      <NavBackButton className="absolute top-4 left-4 z-20" />

      <div className="relative z-20 w-80">{children}</div>

      {spectrumRef && (
        <AudioSpectrum
          spectrumRef={spectrumRef}
          pluginPresent={pluginPresent}
        />
      )}
    </div>
  );
};

export default ScreensOverlay;
