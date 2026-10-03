"use client";

import { ScreensOverlay } from "@/components/ScreensOverlay";
import { VisualizerSection } from "@/components/VisualizerSection";
import {
    ColorTable,
    ControlPanel,
    ControlSection,
    ControlSubSection,
    PanelButton,
    Select,
    Slider,
    Toggle,
} from "@/components/ControlPanel";
import BlackholeCanvas from "./Blackhole.Canvas";
import useBlackholeHook from "./Blackhole.hooks";
import {
    BLACKHOLE_RANGES,
    type BlackholeProps,
    type ReactiveChannel,
} from "./Blackhole.types";

const REACTIVE_CHANNEL_OPTIONS: { value: ReactiveChannel; label: string }[] = [
    { value: "off", label: "off" },
    { value: "bass", label: "bass (30–180 Hz)" },
    { value: "mid", label: "mid (200 Hz–2 kHz)" },
    { value: "high", label: "high (2–10 kHz)" },
    { value: "beat", label: "beat (peak punches)" },
];

const INFO = {
    look: "Tint, nebula, orbit, scale — and optional beat punch on the hole.",
    holeTwinkle: "Hue walks from idle. Peak column locked while on.",
    holePalette:
        "Idle = rest. Peak = hole-channel target (locked while twinkle is on or audio is off).",
    nebula: "Seamless background wash behind the disk.",
    nebulaEnabled: "Show the procedural nebula wash.",
    nebulaTwinkle: "Hue walks from nebula idle. Peak locked while on.",
    nebulaPalette:
        "Idle = rest. Peak = nebula-channel target (locked while twinkle is on or audio is off).",
    nebulaIntensity: "Base nebula strength. 1 ≈ subtle wash.",
    colorSpeed: "Hue walk rate while any twinkle is on.",
    yawSpeed: "Horizontal orbit rate (unitless, like disk spin).",
  pitch: "Camera tilt. 0°/180° blocked — edge-on view glitches the disk.",
  beltAngle: "Central belt angle — rolls only the hole/disk; stars stay put. 0° = horizontal.",
  scale: "Black hole / disk radius (_Size).",
    scalePunch: "Pulse + shake hole scale from the hole channel.",
    scaleDrive: "How hard scale punches when Scale punch is on.",
    diskSpin: "Accretion disk / horizon swirl speed.",
    holeChannel: "Band that punches hole / disk color, glow, and scale punch.",
    yawChannel: "Band that punches yaw orbit speed.",
    nebulaChannel: "Band that punches nebula brightness / peak tint.",
    holeDrive: "Hole punch strength.",
    yawDrive: "Yaw orbit punch strength.",
    nebulaDrive: "Nebula punch strength.",
    visualizer: {
        section: "Audio in → bus meters → peak gain for reactive screens.",
        source:
            "off disables audio. mic needs a gesture. plugin needs the Monitron extension online.",
        noiseGate: "Ignore mic levels below this floor (room hiss).",
        peakGain:
            "Multiplies bus peak (and the peak meter). Soft-clipped so ×3 still moves.",
    },
} as const;

const Blackhole = ({ showOverlay = true }: BlackholeProps) => {
    const { liveRef, vizRef, visualizer, controls } = useBlackholeHook();
    const audioLocked = !visualizer.reactive;
    const audioStamp = audioLocked ? ({ peak: "audio" } as const) : undefined;
    const anyTwinkle = controls.holeTwinkle || controls.nebulaTwinkle;

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
            <BlackholeCanvas liveRef={liveRef} vizRef={vizRef} />

            {showOverlay ? (
                <ScreensOverlay screenId="blackhole">
                    <ControlPanel
                        title="blackhole"
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
                            <Toggle
                                label="Hole twinkle"
                                checked={controls.holeTwinkle}
                                onChange={controls.setHoleTwinkle}
                                info={INFO.holeTwinkle}
                            />
                            <ColorTable
                                label="hole palette"
                                info={INFO.holePalette}
                                columns={["idle", "peak"]}
                                lockedColumns={
                                    audioLocked || controls.holeTwinkle ? ["peak"] : []
                                }
                                columnStamps={
                                    controls.holeTwinkle ? { peak: "twinkle" } : audioStamp
                                }
                                rows={[
                                    {
                                        label: "hole",
                                        cells: [
                                            {
                                                value: controls.holeColor,
                                                onChange: controls.setHoleColor,
                                            },
                                            {
                                                value: controls.holeColorPeak,
                                                onChange: controls.setHoleColorPeak,
                                            },
                                        ],
                                    },
                                ]}
                            />

                            <ControlSubSection label="nebula" info={INFO.nebula}>
                                <Toggle
                                    label="Nebula"
                                    checked={controls.nebulaEnabled}
                                    onChange={controls.setNebulaEnabled}
                                    info={INFO.nebulaEnabled}
                                />
                                {controls.nebulaEnabled ? (
                                    <>
                                        <Toggle
                                            label="Nebula twinkle"
                                            checked={controls.nebulaTwinkle}
                                            onChange={controls.setNebulaTwinkle}
                                            info={INFO.nebulaTwinkle}
                                        />
                                        <ColorTable
                                            label="nebula palette"
                                            info={INFO.nebulaPalette}
                                            columns={["idle", "peak"]}
                                            lockedColumns={
                                                audioLocked || controls.nebulaTwinkle
                                                    ? ["peak"]
                                                    : []
                                            }
                                            columnStamps={
                                                controls.nebulaTwinkle
                                                    ? { peak: "twinkle" }
                                                    : audioStamp
                                            }
                                            rows={[
                                                {
                                                    label: "nebula",
                                                    cells: [
                                                        {
                                                            value: controls.nebulaColor,
                                                            onChange: controls.setNebulaColor,
                                                        },
                                                        {
                                                            value: controls.nebulaColorPeak,
                                                            onChange: controls.setNebulaColorPeak,
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                        <Slider
                                            label="Intensity"
                                            value={controls.nebulaIntensity}
                                            min={BLACKHOLE_RANGES.nebulaIntensity.min}
                                            max={BLACKHOLE_RANGES.nebulaIntensity.max}
                                            step={BLACKHOLE_RANGES.nebulaIntensity.step}
                                            onChange={controls.setNebulaIntensity}
                                            format={(v) => v.toFixed(2)}
                                            info={INFO.nebulaIntensity}
                                        />
                                    </>
                                ) : null}
                            </ControlSubSection>

                            {anyTwinkle ? (
                                <Slider
                                    label="Color speed"
                                    value={controls.colorSpeed}
                                    min={BLACKHOLE_RANGES.colorSpeed.min}
                                    max={BLACKHOLE_RANGES.colorSpeed.max}
                                    step={BLACKHOLE_RANGES.colorSpeed.step}
                                    onChange={controls.setColorSpeed}
                                    info={INFO.colorSpeed}
                                />
                            ) : null}

                            <Slider
                                label="Yaw speed"
                                value={controls.yawSpeed}
                                min={BLACKHOLE_RANGES.yawSpeed.min}
                                max={BLACKHOLE_RANGES.yawSpeed.max}
                                step={BLACKHOLE_RANGES.yawSpeed.step}
                                onChange={controls.setYawSpeed}
                                format={(v) => v.toFixed(2)}
                                info={INFO.yawSpeed}
                            />
                            <Slider
                                label="Pitch"
                                value={controls.pitch}
                                min={BLACKHOLE_RANGES.pitch.min}
                                max={BLACKHOLE_RANGES.pitch.max}
                                step={BLACKHOLE_RANGES.pitch.step}
                                onChange={controls.setPitch}
                                format={(v) => `${v.toFixed(0)}°`}
                                info={INFO.pitch}
                            />
                            <Slider
                                label="Belt angle"
                                value={controls.beltAngle}
                                min={BLACKHOLE_RANGES.beltAngle.min}
                                max={BLACKHOLE_RANGES.beltAngle.max}
                                step={BLACKHOLE_RANGES.beltAngle.step}
                                onChange={controls.setBeltAngle}
                                format={(v) => `${v.toFixed(0)}°`}
                                info={INFO.beltAngle}
                            />
                            <Slider
                                label="Scale"
                                value={controls.blackHoleSize}
                                min={BLACKHOLE_RANGES.blackHoleSize.min}
                                max={BLACKHOLE_RANGES.blackHoleSize.max}
                                step={BLACKHOLE_RANGES.blackHoleSize.step}
                                onChange={controls.setBlackHoleSize}
                                format={(v) => v.toFixed(2)}
                                info={INFO.scale}
                            />
                            <Toggle
                                label="Scale punch"
                                checked={controls.scalePunch}
                                onChange={controls.setScalePunch}
                                info={INFO.scalePunch}

                            />
                            {controls.scalePunch ? (
                                <Slider
                                    label="Scale punch drive"
                                    value={controls.scaleDrive}
                                    min={BLACKHOLE_RANGES.scaleDrive.min}
                                    max={BLACKHOLE_RANGES.scaleDrive.max}
                                    step={BLACKHOLE_RANGES.scaleDrive.step}
                                    onChange={controls.setScaleDrive}
                                    format={(v) => `×${v.toFixed(2)}`}
                                    info={INFO.scaleDrive}
                                />
                            ) : null}
                            <Slider
                                label="Disk spin"
                                value={controls.diskRotationSpeed}
                                min={BLACKHOLE_RANGES.diskRotationSpeed.min}
                                max={BLACKHOLE_RANGES.diskRotationSpeed.max}
                                step={BLACKHOLE_RANGES.diskRotationSpeed.step}
                                onChange={controls.setDiskRotationSpeed}
                                format={(v) => v.toFixed(2)}
                                info={INFO.diskSpin}
                            />
                        </ControlSection>

                        <VisualizerSection
                            visualizer={visualizer}
                            info={INFO.visualizer}
                        >
                            {visualizer.reactive ? (
                                <>
                                    <ControlSubSection label="channels">
                                        <Select
                                            label="Hole"
                                            value={controls.holeChannel}
                                            options={REACTIVE_CHANNEL_OPTIONS}
                                            onChange={controls.setHoleChannel}
                                            info={INFO.holeChannel}
                                        />
                                        <Select
                                            label="Yaw"
                                            value={controls.yawChannel}
                                            options={REACTIVE_CHANNEL_OPTIONS}
                                            onChange={controls.setYawChannel}
                                            info={INFO.yawChannel}
                                        />
                                        <Select
                                            label="Nebula"
                                            value={controls.nebulaChannel}
                                            options={REACTIVE_CHANNEL_OPTIONS}
                                            onChange={controls.setNebulaChannel}
                                            info={INFO.nebulaChannel}
                                        />
                                    </ControlSubSection>
                                    <ControlSubSection label="drive">
                                        <Slider
                                            label="Hole"
                                            value={controls.holeDrive}
                                            min={BLACKHOLE_RANGES.drive.min}
                                            max={controls.driveMax}
                                            step={BLACKHOLE_RANGES.drive.step}
                                            onChange={controls.setHoleDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.holeDrive}
                                        />
                                        <Slider
                                            label="Yaw"
                                            value={controls.yawDrive}
                                            min={BLACKHOLE_RANGES.drive.min}
                                            max={controls.driveMax}
                                            step={BLACKHOLE_RANGES.drive.step}
                                            onChange={controls.setYawDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.yawDrive}
                                        />
                                        <Slider
                                            label="Nebula"
                                            value={controls.nebulaDrive}
                                            min={BLACKHOLE_RANGES.drive.min}
                                            max={controls.driveMax}
                                            step={BLACKHOLE_RANGES.drive.step}
                                            onChange={controls.setNebulaDrive}
                                            format={(v) => `×${v.toFixed(1)}`}
                                            info={INFO.nebulaDrive}
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

export default Blackhole;
