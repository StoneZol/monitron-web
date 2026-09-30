"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
  ColorField,
  ControlPanel,
  ControlSection,
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
          <ControlPanel
            title="matrix"
            actions={
              <div className="flex gap-2">
                <NavBackButton className="min-w-0 flex-1" />
                <PanelButton onClick={controls.reset} className="flex-1">
                  reset
                </PanelButton>
                <PanelButton onClick={controls.fullscreen} className="flex-1">
                  fullscreen
                </PanelButton>
              </div>
            }
          >
            <ControlSection label="look">
              <Toggle
                label="Twinkle"
                checked={controls.twinkle}
                onChange={controls.setTwinkle}
              />
              {controls.twinkle ? (
                <Slider
                  label="Color speed"
                  value={controls.colorSpeed}
                  min={0}
                  max={180}
                  step={1}
                  onChange={controls.setColorSpeed}
                />
              ) : (
                <ColorField
                  label="Color"
                  value={controls.color}
                  onChange={controls.setColor}
                />
              )}
              <Slider
                label="Fall speed"
                value={controls.fallSpeed}
                min={1}
                max={60}
                step={1}
                onChange={controls.setFallSpeed}
              />
            </ControlSection>

            <VisualizerSection visualizer={visualizer}>
              {visualizer.reactive && (
                <Slider
                  label="Drive"
                  value={controls.drive}
                  min={0}
                  max={controls.driveMax}
                  step={0.5}
                  onChange={controls.setDrive}
                  format={(v) => v.toFixed(1)}
                />
              )}
            </VisualizerSection>
          </ControlPanel>
        </ScreensOverlay>
      )}
    </div>
  );
};

export default Matrix;
