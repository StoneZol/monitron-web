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
    mountains: "Terrain shape — flat grid or a U-channel with two side walls.",
    terrainMode:
        "flat = wide plane (wall knobs off). channel = road between two walls.",
    wallAngle:
        "Lean from vertical: −90 = flat outward, 0 = vertical, +90 = flat over the road.",
    wallOffset: "Flat road half-width near the camera (cells from center).",
    wallPerspective:
        "Convergence angle of the grid into the distance: − almost parallel, + steeper taper toward the sun.",
    roadLength:
        "How far the neon road runs toward the sun. Default is short (~⅓ of the view); slide up to extend.",
    motion: "Scroll speed of the neon grid (WE time×2 base).",
    roadSpeed: "Multiplies WE scroll speed.",
    drive: "Audio multiplies road scroll.",
    roadChannel: "Band that accelerates scroll.",
    mountChannel: "Reserved for a later wall mechanism.",
    sunChannel: "Band that pulses sun size.",
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
                        </ControlSection>

                        <ControlSection label="terrain" info={INFO.mountains}>
                            <Select
                                label="Shape"
                                value={controls.terrainMode}
                                options={[
                                    { value: "flat", label: "flat" },
                                    { value: "channel", label: "channel (walls)" },
                                ]}
                                onChange={controls.setTerrainMode}
                                info={INFO.terrainMode}
                            />
                            <Slider
                                label="Wall lean"
                                value={controls.wallAngle}
                                min={-90}
                                max={60}
                                step={1}
                                onChange={controls.setWallAngle}
                                disabled={controls.terrainMode === "flat"}
                                format={(v) =>
                                    v >= 90
                                        ? "flat"
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
                                disabled={controls.terrainMode === "flat"}
                                format={(v) => `±${Math.round(v)} cells`}
                                info={INFO.wallOffset}
                            />
                            <Slider
                                label="Perspective"
                                value={controls.wallPerspective}
                                min={-10}
                                max={10}
                                step={1}
                                onChange={controls.setWallPerspective}
                                disabled={controls.terrainMode === "flat"}
                                format={(v) =>
                                    v === 0
                                        ? "focus mid"
                                        : v > 0
                                            ? `focus +${v}`
                                            : `focus ${v}`
                                }
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
                                    <Select
                                        label="Mount channel"
                                        value={controls.mountChannel}
                                        options={[...REACTIVE_CHANNEL_OPTIONS]}
                                        onChange={controls.setMountChannel}
                                        info={INFO.mountChannel}
                                    />
                                    <Select
                                        label="Sun channel"
                                        value={controls.sunChannel}
                                        options={[...REACTIVE_CHANNEL_OPTIONS]}
                                        onChange={controls.setSunChannel}
                                        info={INFO.sunChannel}
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
