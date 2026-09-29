"use client";

import dynamic from "next/dynamic";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import {
    ColorField,
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
                            <Toggle
                                label="Garland"
                                checked={controls.garland}
                                onChange={controls.setGarland}
                            />
                            <ColorField
                                label="Edge"
                                value={controls.edgeColor}
                                onChange={controls.setEdgeColor}
                                disabled={controls.garland}
                            />
                            <Slider
                                label="Color speed"
                                value={controls.colorSpeed}
                                min={0}
                                max={180}
                                step={1}
                                onChange={controls.setColorSpeed}
                                disabled={!controls.garland}
                            />
                            <Toggle
                                label="Colored fog"
                                checked={controls.coloredFog}
                                onChange={controls.setColoredFog}
                            />
                            <ColorField
                                label="Fog"
                                value={controls.fogColor}
                                onChange={controls.setFogColor}
                                disabled={!controls.coloredFog || controls.garland}
                            />
                            <Slider
                                label="Fog height"
                                value={controls.fogHeight}
                                min={0.15}
                                max={3}
                                step={0.05}
                                onChange={controls.setFogHeight}
                                format={(v) => v.toFixed(2)}
                            />
                            <Slider
                                label="Fog density"
                                value={controls.fogDensity}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={controls.setFogDensity}
                                format={(v) => v.toFixed(2)}
                            />
                        </ControlSection>

                        <ControlSection label="field">
                            <Slider
                                label="Count"
                                value={controls.hexGrid}
                                min={56}
                                max={128}
                                step={2}
                                onChange={controls.setHexGrid}
                            />
                            <Slider
                                label="Size"
                                value={controls.hexSize}
                                min={1}
                                max={2.5}
                                step={0.1}
                                onChange={controls.setHexSize}
                                format={(v) => v.toFixed(2)}
                            />
                            <Slider
                                label="Height spread"
                                value={controls.hexHeightSpread}
                                min={0.1}
                                max={2.5}
                                step={0.05}
                                onChange={controls.setHexHeightSpread}
                                format={(v) => v.toFixed(2)}
                            />
                        </ControlSection>

                        <ControlSection label="camera">
                            <Slider
                                label="Angle"
                                value={controls.cameraAngle}
                                min={10}
                                max={60}
                                step={1}
                                onChange={controls.setCameraAngle}
                            />
                            <Slider
                                label="Height"
                                value={controls.cameraHeight}
                                min={1}
                                max={8}
                                step={0.1}
                                onChange={controls.setCameraHeight}
                                format={(v) => v.toFixed(1)}
                            />
                            <Slider
                                label="Zoom"
                                value={controls.cameraZoom}
                                min={0.5}
                                max={2.5}
                                step={0.05}
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
                            <Slider
                                label="Bass boost"
                                value={controls.bassBoost}
                                min={0}
                                max={controls.bassBoostMax}
                                step={0.5}
                                onChange={controls.setBassBoost}
                                disabled={!visualizer.reactive}
                                format={(v) => v.toFixed(1)}
                            />
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
