"use client";

import dynamic from "next/dynamic";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorField,
    ColorTable,
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
    skyPalette:
        "Idle = rest. Peak = beat target (locked while garland is on or audio is off). Horizon is separate.",
    skyHorizon:
        "Decorative glow blob — static tint, excluded from sky twinkle and beat lerp.",
    skySpeed: "Cloud drift speed. 1 ≈ classic WE scroll rate.",
    skyDirection:
        "Cloud drift angle in degrees. 0 = right, −90 = down, ±180 = left.",
    sunPalette:
        "Idle = rest. Peak = sun-channel target (locked while garland is on or audio is off).",
    gridPalette:
        "Idle = rest. Peak = glow-channel target (locked while garland is on or audio is off).",
    sunSize: "Scale × WE sun size.",
    sunBrightness:
        "Disk intensity. Below 1 fades opacity (colors stay clean); above 1 pushes bloom.",
    sunGradientStart:
        "How far bottom color rises. 1 = bottom owns most of the disk (survives hot tops/bloom).",
    sunGlowBrightness: "Brightness of the soft halo (color from top/bottom mix).",
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
    drive: "How hard peaks punch road scroll (idle dips a bit when channel is on).",
    roadChannel: "Band that punches scroll speed.",
    glowChannel: "Band that flashes grid glow / line brightness (bass kicks).",
    sunChannel: "Band that punches sun / glow brightness (idle dips a bit).",
    sunTwinkle:
        "Garland hue walk from sun idle colors. Peak column locked while on.",
    gridTwinkle:
        "Garland hue walk from grid idle colors. Peak column locked while on.",
    skyTwinkle:
        "Garland hue walk on sky clouds only — horizon stays put. Peak locked while on.",
    colorSpeed: "Hue walk rate while any twinkle (garland) is on.",
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
    const audioLocked = !visualizer.reactive;
    const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;

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
                            <Toggle
                                label="Sky twinkle"
                                checked={controls.skyTwinkle}
                                onChange={controls.setSkyTwinkle}
                                info={INFO.skyTwinkle}
                            />
                            <ColorTable
                                label="sky palette"
                                info={INFO.skyPalette}
                                columns={["idle", "peak"]}
                                lockedColumns={
                                    audioLocked || controls.skyTwinkle
                                        ? ["peak"]
                                        : []
                                }
                                columnStamps={
                                    controls.skyTwinkle
                                        ? { peak: "twinkle" }
                                        : audioStamp
                                }
                                rows={[
                                    {
                                        label: "sky",
                                        cells: [
                                            {
                                                value: controls.skyTop,
                                                onChange: controls.setSkyTop,
                                            },
                                            {
                                                value: controls.skyTopPeak,
                                                onChange: controls.setSkyTopPeak,
                                            },
                                        ],
                                    },
                                ]}
                            />
                            <ColorField
                                label="Horizon"
                                value={controls.skyHorizon}
                                onChange={controls.setSkyHorizon}
                                info={INFO.skyHorizon}
                            />
                            <Slider
                                label="Sky speed"
                                value={controls.skySpeed}
                                min={0}
                                max={10}
                                step={0.05}
                                onChange={controls.setSkySpeed}
                                format={(v) => `×${v.toFixed(2)}`}
                                info={INFO.skySpeed}
                            />
                            <Slider
                                label="Sky direction"
                                value={controls.skyDirection}
                                min={0}
                                max={180}
                                step={1}
                                onChange={controls.setSkyDirection}
                                format={(v) => `${Math.round(v)}°`}
                                info={INFO.skyDirection}
                            />
                            <Toggle
                                label="Sun twinkle"
                                checked={controls.sunTwinkle}
                                onChange={controls.setSunTwinkle}
                                info={INFO.sunTwinkle}
                            />
                            <ColorTable
                                label="sun palette"
                                info={INFO.sunPalette}
                                columns={["idle", "peak"]}
                                lockedColumns={
                                    audioLocked || controls.sunTwinkle
                                        ? ["peak"]
                                        : []
                                }
                                columnStamps={
                                    controls.sunTwinkle
                                        ? { peak: "twinkle" }
                                        : audioStamp
                                }
                                rows={[
                                    {
                                        label: "top",
                                        cells: [
                                            {
                                                value: controls.sunRim,
                                                onChange: controls.setSunRim,
                                            },
                                            {
                                                value: controls.sunRimPeak,
                                                onChange: controls.setSunRimPeak,
                                            },
                                        ],
                                    },
                                    {
                                        label: "bottom",
                                        cells: [
                                            {
                                                value: controls.sunMid,
                                                onChange: controls.setSunMid,
                                            },
                                            {
                                                value: controls.sunMidPeak,
                                                onChange: controls.setSunMidPeak,
                                            },
                                        ],
                                    },
                                ]}
                            />
                            <Slider
                                label="Bottom fill"
                                value={controls.sunGradientStart}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={controls.setSunGradientStart}
                                format={(v) => v.toFixed(2)}
                                info={INFO.sunGradientStart}
                            />
                            <Slider
                                label="Sun size"
                                value={controls.sunSize}
                                min={0.5}
                                max={5}
                                step={0.1}
                                onChange={controls.setSunSize}
                                format={(v) => `×${v.toFixed(2)}`}
                                info={INFO.sunSize}
                            />
                            <Slider
                                label="Sun brightness"
                                value={controls.sunBrightness}
                                min={0}
                                max={3}
                                step={0.05}
                                onChange={controls.setSunBrightness}
                                format={(v) => `×${v.toFixed(2)}`}
                                info={INFO.sunBrightness}
                            />
                            <Slider
                                label="Sun glow brightness"
                                value={controls.sunGlowBrightness}
                                min={0}
                                max={3}
                                step={0.05}
                                onChange={controls.setSunGlowBrightness}
                                format={(v) => `×${v.toFixed(2)}`}
                                info={INFO.sunGlowBrightness}
                            />
                            <Toggle
                                label="Grid twinkle"
                                checked={controls.gridTwinkle}
                                onChange={controls.setGridTwinkle}
                                info={INFO.gridTwinkle}
                            />
                            <ColorTable
                                label="grid palette"
                                info={INFO.gridPalette}
                                columns={["idle", "peak"]}
                                lockedColumns={
                                    audioLocked || controls.gridTwinkle
                                        ? ["peak"]
                                        : []
                                }
                                columnStamps={
                                    controls.gridTwinkle
                                        ? { peak: "twinkle" }
                                        : audioStamp
                                }
                                rows={[
                                    {
                                        label: "near",
                                        cells: [
                                            {
                                                value: controls.roadColor,
                                                onChange: controls.setRoadColor,
                                            },
                                            {
                                                value: controls.roadColorPeak,
                                                onChange: controls.setRoadColorPeak,
                                            },
                                        ],
                                    },
                                    {
                                        label: "far",
                                        cells: [
                                            {
                                                value: controls.roadFar,
                                                onChange: controls.setRoadFar,
                                            },
                                            {
                                                value: controls.roadFarPeak,
                                                onChange: controls.setRoadFarPeak,
                                            },
                                        ],
                                    },
                                ]}
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
                            {(controls.skyTwinkle ||
                                controls.sunTwinkle ||
                                controls.gridTwinkle) && (
                                    <Slider
                                        label="Color speed"
                                        value={controls.colorSpeed}
                                        min={1}
                                        max={180}
                                        step={1}
                                        onChange={controls.setColorSpeed}
                                        info={INFO.colorSpeed}
                                    />
                                )}
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
                                    <Select
                                        label="Glow channel"
                                        value={controls.glowChannel}
                                        options={[...REACTIVE_CHANNEL_OPTIONS]}
                                        onChange={controls.setGlowChannel}
                                        info={INFO.glowChannel}
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
