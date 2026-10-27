"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { FxOverlaySection } from "@/components/FxOverlay";
import {
  ControlCluster,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  MediaField,
  Slider,
} from "@/components/ControlPanel";
import OldguardCanvas from "./Oldguard.Canvas";
import { OLD_GUARD_FLAGS } from "./Oldguard.flags";
import useOldguardHook from "./Oldguard.hooks";
import { OLDGUARD_RANGES, type OldguardProps } from "./Oldguard.types";

const INFO = {
  look: "Old Guard — Napoleonic empire flags on a waving fabric (inspired by piyushslayer). Stock art lives next to the screen; drop your own via local / URL like Wet Glass.",
  flag: "Pick a stock empire flag, paste an image URL, or load a local still for this tab.",
  waveSpeed: "Fabric wave clock (1 ≈ Shadertoy iTime).",
  waveAmount: "Displace + shade strength (0 = flat print).",
  saturation: "Look chroma (0 = gray, 1 = default).",
} as const;

const Oldguard = ({ showOverlay = true }: OldguardProps) => {
  const { liveRef, controls } = useOldguardHook();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <OldguardCanvas liveRef={liveRef} />

      {showOverlay ? (
        <ScreensOverlay screenId="old_guard">
          <ControlPanel
            title="old guard"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlSubSection label="flag" info={INFO.flag}>
                <MediaField
                  label="Flag"
                  value={controls.mediaValue}
                  onChange={controls.setMedia}
                  stocks={OLD_GUARD_FLAGS}
                  info={INFO.flag}
                />
              </ControlSubSection>

              <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Slider
                  label="Wave speed"
                  value={controls.waveSpeed}
                  min={OLDGUARD_RANGES.waveSpeed.min}
                  max={OLDGUARD_RANGES.waveSpeed.max}
                  step={OLDGUARD_RANGES.waveSpeed.step}
                  onChange={controls.setWaveSpeed}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.waveSpeed}
                />
                <Slider
                  label="Wave amount"
                  value={controls.waveAmount}
                  min={OLDGUARD_RANGES.waveAmount.min}
                  max={OLDGUARD_RANGES.waveAmount.max}
                  step={OLDGUARD_RANGES.waveAmount.step}
                  onChange={controls.setWaveAmount}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.waveAmount}
                />
                <Slider
                  label="Saturation"
                  value={controls.saturation}
                  min={OLDGUARD_RANGES.saturation.min}
                  max={OLDGUARD_RANGES.saturation.max}
                  step={OLDGUARD_RANGES.saturation.step}
                  onChange={controls.setSaturation}
                  format={(v) => `×${v.toFixed(2)}`}
                  info={INFO.saturation}
                />
              </ControlCluster>
            </ControlSection>

            <FxOverlaySection />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Oldguard;
