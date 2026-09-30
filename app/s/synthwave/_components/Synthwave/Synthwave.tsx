"use client";

import dynamic from "next/dynamic";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorField,
    ControlPanel,
    ControlSection,
    PanelButton,
    Select,
    Slider,
    Toggle,
} from "@/components/ControlPanel";
import useSynthwaveHook from "./Synthwave.hooks";
import type { SynthwaveProps } from "./Synthwave.types";

const REACTIVE_CHANNEL_OPTIONS = [
    { value: "off", label: "off" },
    { value: "bass", label: "bass (30–180 Hz)" },
    { value: "mid", label: "mid (200 Hz–2 kHz)" },
    { value: "high", label: "high (2–10 kHz)" },
    { value: "beat", label: "beat (peak punches)" },
] as const;

const INFO = {
    look: "Wallpaper Engine neon_sunset materials — grid, sun, sky.",
    skyTop: "Cloud / upper sky tint (WE clouds).",
    skyHorizon: "Horizon glow tint.",
    sunRim: "Sun top color (WE colorsuntop).",
    sunCore: "Sun bottom + glow (WE colorsunbottom).",
    sunSize: "Scale × WE sun size.",
    roadColor: "Near grid neon (WE gridnear).",
    roadFar: "Far grid neon (WE gridfar).",
    roadFloor: "Opaque terrain fill (WE gridbackground).",
    roadGlow: "Soft neon halo around grid lines (shader glow, not post bloom).",
    roadThickness: "Grid stroke width. 1 = default; higher = thicker lines.",
    mountains: "Road between two hinged walls — lean ±90° for flat.",
    wallAngle:
        "Lean from vertical: −90 = flat outward, 0 = vertical, +60 = max lean inward. Tips meet when lean matches wall length vs road half-width.",
    wallOffset:
        "Road half-width in cells. Floor paints offset×2 tiles across; walls keep their own height scale.",
    wallPerspective:
        "Camera foreshortening only (0 = higher eye, 40 = lower + wider FOV). Does not warp the grid mesh.",
    roadLength:
        "How far the neon road runs toward the sun. Default is short (~⅓ of the view); slide up to extend.",
    motion: "Scroll speed of the neon grid.",
    roadSpeed: "Multiplies base scroll speed.",
    drive: "How strongly audio accelerates road scroll.",
    roadChannel: "Band that accelerates scroll.",
    sunTwinkle: "Hue walks over time from sun top/bottom colors.",
    gridTwinkle: "Hue walks over time from grid near/far colors.",
    skyTwinkle: "Hue walks over time from sky / horizon colors.",
    visualizer: {
        section: "Audio in → bus meters → peak gain for reactive screens.",
        source:
            "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
        noiseGate: "Ignore mic levels below this floor (room hiss).",
        peakGain:
            "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
    },
} as const;

const SynthwaveCanvas = dynamic(() => import("./Synthwave.Canvas"), {
    ssr: false,
});

const Synthwave = ({ showOverlay = true }: SynthwaveProps) => {
    const { liveRef, controls, visualizer } = useSynthwaveHook();

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
            <SynthwaveCanvas liveRef={liveRef} vizRef={visualizer.vizRef} />

            {showOverlay && (
                <ScreensOverlay>
                    <ControlPanel
                        title="synthwave"
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
                        <ControlSection label="look" info={INFO.look}>
                            <ColorField
                                label="Sky"
                                value={controls.skyTop}
                                onChange={controls.setSkyTop}
                                info={INFO.skyTop}
                            />
                            <ColorField
                                label="Horizon"
                                value={controls.skyHorizon}
                                onChange={controls.setSkyHorizon}
                                info={INFO.skyHorizon}
                            />
                            <Toggle
                                label="Sky twinkle"
                                checked={controls.skyTwinkle}
                                onChange={controls.setSkyTwinkle}
                                info={INFO.skyTwinkle}
                            />
                            <ColorField
                                label="Sun top"
                                value={controls.sunRim}
                                onChange={controls.setSunRim}
                                info={INFO.sunRim}
                            />
                            <ColorField
                                label="Sun bottom"
                                value={controls.sunCore}
                                onChange={controls.setSunCore}
                                info={INFO.sunCore}
                            />
                            <Slider
                                label="Sun size"
                                value={controls.sunSize}
                                min={0.4}
                                max={2}
                                step={0.1}
                                onChange={controls.setSunSize}
                                format={(v) => `×${v.toFixed(2)}`}
                                info={INFO.sunSize}
                            />
                            <Toggle
                                label="Sun twinkle"
                                checked={controls.sunTwinkle}
                                onChange={controls.setSunTwinkle}
                                info={INFO.sunTwinkle}
                            />
                            <ColorField
                                label="Grid near"
                                value={controls.roadColor}
                                onChange={controls.setRoadColor}
                                info={INFO.roadColor}
                            />
                            <ColorField
                                label="Grid far"
                                value={controls.roadFar}
                                onChange={controls.setRoadFar}
                                info={INFO.roadFar}
                            />
                            <ColorField
                                label="Floor"
                                value={controls.roadFloor}
                                onChange={controls.setRoadFloor}
                                info={INFO.roadFloor}
                            />
                            <Slider
                                label="Grid glow"
                                value={controls.roadGlow}
                                min={0}
                                max={40}
                                step={1}
                                onChange={controls.setRoadGlow}
                                format={(v) => `${Math.round(v)}`}
                                info={INFO.roadGlow}
                            />
                            <Slider
                                label="Grid thickness"
                                value={controls.roadThickness}
                                min={0.5}
                                max={3}
                                step={0.05}
                                onChange={controls.setRoadThickness}
                                format={(v) => `×${v.toFixed(2)}`}
                                info={INFO.roadThickness}
                            />
                            <Toggle
                                label="Grid twinkle"
                                checked={controls.gridTwinkle}
                                onChange={controls.setGridTwinkle}
                                info={INFO.gridTwinkle}
                            />
                        </ControlSection>

                        <ControlSection label="terrain" info={INFO.mountains}>
                            <Slider
                                label="Wall lean"
                                value={controls.wallAngle}
                                min={-90}
                                max={60}
                                step={1}
                                onChange={controls.setWallAngle}
                                format={(v) =>
                                    Math.abs(v) >= 90
                                        ? v > 0
                                            ? "flat in"
                                            : "flat out"
                                        : `${v > 0 ? "+" : ""}${Math.round(v)}°`
                                }
                                info={INFO.wallAngle}
                            />
                            <Slider
                                label="Wall offset"
                                value={controls.wallOffset}
                                min={1}
                                max={16}
                                step={1}
                                onChange={controls.setWallOffset}
                                format={(v) => `±${Math.round(v)} cells`}
                                info={INFO.wallOffset}
                            />
                            <Slider
                                label="Perspective"
                                value={controls.wallPerspective}
                                min={0}
                                max={40}
                                step={1}
                                onChange={controls.setWallPerspective}
                                format={(v) => `${Math.round(v)}`}
                                info={INFO.wallPerspective}
                            />
                            <Slider
                                label="Road length"
                                value={controls.roadLength}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={controls.setRoadLength}
                                format={(v) =>
                                    v < 0.01 ? "short" : `+${Math.round(v * 100)}%`
                                }
                                info={INFO.roadLength}
                            />
                        </ControlSection>

                        <ControlSection label="motion" info={INFO.motion}>
                            <Slider
                                label="Road speed"
                                value={controls.roadSpeed}
                                min={0.1}
                                max={4}
                                step={0.05}
                                onChange={controls.setRoadSpeed}
                                format={(v) => v.toFixed(2)}
                                info={INFO.roadSpeed}
                            />
                        </ControlSection>

                        <VisualizerSection visualizer={visualizer} info={INFO.visualizer}>
                            {visualizer.reactive && (
                                <>
                                    <Slider
                                        label="Drive"
                                        value={controls.drive}
                                        min={0}
                                        max={controls.driveMax}
                                        step={0.5}
                                        onChange={controls.setDrive}
                                        format={(v) => v.toFixed(1)}
                                        info={INFO.drive}
                                    />
                                    <Select
                                        label="Road channel"
                                        value={controls.roadChannel}
                                        options={[...REACTIVE_CHANNEL_OPTIONS]}
                                        onChange={controls.setRoadChannel}
                                        info={INFO.roadChannel}
                                    />
                                </>
                            )}
                        </VisualizerSection>
                    </ControlPanel>
                </ScreensOverlay>
            )}
        </div>
    );
};

export default Synthwave;
