"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorField,
    ControlPanel,
    ControlSection,
    ControlSubSection,
    PanelButton,
    Slider,
    TwinkleControls,
} from "@/components/ControlPanel";
import useMatrixHook from "./Matrix.hooks";

const INFO = {
    look: "Glyph look — color and how the rain falls.",
    color: "Fixed tint or HSL twinkle hue walk.",
    twinkle: "Hue cycles 0…360 in hsl(H S% L%). Off: fixed rain color.",
    twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
    twinkleS: "Saturation % for the twinkle hsl().",
    twinkleL: "Lightness % for the twinkle hsl().",
    colorField: "Fixed glyph color when Twinkle is off.",
    rain: "Column drop speed.",
    fallSpeed: "Base column drop speed (higher = faster rain).",
    drive: "How hard the audio bus punches fall speed when reactive.",
    colorDrive: "Color / twinkle pulse boost (0…2).",
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
            {/* shell > measure > canvas — PiP adopts shell only; overlay stays home */}
            <div className="absolute inset-0 h-full w-full overflow-hidden bg-black">
                <div className="relative h-full w-full">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 block h-full w-full bg-black"
                    />
                </div>
            </div>

            {showOverlay && (
                <ScreensOverlay screenId="matrix">
                    <ControlPanel
                        title="matrix"
                        actions={
                            <div className="flex gap-2">
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
                                {!controls.twinkle ? (
                                    <ColorField
                                        label="Color"
                                        value={controls.color}
                                        onChange={controls.setColor}
                                        info={INFO.colorField}
                                    />
                                ) : null}
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
                                        label="Fall"
                                        value={controls.drive}
                                        min={0}
                                        max={controls.driveMax}
                                        step={0.5}
                                        onChange={controls.setDrive}
                                        format={(v) => `×${v.toFixed(1)}`}
                                        info={INFO.drive}
                                    />
                                    <Slider
                                        label="Color"
                                        value={controls.colorDrive}
                                        min={0}
                                        max={controls.colorDriveMax}
                                        step={0.05}
                                        onChange={controls.setColorDrive}
                                        format={(v) => `×${v.toFixed(2)}`}
                                        info={INFO.colorDrive}
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
