"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import {
  ColorField,
  ControlPanel,
  ControlSection,
  Meter,
  PanelButton,
  Slider,
  Toggle,
} from "@/components/ControlPanel";
import useMatrixHook from "./Matrix.hooks";

const Matrix = ({ showOverlay = true }: { showOverlay?: boolean }) => {
  const { canvasRef, controls, visualizer } = useMatrixHook();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {showOverlay && (
        <ScreensOverlay>
          <ControlPanel title="matrix">
            <ControlSection label="look">
              <Toggle
                label="Twinkle"
                checked={controls.twinkle}
                onChange={controls.setTwinkle}
              />
              <ColorField
                label="Color"
                value={controls.color}
                onChange={controls.setColor}
                disabled={controls.twinkle}
              />
              <Slider
                label="Fall speed"
                value={controls.fallSpeed}
                min={1}
                max={60}
                step={1}
                onChange={controls.setFallSpeed}
              />
              <Slider
                label="Color speed"
                value={controls.colorSpeed}
                min={0}
                max={180}
                step={1}
                onChange={controls.setColorSpeed}
                disabled={!controls.twinkle}
              />
            </ControlSection>

            <ControlSection label="actions">
              <div className="flex gap-2">
                <PanelButton onClick={controls.reset} className="flex-1">
                  reset
                </PanelButton>
                <PanelButton onClick={controls.fullscreen} className="flex-1">
                  fullscreen
                </PanelButton>
              </div>
            </ControlSection>

            <ControlSection label="visualizer">
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em]">
                <span className="text-muted">extension</span>
                <span
                  className={
                    visualizer.pluginPresent ? "text-signal" : "text-warn"
                  }
                >
                  {visualizer.pluginPresent ? "online" : "offline"}
                </span>
              </div>
              <Toggle
                label="reactive"
                checked={visualizer.reactive}
                onChange={visualizer.setReactive}
                disabled={!visualizer.pluginPresent}
              />
              <Slider
                label="Bass boost"
                value={controls.bassBoost}
                min={0}
                max={controls.bassBoostMax}
                step={0.5}
                onChange={controls.setBassBoost}
                disabled={!visualizer.reactive}
                format={(v) => v.toFixed(1)}
              />
              {visualizer.visibleBands.map((band) => (
                <Meter
                  key={band}
                  label={band}
                  value={visualizer.meters[band]}
                />
              ))}
            </ControlSection>
          </ControlPanel>
        </ScreensOverlay>
      )}
    </div>
  );
};

export default Matrix;
