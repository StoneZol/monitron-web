"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorField,
    ControlPanel,
    ControlSection,
    ControlSubSection,
    PanelButton,
    Slider,
    Toggle,
} from "@/components/ControlPanel";
import useMatrixHook from "./Matrix.hooks";

const INFO = {
    look: "Glyph look — color and how the rain falls.",
    color: "Fixed tint or garland hue walk.",
    twinkle: "Hue walks over time instead of a fixed rain color.",
    colorSpeed: "Hue walk rate while Twinkle is on.",
    colorField: "Fixed glyph color when Twinkle is off.",
    rain: "Column drop speed.",
    fallSpeed: "Base column drop speed (higher = faster rain).",
    drive: "How hard the audio bus punches fall speed when reactive.",
    visualizer: {
        section: "Audio in → bus meters → peak gain for reactive screens.",
        source:
            "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
        noiseGate: "Ignore mic levels below this floor (room hiss).",
        peakGain:
            "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
    },
} as const;

const Matrix = ({ showOverlay = true }: { showOverlay?: boolean }) => {
    const { canvasRef, controls, visualizer } = useMatrixHook();

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

            {showOverlay && (
                <ScreensOverlay screenId="matrix">
                    <ControlPanel
                        title="matrix"
                        actions={
                            <div className="flex gap-2">
                                <NavBackButton className="min-w-0 flex-1" />
                                <PanelButton onClick={controls.reset} className="flex-1">
                                    reset
                                </PanelButton>
                                <PanelButton
                                    onClick={controls.fullscreen}
                                    className="flex-1"
                                >
                                    fullscreen
                                </PanelButton>
                            </div>
                        }
                    >
                        <ControlSection label="look" info={INFO.look}>
                            <ControlSubSection label="color" info={INFO.color}>
                                <Toggle
                                    label="Twinkle"
                                    checked={controls.twinkle}
                                    onChange={controls.setTwinkle}
                                    info={INFO.twinkle}
                                />
                                {controls.twinkle ? (
                                    <Slider
                                        label="Color speed"
                                        value={controls.colorSpeed}
                                        min={1}
                                        max={180}
                                        step={1}
                                        onChange={controls.setColorSpeed}
                                        info={INFO.colorSpeed}
                                    />
                                ) : (
                                    <ColorField
                                        label="Color"
                                        value={controls.color}
                                        onChange={controls.setColor}
                                        info={INFO.colorField}
                                    />
                                )}
                            </ControlSubSection>

                            <ControlSubSection label="rain" info={INFO.rain}>
                                <Slider
                                    label="Fall speed"
                                    value={controls.fallSpeed}
                                    min={1}
                                    max={60}
                                    step={1}
                                    onChange={controls.setFallSpeed}
                                    info={INFO.fallSpeed}
                                />
                            </ControlSubSection>
                        </ControlSection>

                        <VisualizerSection
                            visualizer={visualizer}
                            info={INFO.visualizer}
                        >
                            {visualizer.reactive && (
                                <ControlSubSection label="drive">
                                    <Slider
                                        label="Drive"
                                        value={controls.drive}
                                        min={0}
                                        max={controls.driveMax}
                                        step={0.5}
                                        onChange={controls.setDrive}
                                        format={(v) => `×${v.toFixed(1)}`}
                                        info={INFO.drive}
                                    />
                                </ControlSubSection>
                            )}
                        </VisualizerSection>
                    </ControlPanel>
                </ScreensOverlay>
            )}
        </div>
    );
};

export default Matrix;
