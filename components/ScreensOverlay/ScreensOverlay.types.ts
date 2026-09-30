import type { RefObject } from "react";
import type { SpectrumSnap } from "@/components/AudioSpectrum";

export type ScreensOverlayProps = {
  children: React.ReactNode;
  /** Live bus spectrum — shown at the bottom of the HUD */
  spectrumRef?: RefObject<SpectrumSnap>;
  pluginPresent?: boolean;
};
