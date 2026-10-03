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
    Toggle,
    TwinkleControls,
} from "@/components/ControlPanel";
import useHexagonsPlaceHook from "./HexagonsPlace.hooks";
import type { HexagonsPlaceProps } from "./HexagonsPlace.types";

const REACTIVE_CHANNEL_OPTIONS = [
    { value: "off", label: "off" },
    { value: "bass", label: "bass (30–180 Hz)" },
    { value: "mid", label: "mid (200 Hz–2 kHz)" },
    { value: "high", label: "high (2–10 kHz)" },
    { value: "beat", label: "beat (peak punches)" },
] as const;

const INFO = {
    look: "Surface look: HSL twinkle, caps palette, hex density.",
    twinkle:
        "Hue cycles 0…360 on edges / fog. Mutex with Caps. Off: flat Edge color.",
    twinkleSpeed: "How fast hue runs a full lap (1 ≈ 6s).",
    twinkleS: "Saturation % for the twinkle hsl().",
    twinkleL: "Lightness % for the twinkle hsl().",
    caps: "Per-band cap colors (idle/peak). Turns off twinkle / Edge color.",
    edge: "Flat edge line color when Caps and Twinkle are off.",
    capsPalette:
        "Idle = resting color. Peak = reactive target (locked until audio is on).",
    hexGrid: "How many hex rings — denser grid, heavier scene.",
    fog: "Ground fog slab — height, density, and color modes.",
    fogFixed: "Freeze fog hue (no twinkle walk on fog).",
    fogParallel: "Fog hue walks in parallel with the main twinkle.",
    fogParallelSpeed: "How fast parallel fog hue walks vs the main speed.",
    fogColors: "Fog idle / peak colors. Peak needs a live audio source.",
    fogHeight: "How tall the fog volume sits above the ground.",
    fogDensity: "How opaque the fog reads (0 = clear).",
    lightIntensity: "Scene light multiplier (most visible with Caps).",
    camera: "Orbit camera — angle, height, frame, spin.",
    cameraAngle: "Pitch toward the field (degrees).",
    cameraHeight: "How high the camera sits above the ground.",
    cameraOffset: "Push the camera back along the view axis.",
    cameraRotate: "Yaw offset around the field center.",
    cameraZoom: "Lens zoom (higher = tighter frame).",
    spin: "Auto-orbit the camera around the field.",
    spinDir: "Orbit direction — Left or Right.",
    spinSpeed: "Base orbit speed when Spin is on.",
    grid: "Floor hex outline color and scale.",
    gridFixed: "Use one fixed grid color instead of idle/peak.",
    gridColor: "Fixed outline color when Fixed is on.",
    gridColors: "Grid idle / peak colors. Peak needs a live audio source.",
    gridScale: "Size of each hex cell on the floor.",
    bandBounce: "Caps/height bounce with the selected audio bands.",
    bandFlicker: "Brightness flicker driven by audio bands.",
    gridChannel: "Which bus band drives grid peak / reaction.",
    fogChannel: "Which bus band drives fog peak / twinkle pulse.",
    spinChannel: "Which bus band boosts camera spin (beat punches hard).",
    gridDrive: "Grid color punch (0…2).",
    fogDrive: "Fog / twinkle color punch (0…2).",
    spinDrive: "How hard the spin channel multiplies orbit speed.",
    visualizer: {
        section: "Audio in → bus meters → peak gain for reactive screens.",
        source:
            "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
        noiseGate: "Ignore mic levels below this floor (room hiss).",
        peakGain:
            "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
    },
} as const;

const HexagonsCanvas = dynamic(() => import("./HexagonsPlace.Canvas"), {
    ssr: false,
});

const HexagonsPlace = ({ showOverlay = true }: HexagonsPlaceProps) => {
    const { live, controls, visualizer } = useHexagonsPlaceHook();
    const peakLocked = !visualizer.reactive;
    const peakStamp = !visualizer.reactive
        ? ({ peak: "audio" } as const)
        : undefined;

  return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
            <HexagonsCanvas live={live} vizRef={visualizer.vizRef} />

            {showOverlay && (
                <ScreensOverlay screenId="hexagons_place">
                    <ControlPanel
                        title="hexagons place"
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
                            <ControlSubSection label="mode">
                                {!controls.caps ? (
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
                                ) : null}
                                <Toggle
                                    label="Caps"
                                    checked={controls.caps}
                                    onChange={controls.setCaps}
                                    info={INFO.caps}
                                />
                                {!controls.caps && !controls.twinkle ? (
                                    <ColorField
                                        label="Edge"
                                        value={controls.edgeColor}
                                        onChange={controls.setEdgeColor}
                                        info={INFO.edge}
                                    />
                                ) : null}
                                <Slider
                                    label="Light"
                                    value={controls.lightIntensity}
                                    min={0}
                                    max={2}
                                    step={0.05}
                                    onChange={controls.setLightIntensity}
                                    format={(v) => `×${v.toFixed(2)}`}
                                    info={INFO.lightIntensity}
                                />
                            </ControlSubSection>

                            {controls.caps && (
                                <ControlSubSection label="caps">
                                    <ColorTable
                                        label="caps palette"
                                        info={INFO.capsPalette}
                                        columns={["idle", "peak"]}
                                        lockedColumns={
                                            peakLocked ? ["peak"] : []
                                        }
                                        columnStamps={peakStamp}
                                        rows={[
                                            {
                                                label: "bass",
                                                cells: [
                                                    {
                                                        value: controls.capBassIdle,
                                                        onChange:
                                                            controls.setCapBassIdle,
                                                    },
                                                    {
                                                        value: controls.capBassPeak,
                                                        onChange:
                                                            controls.setCapBassPeak,
                                                    },
                                                ],
                                            },
                                            {
                                                label: "mid",
                                                cells: [
                                                    {
                                                        value: controls.capMidIdle,
                                                        onChange:
                                                            controls.setCapMidIdle,
                                                    },
                                                    {
                                                        value: controls.capMidPeak,
                                                        onChange:
                                                            controls.setCapMidPeak,
                                                    },
                                                ],
                                            },
                                            {
                                                label: "high",
                                                cells: [
                                                    {
                                                        value: controls.capHighIdle,
                                                        onChange:
                                                            controls.setCapHighIdle,
                                                    },
                                                    {
                                                        value: controls.capHighPeak,
                                                        onChange:
                                                            controls.setCapHighPeak,
                                                    },
                                                ],
                                            },
                                            {
                                                label: "fog",
                                                cells: [
                                                    {
                                                        value: controls.capFogIdle,
                                                        onChange:
                                                            controls.setCapFogIdle,
                                                    },
                                                    {
                                                        value: controls.capFogPeak,
                                                        onChange:
                                                            controls.setCapFogPeak,
                                                    },
                                                ],
                                            },
                                            {
                                                label: "grid",
                                                cells: [
                                                    {
                                                        value: controls.capGridIdle,
                                                        onChange:
                                                            controls.setCapGridIdle,
                                                    },
                                                    {
                                                        value: controls.capGridPeak,
                                                        onChange:
                                                            controls.setCapGridPeak,
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                </ControlSubSection>
                            )}

                            <ControlSubSection label="field">
                                <Slider
                                    label="Hex grid"
                                    value={controls.hexGrid}
                                    min={57}
                                    max={107}
                                    step={1}
                                    onChange={controls.setHexGrid}
                                    format={(v) => v.toFixed(0)}
                                    info={INFO.hexGrid}
                                />
                            </ControlSubSection>
                        </ControlSection>

                        <ControlSection label="fog" info={INFO.fog}>
                            <ControlSubSection label="tint">
                                {controls.twinkle && !controls.caps && (
                                    <>
                                        <div className="flex flex-wrap gap-1.5">
                                            <Toggle
                                                label="Fixed"
                                                checked={controls.fogFixed}
                                                onChange={controls.setFogFixed}
                                                info={INFO.fogFixed}
                                            />
                                            <Toggle
                                                label="Parallel"
                                                checked={controls.fogParallel}
                                                onChange={controls.setFogParallel}
                                                info={INFO.fogParallel}
                                            />
                                        </div>
                                        {controls.fogParallel && (
                                            <Slider
                                                label="Speed ×"
                                                value={controls.fogParallelSpeed}
                                                min={0.25}
                                                max={4}
                                                step={0.05}
                                                onChange={
                                                    controls.setFogParallelSpeed
                                                }
                                                format={(v) => v.toFixed(2)}
                                                info={INFO.fogParallelSpeed}
                                            />
                                        )}
                                    </>
                                )}
                                {!controls.caps &&
                                    (!controls.twinkle ||
                                        controls.fogFixed ||
                                        controls.fogParallel) &&
                                    !(
                                        controls.twinkle &&
                                        controls.fogParallel
                                    ) && (
                                        <ColorTable
                                            info={INFO.fogColors}
                                            columns={["idle", "peak"]}
                                            lockedColumns={
                                                peakLocked ? ["peak"] : []
                                            }
                                            columnStamps={peakStamp}
                                            rows={[
                                                {
                                                    label: "",
                                                    cells: [
                                                        {
                                                            value: controls.fogIdle,
                                                            onChange:
                                                                controls.setFogIdle,
                                                        },
                                                        {
                                                            value: controls.fogPeak,
                                                            onChange:
                                                                controls.setFogPeak,
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                    )}
                            </ControlSubSection>
                            <ControlSubSection label="volume">
                                <Slider
                                    label="Height"
                                    value={controls.fogHeight}
                                    min={0.15}
                                    max={3}
                                    step={0.05}
                                    onChange={controls.setFogHeight}
                                    format={(v) => v.toFixed(2)}
                                    info={INFO.fogHeight}
                                />
                                <Slider
                                    label="Density"
                                    value={controls.fogDensity}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    onChange={controls.setFogDensity}
                                    format={(v) => v.toFixed(2)}
                                    info={INFO.fogDensity}
                                />
                            </ControlSubSection>
                        </ControlSection>

                        <ControlSection label="camera" info={INFO.camera}>
                            <ControlSubSection label="framing">
                                <Slider
                                    label="Angle"
                                    value={controls.cameraAngle}
                                    min={20}
                                    max={70}
                                    step={1}
                                    onChange={controls.setCameraAngle}
                                    info={INFO.cameraAngle}
                                />
                                <Slider
                                    label="Height"
                                    value={controls.cameraHeight}
                                    min={4}
                                    max={20}
                                    step={0.1}
                                    onChange={controls.setCameraHeight}
                                    format={(v) => v.toFixed(1)}
                                    info={INFO.cameraHeight}
                                />
                                <Slider
                                    label="Offset"
                                    value={controls.cameraOffset}
                                    min={0}
                                    max={30}
                                    step={1}
                                    onChange={controls.setCameraOffset}
                                    format={(v) => v.toFixed(1)}
                                    info={INFO.cameraOffset}
                                />
                                <Slider
                                    label="Rotate"
                                    value={controls.cameraRotate}
                                    min={-45}
                                    max={45}
                                    step={1}
                                    onChange={controls.setCameraRotate}
                                    info={INFO.cameraRotate}
                                />
                                <Slider
                                    label="Zoom"
                                    value={controls.cameraZoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={controls.setCameraZoom}
                                    format={(v) => v.toFixed(2)}
                                    info={INFO.cameraZoom}
                                />
                            </ControlSubSection>
                            <ControlSubSection label="orbit">
                                <div className="flex flex-wrap gap-1.5">
                                    <Toggle
                                        label="Spin"
                                        checked={controls.spin}
                                        onChange={controls.setSpin}
                                        info={INFO.spin}
                                    />
                                    <Toggle
                                        label={
                                            controls.spinLeft ? "Left" : "Right"
                                        }
                                        checked={controls.spinLeft}
                                        onChange={controls.setSpinLeft}
                                        disabled={!controls.spin}
                                        info={INFO.spinDir}
                                    />
                                </div>
                                {controls.spin && (
                                    <Slider
                                        label="Spin speed"
                                        value={controls.spinSpeed}
                                        min={0.1}
                                        max={4}
                                        step={0.05}
                                        onChange={controls.setSpinSpeed}
                                        format={(v) => v.toFixed(2)}
                                        info={INFO.spinSpeed}
                                    />
                                )}
                            </ControlSubSection>
                        </ControlSection>

                        <ControlSection label="grid" info={INFO.grid}>
                            <ControlSubSection label="tint">
                                <Toggle
                                    label="Fixed"
                                    checked={controls.gridFixed}
                                    onChange={controls.setGridFixed}
                                    info={INFO.gridFixed}
                                />
                                {controls.gridFixed ? (
                                    <ColorField
                                        label="Color"
                                        value={controls.gridColor}
                                        onChange={controls.setGridColor}
                                        info={INFO.gridColor}
                                    />
                                ) : (
                                    !controls.caps &&
                                    !controls.twinkle && (
                                        <ColorTable
                                            info={INFO.gridColors}
                                            columns={["idle", "peak"]}
                                            lockedColumns={
                                                peakLocked ? ["peak"] : []
                                            }
                                            columnStamps={peakStamp}
                                            rows={[
                                                {
                                                    label: "",
                                                    cells: [
                                                        {
                                                            value: controls.capGridIdle,
                                                            onChange:
                                                                controls.setCapGridIdle,
                                                        },
                                                        {
                                                            value: controls.capGridPeak,
                                                            onChange:
                                                                controls.setCapGridPeak,
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                    )
                                )}
                            </ControlSubSection>
                            <ControlSubSection label="scale">
                                <Slider
                                    label="Scale ×"
                                    value={controls.gridScale}
                                    min={0.25}
                                    max={4}
                                    step={0.05}
                                    onChange={controls.setGridScale}
                                    format={(v) => v.toFixed(2)}
                                    info={INFO.gridScale}
                                />
                            </ControlSubSection>
                        </ControlSection>

                        <VisualizerSection
                            visualizer={visualizer}
                            info={INFO.visualizer}
                        >
                            <ControlSubSection label="react">
                                <div className="flex flex-wrap gap-1.5">
                                    <Toggle
                                        label="Band bounce"
                                        checked={controls.bandBounce}
                                        onChange={controls.setBandBounce}
                                        disabled={!visualizer.reactive}
                                        info={INFO.bandBounce}
                                    />
                                    <Toggle
                                        label="Flicker"
                                        checked={controls.bandFlicker}
                                        onChange={controls.setBandFlicker}
                                        disabled={!visualizer.reactive}
                                        info={INFO.bandFlicker}
                                    />
                                </div>
                            </ControlSubSection>
                            {visualizer.reactive && (
                                <>
                                    <ControlSubSection label="channels">
                                        <Select
                                            label="Grid"
                                            value={controls.gridChannel}
                                            options={[
                                                ...REACTIVE_CHANNEL_OPTIONS,
                                            ]}
                                            onChange={controls.setGridChannel}
                                            info={INFO.gridChannel}
                                        />
                                        <Select
                                            label="Fog"
                                            value={controls.fogChannel}
                                            options={[
                                                ...REACTIVE_CHANNEL_OPTIONS,
                                            ]}
                                            onChange={controls.setFogChannel}
                                            info={INFO.fogChannel}
                                        />
                                        <Select
                                            label="Spin"
                                            value={controls.spinChannel}
                                            options={[
                                                ...REACTIVE_CHANNEL_OPTIONS,
                                            ]}
                                            onChange={controls.setSpinChannel}
                                            info={INFO.spinChannel}
                                        />
                                    </ControlSubSection>
                                    <ControlSubSection label="drive">
                                        <Slider
                                            label="Grid"
                                            value={controls.gridDrive}
                                            min={0}
                                            max={controls.colorDriveMax}
                                            step={0.05}
                                            onChange={controls.setGridDrive}
                                            format={(v) => `×${v.toFixed(2)}`}
                                            info={INFO.gridDrive}
                                        />
                                        <Slider
                                            label="Fog"
                                            value={controls.fogDrive}
                                            min={0}
                                            max={controls.colorDriveMax}
                                            step={0.05}
                                            onChange={controls.setFogDrive}
                                            format={(v) => `×${v.toFixed(2)}`}
                                            info={INFO.fogDrive}
                                        />
                                        <Slider
                                            label="Spin"
                                            value={controls.spinDrive}
                                            min={0}
                                            max={controls.speedDriveMax}
                                            step={0.1}
                                            onChange={controls.setSpinDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.spinDrive}
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

export default HexagonsPlace;
