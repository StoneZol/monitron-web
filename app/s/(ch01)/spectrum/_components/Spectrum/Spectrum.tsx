"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorTable,
  ControlCluster,
  ControlPanel,
  ControlSection,
  ControlSubSection,
  Slider,
  Toggle,
  TwinkleControls,
} from "@/components/ControlPanel";
import { PLUGIN_URL } from "@/lib/audioBus";
import SpectrumCanvas from "./Spectrum.Canvas";
import useSpectrumHook from "./Spectrum.hooks";
import {
  SPECTRUM_RANGES,
  type SpectrumProps,
} from "./Spectrum.types";

const INFO = {
  look: "Plain bus spectrum — 32 log bands, peak caps, optional mirror.",
  colors:
    "Low / high seed tints. Twinkle walks both hues from these seeds together.",
  twinkle:
    "Shared hue phase on both ends — keeps the low↔high gap, spins the gradient.",
  twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
  twinkleS: "Saturation % for the twinkle hsl().",
  twinkleL: "Lightness % for the twinkle hsl().",
  bars: "Mirror layout, peak caps, and the bottom RMS / peak rail.",
  mirror: "Reflect the same bands left/right from center.",
  peakDecay: "How sticky the white peak caps are (higher = slower fall).",
  showRail: "Bottom rms (cyan) / peak (warn) meter rail.",
  visualizer: {
    section: "Audio in → bus meters → peak gain for reactive screens.",
    source:
      "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
    noiseGate: "Ignore mic levels below this floor (room hiss).",
    peakGain:
      "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
  },
} as const;

const Spectrum = ({ showOverlay = true }: SpectrumProps) => {
  const { liveRef, vizRef, visualizer, controls } = useSpectrumHook();
  const needsAudio =
    !visualizer.reactive ||
    !visualizer.busLive ||
    visualizer.micNeedsGesture;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <SpectrumCanvas liveRef={liveRef} vizRef={vizRef} />

      {needsAudio ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center px-4 sm:bottom-10">
          <div className="pointer-events-auto max-w-md border border-signal/55 bg-screen/90 px-4 py-3 font-mono shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-4 text-[9px] uppercase tracking-[0.22em]">
              <span className="text-warn">::idle</span>
              <span className="text-muted">only reactive</span>
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink">
              Needs audio — set source to{" "}
              <span className="text-magenta">mic</span> or{" "}
              <a
                href={PLUGIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan underline decoration-cyan/40 underline-offset-2 transition-colors hover:text-signal"
              >
                plugin
              </a>
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted">
              Without a feed this screen stays dark.
            </p>
          </div>
        </div>
      ) : null}

      {showOverlay ? (
        <ScreensOverlay screenId="spectrum">
          <ControlPanel
            title="spectrum"
            onReset={controls.reset}
            onFullscreen={controls.fullscreen}
          >
            <ControlSection label="look" info={INFO.look}>
              <ControlCluster layout="stack" className="w-full basis-full">
                <TwinkleControls
                  title="twinkle"
                  checked={controls.twinkle}
                  onCheckedChange={controls.setTwinkle}
                  speed={controls.twinkleSpeed}
                  onSpeedChange={controls.setTwinkleSpeed}
                  s={controls.twinkleS}
                  onSChange={controls.setTwinkleS}
                  l={controls.twinkleL}
                  onLChange={controls.setTwinkleL}
                  info={INFO.twinkle}
                  speedInfo={INFO.twinkleSpeed}
                  sInfo={INFO.twinkleS}
                  lInfo={INFO.twinkleL}
                />
                <ColorTable
                  label="band tint"
                  info={INFO.colors}
                  columns={["low", "high"]}
                  rows={[
                    {
                      label: "seed",
                      cells: [
                        {
                          value: controls.colorLow,
                          onChange: controls.setColorLow,
                        },
                        {
                          value: controls.colorHigh,
                          onChange: controls.setColorHigh,
                        },
                      ],
                    },
                  ]}
                />
              </ControlCluster>

              <ControlSubSection label="bars" info={INFO.bars}>
                <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2">
                  <Toggle
                    label="Mirror"
                    checked={controls.mirror}
                    onChange={controls.setMirror}
                    info={INFO.mirror}
                    className="!w-max !max-w-none [&>div]:!w-auto [&>div]:justify-start [&>div]:gap-2"
                  />
                  <Toggle
                    label="RMS / peak rail"
                    checked={controls.showRail}
                    onChange={controls.setShowRail}
                    info={INFO.showRail}
                    className="!w-max !max-w-none [&>div]:!w-auto [&>div]:justify-start [&>div]:gap-2"
                  />
                </div>
                <Slider
                  label="Peak hold"
                  value={controls.peakDecay}
                  min={SPECTRUM_RANGES.peakDecay.min}
                  max={SPECTRUM_RANGES.peakDecay.max}
                  step={SPECTRUM_RANGES.peakDecay.step}
                  onChange={controls.setPeakDecay}
                  format={(v) => v.toFixed(2)}
                  info={INFO.peakDecay}
                />
              </ControlSubSection>
            </ControlSection>

            <VisualizerSection
              visualizer={visualizer}
              info={INFO.visualizer}
            />
          </ControlPanel>
        </ScreensOverlay>
      ) : null}
    </div>
  );
};

export default Spectrum;
