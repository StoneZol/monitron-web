"use client";

import dynamic from "next/dynamic";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import {
    ColorField,
    ColorTable,
    ControlPanel,
    ControlSection,
    Meter,
    PanelButton,
    Slider,
    Toggle,
} from "@/components/ControlPanel";
import useHexagonsPlaceHook from "./HexagonsPlace.hooks";
import type { HexagonsPlaceProps } from "./HexagonsPlace.types";

const HexagonsCanvas = dynamic(() => import("./HexagonsPlace.Canvas"), {
    ssr: false,
});

const HexagonsPlace = ({ showOverlay = true }: HexagonsPlaceProps) => {
    const { live, controls, visualizer } = useHexagonsPlaceHook();

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
            <HexagonsCanvas live={live} vizRef={visualizer.vizRef} />

            {showOverlay && (
                <ScreensOverlay>
                    <ControlPanel title="hexagons">
                        <ControlSection label="look">
                            <div className="flex gap-2 py-2">
                                <Toggle
                                    label="Garland"
                                    checked={controls.garland}
                                    onChange={controls.setGarland}
                                />
                                <Toggle
                                    label="Caps"
                                    checked={controls.caps}
                                    onChange={controls.setCaps}
                                />
                            </div>
                            {!controls.caps && (
                                <ColorField
                                    label="Edge"
                                    value={controls.edgeColor}
                                    onChange={controls.setEdgeColor}
                                />
                            )}

                            {controls.garland && (
                                <Slider
                                    label="Color speed"
                                    value={controls.colorSpeed}
                                    min={0}
                                    max={180}
                                    step={1}
                                    onChange={controls.setColorSpeed}
                                />
                            )}
                            {controls.caps && (
                                <ColorTable
                                    label="caps palette"
                                    columns={["idle", "peak"]}
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
                                            label: "beat",
                                            cells: [
                                                {
                                                    value: controls.capBeatFogIdle,
                                                    onChange:
                                                        controls.setCapBeatFogIdle,
                                                },
                                                {
                                                    value: controls.capBeatFogPeak,
                                                    onChange:
                                                        controls.setCapBeatFogPeak,
                                                },
                                            ],
                                        },
                                    ]}
                                />
                            )}
                            <Slider
                                label="Hex grid"
                                value={controls.hexGrid}
                                min={57}
                                max={107}
                                step={1}
                                onChange={controls.setHexGrid}
                                format={(v) => v.toFixed(0)}
                            />
                        </ControlSection>

                        <ControlSection label="fog">
                            {controls.garland && !controls.caps && (
                                <>
                                    <div className="flex gap-2 py-1">
                                        <Toggle
                                            label="Fixed"
                                            checked={controls.fogFixed}
                                            onChange={controls.setFogFixed}
                                        />
                                        <Toggle
                                            label="Parallel"
                                            checked={controls.fogParallel}
                                            onChange={controls.setFogParallel}
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
                                        />
                                    )}
                                </>
                            )}
                            {!controls.caps &&
                                (!controls.garland ||
                                    controls.fogFixed ||
                                    controls.fogParallel) && (
                                <ColorTable
                                    columns={["idle", "peak"]}
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
                            <Slider
                                label="Height"
                                value={controls.fogHeight}
                                min={0.15}
                                max={3}
                                step={0.05}
                                onChange={controls.setFogHeight}
                                format={(v) => v.toFixed(2)}
                            />
                            <Slider
                                label="Density"
                                value={controls.fogDensity}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={controls.setFogDensity}
                                format={(v) => v.toFixed(2)}
                            />
                        </ControlSection>

                        <ControlSection label="camera">
                            <Slider
                                label="Angle"
                                value={controls.cameraAngle}
                                min={20}
                                max={70}
                                step={1}
                                onChange={controls.setCameraAngle}
                            />
                            <Slider
                                label="Height"
                                value={controls.cameraHeight}
                                min={4}
                                max={20}
                                step={0.1}
                                onChange={controls.setCameraHeight}
                                format={(v) => v.toFixed(1)}
                            />
                            <Slider
                                label="Offset"
                                value={controls.cameraOffset}
                                min={0}
                                max={30}
                                step={1}
                                onChange={controls.setCameraOffset}
                                format={(v) => v.toFixed(1)}
                            />
                            <Slider
                                label="Rotate"
                                value={controls.cameraRotate}
                                min={-45}
                                max={45}
                                step={1}
                                onChange={controls.setCameraRotate}
                            />
                            <Slider
                                label="Zoom"
                                value={controls.cameraZoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={controls.setCameraZoom}
                                format={(v) => v.toFixed(2)}
                            />
                            <div className="flex gap-2 py-2">
                                <Toggle
                                    label="Spin"
                                    checked={controls.spin}
                                    onChange={controls.setSpin}
                                />
                                <Toggle
                                    label={controls.spinLeft ? "Left" : "Right"}
                                    checked={controls.spinLeft}
                                    onChange={controls.setSpinLeft}
                                    disabled={!controls.spin}
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
                                />
                            )}
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
                                        visualizer.pluginPresent
                                            ? "text-signal"
                                            : "text-warn"
                                    }
                                >
                                    {visualizer.pluginPresent ? "online" : "offline"}
                                </span>
                            </div>
                            <div className="flex gap-2 py-2">
                                <Toggle
                                    label="reactive"
                                    checked={visualizer.reactive}
                                    onChange={visualizer.setReactive}
                                    disabled={!visualizer.pluginPresent}
                                />
                                <Toggle
                                    label="Band bounce"
                                    checked={controls.bandBounce}
                                    onChange={controls.setBandBounce}
                                    disabled={!visualizer.reactive}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em]">
                                <span className="text-muted">bpm</span>
                                <span
                                    className={
                                        visualizer.reactive && visualizer.bpm > 0
                                            ? "text-signal"
                                            : "text-muted"
                                    }
                                >
                                    {visualizer.reactive && visualizer.bpm > 0
                                        ? Math.round(visualizer.bpm)
                                        : "—"}
                                </span>
                            </div>
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

export default HexagonsPlace;
