"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import {
    loadScreenPrefs,
    saveScreenPrefs,
} from "@/lib/screenPrefs";
import type { HslColor, MatrixControls } from "./Matrix.types";

const CHARSET =
    "A+B0C-D1E=F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2";
const FONT_SIZE = 11;
/** Glyphs until trail ≈ gone — keeps rain from flooding the screen */
const TRAIL_LEN = 50;
const TRAIL_FADE = 1 - Math.pow(0.05, 1 / TRAIL_LEN);
/** Per-column fall multipliers — breaks the “marching row” look */
const COL_SPEED_MIN = 0.4;
const COL_SPEED_MAX = 1.65;
/** Cap steps one column can take in a frame (bass dump / huge fallSpeed) */
const COL_STEP_CAP = 12;
/** Reactive: spectrum energy boosts that column's fall rate */
const SPECTRUM_DRIVE = 1.35;
const DEFAULT_COLOR = "#36ff00";

/** Bass → fall speed (slider multiplies the punch) */
const BASS_BOOST_DEFAULT = 2 as number;
const BASS_BOOST_MAX = 8;
/** Extra fall steps on bass rising edge: `(1 + boost) * dump * bass` */
const BASS_FALL_DUMP = 1.1;
/** Rising-edge delta on bass (0..1) */
const BASS_EDGE = 0.05;
/** Min bass level to count as a punch */
const BASS_MIN = 0.06;
/** How fast the speed punch fades (higher = shorter bump) */
const BASS_IMPULSE_DECAY = 3;
/** Beat peak-hold for brightness / trail */
const BEAT_HOLD_DECAY = 3;

/** Twinkle: градусов hue за один bass-hop */
const HUE_HOP_BASE = 8;
/** +hop от Color speed слайдера */
const HUE_HOP_FROM_SPEED = 0.12;
/** Доп. крутка hue, пока bass-impulse горячий */
const HUE_BASS_SPIN = 0.45;

/** Reactive idle lightness (тусклее дефолта) */
const REACTIVE_BASE_L = 26;
const REACTIVE_TWINKLE_BASE_L = 30;
/** +L от bass speed-punch (0→1) */
const REACTIVE_SPEED_L = 48;
/** +L от beat */
const REACTIVE_BEAT_L = 10;
/** Idle saturation cap; на панче S поднимается до полной */
const REACTIVE_IDLE_S = 55;

const DEFAULTS = {
    twinkle: false as boolean,
    color: DEFAULT_COLOR,
    fallSpeed: 10 as number,
    colorSpeed: 8 as number,
    bassBoost: BASS_BOOST_DEFAULT,
    reactive: false as boolean,
} as const;

/** Matches placeholders id / route `/s/matrix` → `monitron:matrix:controls` */
const SCREEN_ID = "matrix";

const MATRIX_VIZ_BANDS = { bass: true, beat: true } as const;

function hexToHsl(hex: string): HslColor {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 106, s: 100, l: 50 };

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            default:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function useWakeLock() {
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const request = async () => {
            try {
                if (!("wakeLock" in navigator)) return;
                wakeLock = await navigator.wakeLock.request("screen");
            } catch {
                // unsupported / denied — ignore
            }
        };

        void request();

        const onVisible = () => {
            if (document.visibilityState === "visible") void request();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            void wakeLock?.release();
        };
    }, []);
}

const useMatrixHook = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const colorRef = useRef<HslColor>(hexToHsl(DEFAULTS.color));
    const twinkleRef = useRef(DEFAULTS.twinkle);
    const fallSpeedRef = useRef(DEFAULTS.fallSpeed);
    const colorSpeedRef = useRef(DEFAULTS.colorSpeed);
    const bassBoostRef = useRef(DEFAULTS.bassBoost);
    const prefsRef = useRef<MatrixControls>({ ...DEFAULTS });

    const [twinkle, setTwinkleState] = useState(DEFAULTS.twinkle);
    const [color, setColorState] = useState<string>(DEFAULTS.color);
    const [fallSpeed, setFallSpeedState] = useState(DEFAULTS.fallSpeed);
    const [colorSpeed, setColorSpeedState] = useState(DEFAULTS.colorSpeed);
    const [bassBoost, setBassBoostState] = useState<number>(DEFAULTS.bassBoost);
    const [reactivePref, setReactivePref] = useState(DEFAULTS.reactive);
    const persistReactiveRef = useRef((enabled: boolean) => {
        prefsRef.current = { ...prefsRef.current, reactive: enabled };
        saveScreenPrefs(SCREEN_ID, prefsRef.current);
        setReactivePref(enabled);
    });

    // Matrix: beat → brightness/trail, bass → fall speed (+ Bass boost)
    const visualizer = useAudioReactive({
        bands: MATRIX_VIZ_BANDS,
        preferredReactive: reactivePref,
        onReactiveChange: (enabled) => persistReactiveRef.current(enabled),
    });

    useWakeLock();

    const commitPrefs = (patch: Partial<MatrixControls>) => {
        const next: MatrixControls = { ...prefsRef.current, ...patch };
        prefsRef.current = next;
        saveScreenPrefs(SCREEN_ID, next);

        if (patch.twinkle !== undefined) {
            twinkleRef.current = patch.twinkle;
            setTwinkleState(patch.twinkle);
        }
        if (patch.color !== undefined) {
            colorRef.current = hexToHsl(patch.color);
            setColorState(patch.color);
        }
        if (patch.fallSpeed !== undefined) {
            fallSpeedRef.current = patch.fallSpeed;
            setFallSpeedState(patch.fallSpeed);
        }
        if (patch.colorSpeed !== undefined) {
            colorSpeedRef.current = patch.colorSpeed;
            setColorSpeedState(patch.colorSpeed);
        }
        if (patch.bassBoost !== undefined) {
            bassBoostRef.current = patch.bassBoost;
            setBassBoostState(patch.bassBoost);
        }
        if (patch.reactive !== undefined) {
            setReactivePref(patch.reactive);
        }
    };

    // Load before paint — never overwrite LS with defaults via a persist effect
    useLayoutEffect(() => {
        const saved = loadScreenPrefs<MatrixControls>(SCREEN_ID, {
            ...DEFAULTS,
        });
        prefsRef.current = saved;
        twinkleRef.current = saved.twinkle;
        colorRef.current = hexToHsl(saved.color);
        fallSpeedRef.current = saved.fallSpeed;
        colorSpeedRef.current = saved.colorSpeed;
        bassBoostRef.current = saved.bassBoost;
        setTwinkleState(saved.twinkle);
        setColorState(saved.color);
        setFallSpeedState(saved.fallSpeed);
        setColorSpeedState(saved.colorSpeed);
        setBassBoostState(saved.bassBoost);
        setReactivePref(saved.reactive);
    }, []);

    const setTwinkle = (on: boolean) => {
        if (!on && twinkleRef.current) {
            // Restore the picker color — don't bake the live rainbow stop into prefs
            const restored = prefsRef.current.color;
            colorRef.current = hexToHsl(restored);
            setColorState(restored);
            commitPrefs({ twinkle: false });
            return;
        }
        commitPrefs({ twinkle: on });
    };

    const setColor = (value: string) => commitPrefs({ color: value });
    const setFallSpeed = (value: number) => commitPrefs({ fallSpeed: value });
    const setColorSpeed = (value: number) => commitPrefs({ colorSpeed: value });
    const setBassBoost = (value: number) => commitPrefs({ bassBoost: value });

    const reset = () => {
        commitPrefs({ ...DEFAULTS });
    };
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const chars = CHARSET.split("");
        let width = window.innerWidth;
        let height = window.innerHeight;
        let columns = Math.floor(width / FONT_SIZE);
        let drops: number[] = [];
        let speeds: number[] = [];
        let dropAcc: number[] = [];
        let raf = 0;
        let last = performance.now();
        let bassImpulse = 0;
        let beatHold = 0;
        let prevBassSample = 0;
        const vizRef = visualizer.vizRef;

        const randSpeed = () =>
            COL_SPEED_MIN + Math.random() * (COL_SPEED_MAX - COL_SPEED_MIN);

        const seedDrops = () => {
            const rows = Math.max(1, Math.ceil(height / FONT_SIZE));
            drops = Array.from(
                { length: columns },
                () =>
                    Math.floor(Math.random() * rows) -
                    Math.floor(Math.random() * rows * 0.4),
            );
            speeds = Array.from({ length: columns }, randSpeed);
            dropAcc = new Array(columns).fill(0);
        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            columns = Math.floor(width / FONT_SIZE);
            seedDrops();
            context.fillStyle = "#000";
            context.fillRect(0, 0, width, height);
        };

        const advanceColumn = (i: number) => {
            const char =
                chars[Math.floor(Math.random() * chars.length)] ?? "0";
            context.fillText(char, i * FONT_SIZE, drops[i]! * FONT_SIZE);

            if (drops[i]! * FONT_SIZE > height && Math.random() > 0.975) {
                drops[i] = 0;
                speeds[i] = randSpeed();
            }
            drops[i]!++;
        };

        const tick = (now: number) => {
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;

            if (twinkleRef.current) {
                const current = colorRef.current;
                current.h = (current.h + dt * colorSpeedRef.current) % 360;
            }

            const viz = vizRef.current;
            const reactiveOn = Boolean(viz.enabled);
            const bass = reactiveOn ? Math.max(0, viz.bass) : 0;
            const beat = reactiveOn ? Math.max(0, viz.beat) : 0;
            const spectrum = reactiveOn ? viz.bands : null;
            const boost = bassBoostRef.current;

            // beat → brightness (peak-hold)
            beatHold = Math.max(beat, beatHold * Math.exp(-dt * BEAT_HOLD_DECAY));

            // bass → fall speed punches
            const rising =
                bass > prevBassSample + BASS_EDGE && bass >= BASS_MIN;
            if (rising) {
                bassImpulse = Math.max(
                    bassImpulse,
                    Math.min(1, 0.35 + bass * 0.35),
                );
                const dump = (1 + boost) * BASS_FALL_DUMP * bass;
                for (let i = 0; i < dropAcc.length; i++) {
                    dropAcc[i]! += dump;
                }
                if (twinkleRef.current) {
                    const hop =
                        HUE_HOP_BASE +
                        colorSpeedRef.current * HUE_HOP_FROM_SPEED;
                    colorRef.current.h =
                        (colorRef.current.h + hop * bass) % 360;
                }
            }
            prevBassSample = bass;
            bassImpulse = Math.max(
                bassImpulse * Math.exp(-dt * BASS_IMPULSE_DECAY),
                bass * 0.35,
            );

            if (twinkleRef.current && bassImpulse > 0.02) {
                colorRef.current.h =
                    (colorRef.current.h +
                        dt *
                            colorSpeedRef.current *
                            bassImpulse *
                            HUE_BASS_SPIN) %
                    360;
            }

            const punch = Math.min(1, beatHold);
            const flash = Math.min(1, bassImpulse);
            const current = colorRef.current;
            const twinkleOn = twinkleRef.current;
            const reactive = reactiveOn;

            let s: number;
            let l: number;
            if (reactive) {
                // Idle = muted; speed punch restores default chroma + glow
                const fullS = twinkleOn ? 100 : Math.max(current.s, 75);
                const idleS = Math.min(fullS, REACTIVE_IDLE_S);
                s = idleS + (fullS - idleS) * flash;
                const baseL = twinkleOn
                    ? REACTIVE_TWINKLE_BASE_L
                    : Math.min(current.l * 0.55, REACTIVE_BASE_L);
                l = Math.min(
                    88,
                    baseL + flash * REACTIVE_SPEED_L + punch * REACTIVE_BEAT_L,
                );
            } else {
                s = twinkleOn ? 100 : Math.max(current.s, 75);
                const baseL = twinkleOn ? 42 : current.l;
                l = baseL;
            }
            const glyphColor = `hsl(${current.h}, ${s}%, ${l}%)`;

            // Bass punches multiply Fall speed
            const speedMul = 1 + flash * boost;
            // Trail length ≈ TRAIL_LEN steps at current Fall speed (frame-based fade)
            const trailScale = 1 - (reactive ? flash : punch) * 0.25;
            const stepsPerSec = fallSpeedRef.current * speedMul;
            const fade = Math.min(
                0.14,
                Math.max(
                    0.02,
                    1 -
                        Math.pow(
                            1 - TRAIL_FADE * trailScale,
                            Math.max(0.5, stepsPerSec) * dt,
                        ),
                ),
            );

            // One trail fade per frame — columns advance on their own clocks
            context.fillStyle = `rgba(0,0,0,${fade})`;
            context.fillRect(0, 0, width, height);
            context.fillStyle = glyphColor;
            context.font = `${FONT_SIZE}px system-ui`;

            const baseStep = dt * stepsPerSec;
            const bandCount = spectrum?.length ?? 0;
            for (let i = 0; i < drops.length; i++) {
                let colMul = speeds[i] ?? 1;
                if (spectrum && bandCount > 0 && columns > 0) {
                    // Left → lows, right → highs across the log spectrum
                    const bi = Math.min(
                        bandCount - 1,
                        Math.floor((i / columns) * bandCount),
                    );
                    const energy = Math.max(0, spectrum[bi] ?? 0);
                    colMul *= 1 + energy * SPECTRUM_DRIVE;
                }
                dropAcc[i]! += baseStep * colMul;
                if (dropAcc[i]! > COL_STEP_CAP) dropAcc[i] = COL_STEP_CAP;
                let steps = 0;
                while (dropAcc[i]! >= 1 && steps < COL_STEP_CAP) {
                    dropAcc[i]! -= 1;
                    steps += 1;
                    advanceColumn(i);
                }
            }

            raf = requestAnimationFrame(tick);
        };

        resize();
        raf = requestAnimationFrame(tick);
        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, [visualizer.vizRef]);

    return {
        canvasRef,
        controls: {
            twinkle,
            setTwinkle,
            color,
            setColor,
            fallSpeed,
            setFallSpeed,
            colorSpeed,
            setColorSpeed,
            bassBoost,
            setBassBoost,
            bassBoostMax: BASS_BOOST_MAX,
            reset,
            fullscreen: () => void toggleFullscreen(),
        },
        visualizer,
    };
};

export default useMatrixHook;
