"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorTable,
    ControlCluster,
    ControlPanel,
    ControlSection,
    ControlSubSection,
    Select,
    Slider,
    TwinkleControls,
} from "@/components/ControlPanel";
import QuaternionfractalCanvas from "./Quaternionfractal.Canvas";
import useQuaternionfractalHook from "./Quaternionfractal.hooks";
import {
    QUATERNIONFRACTAL_RANGES,
    type QuaternionfractalColorMode,
    type QuaternionfractalProps,
    type ReactiveChannel,
} from "./Quaternionfractal.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
    { value: "off", label: "off" },
    { value: "bass", label: "bass (30–180 Hz)" },
    { value: "mid", label: "mid (200 Hz–2 kHz)" },
    { value: "high", label: "high (2–10 kHz)" },
    { value: "beat", label: "beat (peak punches)" },
];

const COLOR_MODE_OPTIONS: {
    value: QuaternionfractalColorMode;
    label: string;
}[] = [
        { value: "original", label: "original (idle / peak)" },
        { value: "twinkle", label: "twinkle (solid HSL)" },
    ];

const INFO = {
    look: "Quaternion Fractal (asyncker) — sinh/cosh quat raymarch with camera orbit.",
    cameraSpeed: "Base camera orbit / zoom clock (1 ≈ Shadertoy iTime).",
    colorMode:
        "original = stock hue × idle/peak pickers. twinkle = solid HSL walk.",
    colorPalette:
        "Idle = rest tint. Peak = light-channel target. Mixes with stock hue.",
    twinkle: "Solid HSL hue walk over the fractal surface.",
    twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
    twinkleS: "Saturation % for the twinkle hsl().",
    twinkleL: "Lightness % for the twinkle hsl().",
    saturation: "Look chroma (0 = gray, 1 = default).",
    colorChannel: "Band that drives light — idle→peak and surface punch.",
    speedChannel: "Band that lifts camera cruise.",
    accelChannel: "Band that kicks camera acceleration.",
    colorDrive: "Light / peak punch strength.",
    speedDrive: "Camera cruise strength.",
    accelDrive: "Camera kick strength.",
    visualizer: {
        section: "Audio in → bus meters → peak gain for reactive screens.",
        source:
            "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
        noiseGate: "Ignore mic levels below this floor (room hiss).",
        peakGain:
            "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
    },
} as const;

const Quaternionfractal = ({ showOverlay = true }: QuaternionfractalProps) => {
    const { liveRef, vizRef, visualizer, controls } = useQuaternionfractalHook();
    const audioLocked = !visualizer.reactive;
    const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
    const mode = controls.colorMode;

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
            <QuaternionfractalCanvas liveRef={liveRef} vizRef={vizRef} />

            {showOverlay ? (
                <ScreensOverlay screenId="quaternion_fractal">
                    <ControlPanel
                        title="quaternion fractal"
                        onReset={controls.reset}
                        onFullscreen={controls.fullscreen}
                    >
                        <ControlSection label="look" info={INFO.look}>
                            <ControlSubSection label="color" info={INFO.colorMode}>
                                <Select
                                    label="Color mode"
                                    value={controls.colorMode}
                                    options={COLOR_MODE_OPTIONS}
                                    onChange={controls.setColorMode}
                                    info={INFO.colorMode}
                                />
                                {mode === "original" ? (
                                    <ColorTable
                                        label="fractal palette"
                                        info={INFO.colorPalette}
                                        columns={["idle", "peak"]}
                                        lockedColumns={audioLocked ? ["peak"] : []}
                                        columnStamps={audioStamp}
                                        rows={[
                                            {
                                                label: "tint",
                                                cells: [
                                                    {
                                                        value: controls.color,
                                                        onChange: controls.setColor,
                                                    },
                                                    {
                                                        value: controls.colorPeak,
                                                        onChange: controls.setColorPeak,
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                ) : null}
                                {mode === "twinkle" ? (
                                    <TwinkleControls
                                        title="twinkle"
                                        checked
                                        showToggle={false}
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
                                ) : null}
                            </ControlSubSection>

                            <ControlCluster className="w-full basis-full grid-cols-1 gap-4 sm:grid-cols-2">
                                <Slider
                                    label="Camera speed"
                                    value={controls.cameraSpeed}
                                    min={QUATERNIONFRACTAL_RANGES.cameraSpeed.min}
                                    max={QUATERNIONFRACTAL_RANGES.cameraSpeed.max}
                                    step={QUATERNIONFRACTAL_RANGES.cameraSpeed.step}
                                    onChange={controls.setCameraSpeed}
                                    format={(v) => `×${v.toFixed(2)}`}
                                    info={INFO.cameraSpeed}
                                />
                                <Slider
                                    label="Saturation"
                                    value={controls.saturation}
                                    min={QUATERNIONFRACTAL_RANGES.saturation.min}
                                    max={QUATERNIONFRACTAL_RANGES.saturation.max}
                                    step={QUATERNIONFRACTAL_RANGES.saturation.step}
                                    onChange={controls.setSaturation}
                                    format={(v) => `×${v.toFixed(2)}`}
                                    info={INFO.saturation}
                                />
                            </ControlCluster>
                        </ControlSection>

                        <VisualizerSection
                            visualizer={visualizer}
                            info={INFO.visualizer}
                        >
                            {visualizer.reactive ? (
                                <>
                                    <ControlSubSection label="channels">
                                        <Select
                                            label="Light"
                                            value={controls.colorChannel}
                                            options={REACTIVE_CHANNEL_OPTIONS}
                                            onChange={controls.setColorChannel}
                                            info={INFO.colorChannel}
                                        />
                                        <Select
                                            label="Camera"
                                            value={controls.speedChannel}
                                            options={REACTIVE_CHANNEL_OPTIONS}
                                            onChange={controls.setSpeedChannel}
                                            info={INFO.speedChannel}
                                        />
                                        <Select
                                            label="Camera accel"
                                            value={controls.accelChannel}
                                            options={REACTIVE_CHANNEL_OPTIONS}
                                            onChange={controls.setAccelChannel}
                                            info={INFO.accelChannel}
                                        />
                                    </ControlSubSection>
                                    <ControlSubSection label="drive">
                                        <Slider
                                            label="Light"
                                            value={controls.colorDrive}
                                            min={QUATERNIONFRACTAL_RANGES.colorDrive.min}
                                            max={controls.colorDriveMax}
                                            step={QUATERNIONFRACTAL_RANGES.colorDrive.step}
                                            onChange={controls.setColorDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.colorDrive}
                                        />
                                        <Slider
                                            label="Camera"
                                            value={controls.speedDrive}
                                            min={QUATERNIONFRACTAL_RANGES.speedDrive.min}
                                            max={controls.speedDriveMax}
                                            step={QUATERNIONFRACTAL_RANGES.speedDrive.step}
                                            onChange={controls.setSpeedDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.speedDrive}
                                        />
                                        <Slider
                                            label="Camera accel"
                                            value={controls.accelDrive}
                                            min={QUATERNIONFRACTAL_RANGES.accelDrive.min}
                                            max={controls.accelDriveMax}
                                            step={QUATERNIONFRACTAL_RANGES.accelDrive.step}
                                            onChange={controls.setAccelDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.accelDrive}
                                        />
                                    </ControlSubSection>
                                </>
                            ) : null}
                        </VisualizerSection>
                    </ControlPanel>
                </ScreensOverlay>
            ) : null}
        </div>
    );
};

export default Quaternionfractal;
