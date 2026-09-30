"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAudioReactive, migrateAudioSource, MIC_GATE_DEFAULT, normalizeMicGate } from "@/hooks/useAudioReactive";
import {
  bandAtColumn,
  risingEdge,
  sliceBands,
} from "@/lib/audioDerive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
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
/** Cap steps one column can take in a frame */
const COL_STEP_CAP = 12;
/** Reactive: spectrum energy boosts that column's fall rate */
const SPECTRUM_DRIVE = 1.55;
const DEFAULT_COLOR = "#36ff00";

/** Drive → fall punch strength (slider multiplies the dump) */
const DRIVE_DEFAULT = 2;
const DRIVE_MAX = 8;
/** Extra fall steps on low-slice rising edge */
const LOW_FALL_DUMP = 1.1;
const LOW_EDGE = 0.05;
const LOW_MIN = 0.06;
const LOW_IMPULSE_DECAY = 3;
/** Peak-hold for brightness / trail */
const PEAK_HOLD_DECAY = 3;
/** Low band used for kick-ish punches (Hz) */
const LOW_HZ = { lo: 30, hi: 180 } as const;

const HUE_HOP_BASE = 8;
const HUE_HOP_FROM_SPEED = 0.12;
const HUE_DRIVE_SPIN = 0.45;

const REACTIVE_BASE_L = 26;
const REACTIVE_TWINKLE_BASE_L = 30;
const REACTIVE_DRIVE_L = 48;
const REACTIVE_PEAK_L = 12;
const REACTIVE_IDLE_S = 55;

const DEFAULTS: MatrixControls = {
  twinkle: false,
  color: DEFAULT_COLOR,
  fallSpeed: 10,
  colorSpeed: 8,
  drive: DRIVE_DEFAULT,
  audioSource: "off",
  micGate: MIC_GATE_DEFAULT,
};

const SCREEN_ID = "matrix";

function hexToHsl(hex: string): HslColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 106, s: 100, l: 50 };

  const r = parseInt(result[1]!, 16) / 255;
  const g = parseInt(result[2]!, 16) / 255;
  const b = parseInt(result[3]!, 16) / 255;

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

function migratePrefs(
  saved: MatrixControls & {
    bassBoost?: number;
    reactive?: boolean;
    micGate?: number;
  },
): MatrixControls {
  const drive =
    typeof saved.drive === "number"
      ? saved.drive
      : typeof saved.bassBoost === "number"
        ? saved.bassBoost
        : DEFAULTS.drive;
  return {
    twinkle: saved.twinkle ?? DEFAULTS.twinkle,
    color: saved.color ?? DEFAULTS.color,
    fallSpeed: saved.fallSpeed ?? DEFAULTS.fallSpeed,
    colorSpeed: saved.colorSpeed ?? DEFAULTS.colorSpeed,
    drive,
    audioSource: migrateAudioSource(saved),
    micGate: normalizeMicGate(saved.micGate),
  };
}

const useMatrixHook = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<HslColor>(hexToHsl(DEFAULTS.color));
  const twinkleRef = useRef(DEFAULTS.twinkle);
  const fallSpeedRef = useRef(DEFAULTS.fallSpeed);
  const colorSpeedRef = useRef(DEFAULTS.colorSpeed);
  const driveRef = useRef(DEFAULTS.drive);
  const prefsRef = useRef<MatrixControls>({ ...DEFAULTS });

  const [twinkle, setTwinkleState] = useState(DEFAULTS.twinkle);
  const [color, setColorState] = useState(DEFAULTS.color);
  const [fallSpeed, setFallSpeedState] = useState(DEFAULTS.fallSpeed);
  const [colorSpeed, setColorSpeedState] = useState(DEFAULTS.colorSpeed);
  const [drive, setDriveState] = useState(DEFAULTS.drive);
  const [sourcePref, setSourcePref] = useState(DEFAULTS.audioSource);
  const [micGatePref, setMicGatePref] = useState(DEFAULTS.micGate);
  const persistSourceRef = useRef((audioSource: MatrixControls["audioSource"]) => {
    prefsRef.current = { ...prefsRef.current, audioSource };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setSourcePref(audioSource);
  });
  const persistMicGateRef = useRef((micGate: number) => {
    prefsRef.current = { ...prefsRef.current, micGate };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setMicGatePref(micGate);
  });

  // Spectrum rain: bands → columns, peak → glow, low-slice → fall punches
  const visualizer = useAudioReactive({
    preferredSource: sourcePref,
    onSourceChange: (source) => persistSourceRef.current(source),
    preferredMicGate: micGatePref,
    onMicGateChange: (gate) => persistMicGateRef.current(gate),
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
    if (patch.drive !== undefined) {
      driveRef.current = patch.drive;
      setDriveState(patch.drive);
    }
    if (patch.audioSource !== undefined) {
      setSourcePref(patch.audioSource);
    }
    if (patch.micGate !== undefined) {
      setMicGatePref(patch.micGate);
    }
  };

  useLayoutEffect(() => {
    const loaded = loadScreenPrefs<MatrixControls & { bassBoost?: number }>(
      SCREEN_ID,
      { ...DEFAULTS },
    );
    const saved = migratePrefs(loaded);
    prefsRef.current = saved;
    twinkleRef.current = saved.twinkle;
    colorRef.current = hexToHsl(saved.color);
    fallSpeedRef.current = saved.fallSpeed;
    colorSpeedRef.current = saved.colorSpeed;
    driveRef.current = saved.drive;
    setTwinkleState(saved.twinkle);
    setColorState(saved.color);
    setFallSpeedState(saved.fallSpeed);
    setColorSpeedState(saved.colorSpeed);
    setDriveState(saved.drive);
    setSourcePref(saved.audioSource);
    setMicGatePref(saved.micGate);
  }, []);

  const setTwinkle = (on: boolean) => {
    if (!on && twinkleRef.current) {
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
  const setDrive = (value: number) => commitPrefs({ drive: value });

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
    let lowImpulse = 0;
    let peakHold = 0;
    let prevLow = 0;
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
      const char = chars[Math.floor(Math.random() * chars.length)] ?? "0";
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
      const spectrum = reactiveOn ? viz.bands : null;
      const rms = reactiveOn ? Math.max(0, viz.rms) : 0;
      const peak = reactiveOn ? Math.max(0, viz.peak) : 0;
      const drive = driveRef.current;

      const low = spectrum
        ? sliceBands(spectrum, LOW_HZ.lo, LOW_HZ.hi)
        : 0;

      // peak → brightness (hold)
      peakHold = Math.max(peak, peakHold * Math.exp(-dt * PEAK_HOLD_DECAY));

      // low-slice rising edge → fall dump + hue hop
      if (risingEdge(low, prevLow, LOW_EDGE, LOW_MIN)) {
        lowImpulse = Math.max(
          lowImpulse,
          Math.min(1, 0.35 + low * 0.35),
        );
        const dump = (1 + drive) * LOW_FALL_DUMP * low;
        for (let i = 0; i < dropAcc.length; i++) {
          dropAcc[i]! += dump;
        }
        if (twinkleRef.current) {
          const hop =
            HUE_HOP_BASE + colorSpeedRef.current * HUE_HOP_FROM_SPEED;
          colorRef.current.h = (colorRef.current.h + hop * low) % 360;
        }
      }
      prevLow = low;
      lowImpulse = Math.max(
        lowImpulse * Math.exp(-dt * LOW_IMPULSE_DECAY),
        low * 0.35,
      );

      if (twinkleRef.current && lowImpulse > 0.02) {
        colorRef.current.h =
          (colorRef.current.h +
            dt * colorSpeedRef.current * lowImpulse * HUE_DRIVE_SPIN) %
          360;
      }

      // crest (peak above rms) adds a sharp brightness tick
      const crest = Math.max(0, peak - rms * 1.15);
      const punch = Math.min(1, Math.max(peakHold, crest * 1.4));
      const flash = Math.min(1, lowImpulse);
      const current = colorRef.current;
      const twinkleOn = twinkleRef.current;

      let s: number;
      let l: number;
      if (reactiveOn) {
        const fullS = twinkleOn ? 100 : Math.max(current.s, 75);
        const idleS = Math.min(fullS, REACTIVE_IDLE_S);
        s = idleS + (fullS - idleS) * flash;
        const baseL = twinkleOn
          ? REACTIVE_TWINKLE_BASE_L
          : Math.min(current.l * 0.55, REACTIVE_BASE_L);
        l = Math.min(
          88,
          baseL + flash * REACTIVE_DRIVE_L + punch * REACTIVE_PEAK_L,
        );
      } else {
        s = twinkleOn ? 100 : Math.max(current.s, 75);
        l = twinkleOn ? 42 : current.l;
      }
      const glyphColor = `hsl(${current.h}, ${s}%, ${l}%)`;

      const speedMul = 1 + flash * drive;
      const trailScale = 1 - (reactiveOn ? flash : punch) * 0.25;
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

      context.fillStyle = `rgba(0,0,0,${fade})`;
      context.fillRect(0, 0, width, height);
      context.fillStyle = glyphColor;
      context.font = `${FONT_SIZE}px system-ui`;

      const baseStep = dt * stepsPerSec;
      const bandCount = spectrum?.length ?? 0;
      for (let i = 0; i < drops.length; i++) {
        let colMul = speeds[i] ?? 1;
        if (spectrum && bandCount > 0) {
          const energy = bandAtColumn(spectrum, i, columns);
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
      drive,
      setDrive,
      driveMax: DRIVE_MAX,
      reset,
      fullscreen: () => void toggleFullscreen(),
    },
    visualizer,
  };
};

export default useMatrixHook;
