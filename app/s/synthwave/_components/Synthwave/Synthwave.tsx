"use client";

import dynamic from "next/dynamic";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorField,
    ColorTable,
    ControlPanel,
    ControlSection,
    ControlSubSection,
    PanelButton,
    Select,
    Slider,
    TwinkleControls,
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
    look: "Scene layers — sky, sunset beacon, grid, terrain framing.",
    sky: "Cloud wash + horizon tint and drift.",
    skyPalette: "Idle = rest. Peak = beat target (locked while audio is off).",
    skyHorizon:
        "Decorative glow blob — static tint, excluded from sky twinkle and beat lerp.",
    skySpeed: "Cloud drift speed. 1 ≈ classic WE scroll rate.",
    skyDirection:
        "Cloud drift angle in degrees. 0 = right, −90 = down, ±180 = left.",
    sunset:
        "Horizon beacon — sun disk now; later can swap to light pillars into the sky.",
    sunPalette:
        "Idle = rest. Peak = sun-channel target (locked while audio is off).",
    grid: "Neon road lines, floor fill, scroll speed.",
    gridPalette:
        "Idle = rest. Peak = glow-channel target (locked while audio is off).",
    sunSize: "Scale × WE sun size.",
    sunBrightness:
        "Disk intensity. Below 1 fades opacity (colors stay clean); above 1 pushes bloom.",
    sunGradientStart:
        "How far bottom color rises. 1 = bottom owns most of the disk (survives hot tops/bloom).",
    sunGlowBrightness: "Brightness of the soft halo (color from top/bottom mix).",
    roadFloor: "Opaque terrain fill (WE gridbackground).",
    roadGlow: "Soft neon halo around grid lines (shader glow, not post bloom).",
    roadThickness: "Grid stroke width. 1 = default; higher = thicker lines.",
    roadSpeed: "Multiplies base road scroll speed.",
    terrain: "Road channel framing — wall lean, width, perspective, length.",
    wallAngle:
        "Lean from vertical: −90 = flat outward, 0 = vertical, +60 = max lean inward. Tips meet when lean matches wall length vs road half-width.",
    wallOffset:
        "Road half-width in cells. Floor paints offset×2 tiles across; walls keep their own height scale.",
    wallPerspective:
        "Camera foreshortening only (0 = higher eye, 40 = lower + wider FOV). Does not warp the grid mesh.",
    roadLength:
        "How far the neon road runs toward the sun. Default is short (~⅓ of the view); slide up to extend.",
    roadChannel: "Band that punches grid scroll speed.",
    roadDrive: "Scroll punch strength for grid speed (0…8).",
    stretchChannel:
        "Band that elongates the road toward the horizon; idle eases back to Road length.",
    stretchDrive:
        "How far the road grows on a full channel hit (0 = off, 8 = max step).",
    glowChannel:
        "Band that flashes grid line glow and palette / twinkle pulse.",
    glowDrive: "Color / twinkle pulse boost for grid color (0…2).",
    sunChannel: "Band that punches sun / glow brightness (idle dips a bit).",
    sunDrive: "Color / twinkle pulse boost for sun (0…2).",
    skyTwinkle: "HSL hue walk on sky clouds only — horizon stays put.",
    skyTwinkleSpeed: "How fast sky hue runs a full lap (1 ≈ 6s).",
    skyTwinkleS: "Saturation % for sky twinkle hsl().",
    skyTwinkleL: "Lightness % for sky twinkle hsl().",
    sunTwinkle: "HSL hue walk on the sun disk (top/bottom keep idle hue split).",
    sunTwinkleSpeed: "How fast sun hue runs a full lap (1 ≈ 6s).",
    sunTwinkleS: "Saturation % for sun twinkle hsl().",
    sunTwinkleL: "Lightness % for sun twinkle hsl().",
    gridTwinkle: "HSL hue walk on grid near/far (keep idle hue split).",
    gridTwinkleSpeed: "How fast grid hue runs a full lap (1 ≈ 6s).",
    gridTwinkleS: "Saturation % for grid twinkle hsl().",
    gridTwinkleL: "Lightness % for grid twinkle hsl().",
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
                <ScreensOverlay screenId="synthwave">
                    <ControlPanel
                        title="synthwave"
                        actions={
                            <div className="flex gap-2">
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
                            <ControlSubSection label="sky" info={INFO.sky}>
                                <TwinkleControls
                                    title="sky twinkle"
                                    checked={controls.skyTwinkle}
                                    onCheckedChange={controls.setSkyTwinkle}
                                    speed={controls.skyTwinkleSpeed}
                                    onSpeedChange={controls.setSkyTwinkleSpeed}
                                    s={controls.skyTwinkleS}
                                    onSChange={controls.setSkyTwinkleS}
                                    l={controls.skyTwinkleL}
                                    onLChange={controls.setSkyTwinkleL}
                                    info={INFO.skyTwinkle}
                                    speedInfo={INFO.skyTwinkleSpeed}
                                    sInfo={INFO.skyTwinkleS}
                                    lInfo={INFO.skyTwinkleL}
                                />
                                {!controls.skyTwinkle ? (
                                    <ColorTable
                                        label="sky palette"
                                        info={INFO.skyPalette}
                                        columns={["idle", "peak"]}
                                        lockedColumns={
                                            audioLocked ? ["peak"] : []
                                        }
                                        columnStamps={audioStamp}
                                        rows={[
                                            {
                                                label: "sky",
                                                cells: [
                                                    {
                                                        value: controls.skyTop,
                                                        onChange:
                                                            controls.setSkyTop,
                                                    },
                                                    {
                                                        value: controls.skyTopPeak,
                                                        onChange:
                                                            controls.setSkyTopPeak,
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                ) : null}
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
                            </ControlSubSection>

                            <ControlSubSection label="sunset" info={INFO.sunset}>
                                <TwinkleControls
                                    title="sun twinkle"
                                    checked={controls.sunTwinkle}
                                    onCheckedChange={controls.setSunTwinkle}
                                    speed={controls.sunTwinkleSpeed}
                                    onSpeedChange={controls.setSunTwinkleSpeed}
                                    s={controls.sunTwinkleS}
                                    onSChange={controls.setSunTwinkleS}
                                    l={controls.sunTwinkleL}
                                    onLChange={controls.setSunTwinkleL}
                                    info={INFO.sunTwinkle}
                                    speedInfo={INFO.sunTwinkleSpeed}
                                    sInfo={INFO.sunTwinkleS}
                                    lInfo={INFO.sunTwinkleL}
                                />
                                {!controls.sunTwinkle ? (
                                    <ColorTable
                                        label="sun palette"
                                        info={INFO.sunPalette}
                                        columns={["idle", "peak"]}
                                        lockedColumns={
                                            audioLocked ? ["peak"] : []
                                        }
                                        columnStamps={audioStamp}
                                        rows={[
                                            {
                                                label: "top",
                                                cells: [
                                                    {
                                                        value: controls.sunRim,
                                                        onChange:
                                                            controls.setSunRim,
                                                    },
                                                    {
                                                        value: controls.sunRimPeak,
                                                        onChange:
                                                            controls.setSunRimPeak,
                                                    },
                                                ],
                                            },
                                            {
                                                label: "bottom",
                                                cells: [
                                                    {
                                                        value: controls.sunMid,
                                                        onChange:
                                                            controls.setSunMid,
                                                    },
                                                    {
                                                        value: controls.sunMidPeak,
                                                        onChange:
                                                            controls.setSunMidPeak,
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                ) : null}
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
                            </ControlSubSection>

                            <ControlSubSection label="grid" info={INFO.grid}>
                                <TwinkleControls
                                    title="grid twinkle"
                                    checked={controls.gridTwinkle}
                                    onCheckedChange={controls.setGridTwinkle}
                                    speed={controls.gridTwinkleSpeed}
                                    onSpeedChange={controls.setGridTwinkleSpeed}
                                    s={controls.gridTwinkleS}
                                    onSChange={controls.setGridTwinkleS}
                                    l={controls.gridTwinkleL}
                                    onLChange={controls.setGridTwinkleL}
                                    info={INFO.gridTwinkle}
                                    speedInfo={INFO.gridTwinkleSpeed}
                                    sInfo={INFO.gridTwinkleS}
                                    lInfo={INFO.gridTwinkleL}
                                />
                                {!controls.gridTwinkle ? (
                                    <ColorTable
                                        label="grid palette"
                                        info={INFO.gridPalette}
                                        columns={["idle", "peak"]}
                                        lockedColumns={
                                            audioLocked ? ["peak"] : []
                                        }
                                        columnStamps={audioStamp}
                                        rows={[
                                            {
                                                label: "near",
                                                cells: [
                                                    {
                                                        value: controls.roadColor,
                                                        onChange:
                                                            controls.setRoadColor,
                                                    },
                                                    {
                                                        value: controls.roadColorPeak,
                                                        onChange:
                                                            controls.setRoadColorPeak,
                                                    },
                                                ],
                                            },
                                            {
                                                label: "far",
                                                cells: [
                                                    {
                                                        value: controls.roadFar,
                                                        onChange:
                                                            controls.setRoadFar,
                                                    },
                                                    {
                                                        value: controls.roadFarPeak,
                                                        onChange:
                                                            controls.setRoadFarPeak,
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                ) : null}
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
                            </ControlSubSection>

                            <ControlSubSection label="terrain" info={INFO.terrain}>
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
                                        v < 0.01
                                            ? "short"
                                            : `+${Math.round(v * 100)}%`
                                    }
                                    info={INFO.roadLength}
                                />
                            </ControlSubSection>
                        </ControlSection>

                        <VisualizerSection visualizer={visualizer} info={INFO.visualizer}>
                            {visualizer.reactive && (
                                <>
                                    <ControlSubSection label="channels">
                                        <Select
                                            label="Grid speed"
                                            value={controls.roadChannel}
                                            options={[...REACTIVE_CHANNEL_OPTIONS]}
                                            onChange={controls.setRoadChannel}
                                            info={INFO.roadChannel}
                                        />
                                        <Select
                                            label="Road stretch"
                                            value={controls.stretchChannel}
                                            options={[...REACTIVE_CHANNEL_OPTIONS]}
                                            onChange={controls.setStretchChannel}
                                            info={INFO.stretchChannel}
                                        />
                                        <Select
                                            label="Grid color"
                                            value={controls.glowChannel}
                                            options={[...REACTIVE_CHANNEL_OPTIONS]}
                                            onChange={controls.setGlowChannel}
                                            info={INFO.glowChannel}
                                        />
                                        <Select
                                            label="Sun"
                                            value={controls.sunChannel}
                                            options={[...REACTIVE_CHANNEL_OPTIONS]}
                                            onChange={controls.setSunChannel}
                                            info={INFO.sunChannel}
                                        />
                                    </ControlSubSection>
                                    <ControlSubSection label="drive">
                                        <Slider
                                            label="Grid speed"
                                            value={controls.roadDrive}
                                            min={0}
                                            max={controls.speedDriveMax}
                                            step={0.5}
                                            onChange={controls.setRoadDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.roadDrive}
                                        />
                                        <Slider
                                            label="Road stretch"
                                            value={controls.stretchDrive}
                                            min={0}
                                            max={controls.speedDriveMax}
                                            step={0.5}
                                            onChange={controls.setStretchDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.stretchDrive}
                                        />
                                        <Slider
                                            label="Grid color"
                                            value={controls.glowDrive}
                                            min={0}
                                            max={controls.colorDriveMax}
                                            step={0.05}
                                            onChange={controls.setGlowDrive}
                                            format={(v) => `×${v.toFixed(2)}`}
                                            info={INFO.glowDrive}
                                        />
                                        <Slider
                                            label="Sun"
                                            value={controls.sunDrive}
                                            min={0}
                                            max={controls.colorDriveMax}
                                            step={0.05}
                                            onChange={controls.setSunDrive}
                                            format={(v) => `×${v.toFixed(2)}`}
                                            info={INFO.sunDrive}
                                        />
                                    </ControlSubSection>
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
