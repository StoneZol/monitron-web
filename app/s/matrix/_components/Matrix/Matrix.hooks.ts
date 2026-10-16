"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  useAudioReactive,
  migrateAudioSource,
  MIC_GAIN_DEFAULT,
  MIC_GATE_DEFAULT,
  normalizeMicGain,
  normalizeMicGate,
  PEAK_GAIN_DEFAULT,
  normalizePeakGain,
} from "@/hooks/useAudioReactive";
import {
  bandAtColumn,
  risingEdge,
  sliceBands,
} from "@/lib/audioDerive";
import { resetFxOverlay } from "@/components/FxOverlay";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import { scaledPixelRatio } from "@/lib/renderScale";
import { registerRuntimeReset } from "@/lib/runtimeReset";
import { onTabSyncApply } from "@/lib/tabSyncHotApply";
import { VISUAL_PIP_CHANGE } from "@/lib/visualPip";
import {
  channelLevel,
  createMotionKickState,
  motionSpeedMul,
  type ReactiveChannel,
} from "@/lib/visualAudio";
import {
  advanceTwinkleHue,
  createTwinklePulseEnv,
  hueDegFromHex,
  pulseTwinkleLight,
  resolveTwinkleColor,
  TWINKLE_DEFAULT_L,
  TWINKLE_DEFAULT_S,
  TWINKLE_DEFAULT_SPEED,
  updateTwinklePulseEnv,
} from "@/lib/twinkleHsl";
import {
  MATRIX_COLOR_DRIVE_MAX,
  MATRIX_DRIVE_MAX,
  type MatrixControls,
} from "./Matrix.types";

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
/** Extra fall steps on accel rising edge */
const LOW_FALL_DUMP = 1.1;
const LOW_EDGE = 0.05;
const CHANNELS = new Set<ReactiveChannel>([
  "off",
  "bass",
  "mid",
  "high",
  "beat",
]);

function channel(v: unknown, fallback: ReactiveChannel): ReactiveChannel {
  return typeof v === "string" && CHANNELS.has(v as ReactiveChannel)
    ? (v as ReactiveChannel)
    : fallback;
}
const LOW_MIN = 0.06;
const LOW_IMPULSE_DECAY = 3;
/** Peak-hold for brightness / trail (non-twinkle path) */
const PEAK_HOLD_DECAY = 3;
/** Low band used for kick-ish punches (Hz) */
const LOW_HZ = { lo: 30, hi: 180 } as const;

const REACTIVE_BASE_L = 26;
const REACTIVE_DRIVE_L = 48;
const REACTIVE_PEAK_L = 12;
const REACTIVE_IDLE_S = 55;

const DEFAULTS: MatrixControls = {
  twinkle: false,
  twinkleSpeed: TWINKLE_DEFAULT_SPEED,
  twinkleS: TWINKLE_DEFAULT_S,
  twinkleL: TWINKLE_DEFAULT_L,
  color: DEFAULT_COLOR,
  fallSpeed: 10,
  speedChannel: "mid",
  speedDrive: 1.2,
  accelChannel: "bass",
  drive: DRIVE_DEFAULT,
  colorDrive: 1,
  peakGain: PEAK_GAIN_DEFAULT,
  audioSource: "off",
  micGate: MIC_GATE_DEFAULT,
  micGain: MIC_GAIN_DEFAULT,
};

const SCREEN_ID = "matrix";

const _tint = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Legacy colorSpeed was deg/sec; twinkleSpeed is × (1 ≈ 60°/s). */
function migrateTwinkleSpeed(raw: unknown, legacyColorSpeed: unknown): number {
  if (raw !== undefined && Number.isFinite(Number(raw))) {
    return clamp(Number(raw), 0, 4, TWINKLE_DEFAULT_SPEED);
  }
  const deg = Number(legacyColorSpeed);
  if (Number.isFinite(deg) && deg > 0) {
    return clamp(deg / 60, 0, 4, TWINKLE_DEFAULT_SPEED);
  }
  return TWINKLE_DEFAULT_SPEED;
}

function hexToHslCss(hex: string): { h: number; s: number; l: number } {
  _tint.set(hex);
  _tint.getHSL(_hsl);
  return {
    h: Math.round(_hsl.h * 360),
    s: Math.round(_hsl.s * 100),
    l: Math.round(_hsl.l * 100),
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
    colorSpeed?: number;
    micGate?: number;
    micGain?: number;
  },
): MatrixControls {
  const drive = clamp(
    typeof saved.drive === "number"
      ? saved.drive
      : typeof saved.bassBoost === "number"
        ? saved.bassBoost
        : DEFAULTS.drive,
    0,
    MATRIX_DRIVE_MAX,
    DEFAULTS.drive,
  );
  return {
    twinkle: saved.twinkle ?? DEFAULTS.twinkle,
    twinkleSpeed: migrateTwinkleSpeed(
      saved.twinkleSpeed,
      saved.colorSpeed,
    ),
    twinkleS: clamp(
      Number(saved.twinkleS),
      0,
      100,
      DEFAULTS.twinkleS,
    ),
    twinkleL: clamp(
      Number(saved.twinkleL),
      0,
      100,
      DEFAULTS.twinkleL,
    ),
    color: saved.color ?? DEFAULTS.color,
    fallSpeed: saved.fallSpeed ?? DEFAULTS.fallSpeed,
    speedChannel: channel(saved.speedChannel, DEFAULTS.speedChannel),
    speedDrive: clamp(
      Number(saved.speedDrive),
      0,
      MATRIX_DRIVE_MAX,
      DEFAULTS.speedDrive,
    ),
    accelChannel: channel(saved.accelChannel, DEFAULTS.accelChannel),
    drive,
    colorDrive: clamp(
      Number(saved.colorDrive),
      0,
      MATRIX_COLOR_DRIVE_MAX,
      DEFAULTS.colorDrive,
    ),
    peakGain: normalizePeakGain(saved.peakGain),
    audioSource: migrateAudioSource(saved),
    micGate: normalizeMicGate(saved.micGate),
    micGain: normalizeMicGain(saved.micGain),
  };
}

const useMatrixHook = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fixedHslRef = useRef(hexToHslCss(DEFAULTS.color));
  const twinkleHueRef = useRef(hueDegFromHex(DEFAULTS.color));
  const twinklePulseRef = useRef(createTwinklePulseEnv());
  const twinkleRef = useRef(DEFAULTS.twinkle);
  const twinkleSpeedRef = useRef(DEFAULTS.twinkleSpeed);
  const twinkleSRef = useRef(DEFAULTS.twinkleS);
  const twinkleLRef = useRef(DEFAULTS.twinkleL);
  const fallSpeedRef = useRef(DEFAULTS.fallSpeed);
  const speedChannelRef = useRef(DEFAULTS.speedChannel);
  const speedDriveRef = useRef(DEFAULTS.speedDrive);
  const accelChannelRef = useRef(DEFAULTS.accelChannel);
  const driveRef = useRef(DEFAULTS.drive);
  const colorDriveRef = useRef(DEFAULTS.colorDrive);
  const motionKickRef = useRef(createMotionKickState());
  const prefsRef = useRef<MatrixControls>({ ...DEFAULTS });

  const [twinkle, setTwinkleState] = useState(DEFAULTS.twinkle);
  const [twinkleSpeed, setTwinkleSpeedState] = useState(DEFAULTS.twinkleSpeed);
  const [twinkleS, setTwinkleSState] = useState(DEFAULTS.twinkleS);
  const [twinkleL, setTwinkleLState] = useState(DEFAULTS.twinkleL);
  const [color, setColorState] = useState(DEFAULTS.color);
  const [fallSpeed, setFallSpeedState] = useState(DEFAULTS.fallSpeed);
  const [speedChannel, setSpeedChannelState] = useState(DEFAULTS.speedChannel);
  const [speedDrive, setSpeedDriveState] = useState(DEFAULTS.speedDrive);
  const [accelChannel, setAccelChannelState] = useState(DEFAULTS.accelChannel);
  const [drive, setDriveState] = useState(DEFAULTS.drive);
  const [colorDrive, setColorDriveState] = useState(DEFAULTS.colorDrive);
  const [sourcePref, setSourcePref] = useState(DEFAULTS.audioSource);
  const [micGatePref, setMicGatePref] = useState(DEFAULTS.micGate);
  const [micGainPref, setMicGainPref] = useState(DEFAULTS.micGain);
  const [peakGainPref, setPeakGainPref] = useState(DEFAULTS.peakGain);
  const persistSourceRef = useRef(
    (audioSource: MatrixControls["audioSource"]) => {
      prefsRef.current = { ...prefsRef.current, audioSource };
      saveScreenPrefs(SCREEN_ID, prefsRef.current);
      setSourcePref(audioSource);
    },
  );
  const persistMicGateRef = useRef((micGate: number) => {
    prefsRef.current = { ...prefsRef.current, micGate };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setMicGatePref(micGate);
  });
  const persistMicGainRef = useRef((micGain: number) => {
    prefsRef.current = { ...prefsRef.current, micGain };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setMicGainPref(micGain);
  });
  const persistPeakGainRef = useRef((peakGain: number) => {
    prefsRef.current = { ...prefsRef.current, peakGain };
    saveScreenPrefs(SCREEN_ID, prefsRef.current);
    setPeakGainPref(peakGain);
  });

  // Spectrum rain: bands → columns, peak → glow, low-slice → fall punches
  const visualizer = useAudioReactive({
    preferredSource: sourcePref,
    onSourceChange: (source) => persistSourceRef.current(source),
    preferredMicGate: micGatePref,
    onMicGateChange: (gate) => persistMicGateRef.current(gate),
    preferredMicGain: micGainPref,
    onMicGainChange: (gain) => persistMicGainRef.current(gain),
    preferredPeakGain: peakGainPref,
    onPeakGainChange: (gain) => persistPeakGainRef.current(gain),
  });

  useWakeLock();

  const commitPrefs = (patch: Partial<MatrixControls>) => {
    const next: MatrixControls = { ...prefsRef.current, ...patch };
    // Never persist legacy colorSpeed
    delete (next as { colorSpeed?: number }).colorSpeed;
    prefsRef.current = next;
    saveScreenPrefs(SCREEN_ID, next);

    if (patch.twinkle !== undefined) {
      twinkleRef.current = patch.twinkle;
      setTwinkleState(patch.twinkle);
    }
    if (patch.twinkleSpeed !== undefined) {
      twinkleSpeedRef.current = patch.twinkleSpeed;
      setTwinkleSpeedState(patch.twinkleSpeed);
    }
    if (patch.twinkleS !== undefined) {
      twinkleSRef.current = patch.twinkleS;
      setTwinkleSState(patch.twinkleS);
    }
    if (patch.twinkleL !== undefined) {
      twinkleLRef.current = patch.twinkleL;
      setTwinkleLState(patch.twinkleL);
    }
    if (patch.color !== undefined) {
      fixedHslRef.current = hexToHslCss(patch.color);
      twinkleHueRef.current = hueDegFromHex(patch.color);
      setColorState(patch.color);
    }
    if (patch.fallSpeed !== undefined) {
      fallSpeedRef.current = patch.fallSpeed;
      setFallSpeedState(patch.fallSpeed);
    }
    if (patch.speedChannel !== undefined) {
      speedChannelRef.current = patch.speedChannel;
      setSpeedChannelState(patch.speedChannel);
    }
    if (patch.speedDrive !== undefined) {
      speedDriveRef.current = patch.speedDrive;
      setSpeedDriveState(patch.speedDrive);
    }
    if (patch.accelChannel !== undefined) {
      accelChannelRef.current = patch.accelChannel;
      setAccelChannelState(patch.accelChannel);
    }
    if (patch.drive !== undefined) {
      driveRef.current = patch.drive;
      setDriveState(patch.drive);
    }
    if (patch.colorDrive !== undefined) {
      colorDriveRef.current = patch.colorDrive;
      setColorDriveState(patch.colorDrive);
    }
    if (patch.audioSource !== undefined) {
      setSourcePref(patch.audioSource);
    }
    if (patch.micGate !== undefined) {
      setMicGatePref(patch.micGate);
    }
    if (patch.micGain !== undefined) {
      setMicGainPref(patch.micGain);
    }
    if (patch.peakGain !== undefined) {
      setPeakGainPref(patch.peakGain);
    }
  };

  const applySaved = (saved: MatrixControls) => {
    prefsRef.current = saved;
    twinkleRef.current = saved.twinkle;
    twinkleSpeedRef.current = saved.twinkleSpeed;
    twinkleSRef.current = saved.twinkleS;
    twinkleLRef.current = saved.twinkleL;
    fixedHslRef.current = hexToHslCss(saved.color);
    twinkleHueRef.current = hueDegFromHex(saved.color);
    fallSpeedRef.current = saved.fallSpeed;
    speedChannelRef.current = saved.speedChannel;
    speedDriveRef.current = saved.speedDrive;
    accelChannelRef.current = saved.accelChannel;
    driveRef.current = saved.drive;
    colorDriveRef.current = saved.colorDrive;
    setTwinkleState(saved.twinkle);
    setTwinkleSpeedState(saved.twinkleSpeed);
    setTwinkleSState(saved.twinkleS);
    setTwinkleLState(saved.twinkleL);
    setColorState(saved.color);
    setFallSpeedState(saved.fallSpeed);
    setSpeedChannelState(saved.speedChannel);
    setSpeedDriveState(saved.speedDrive);
    setAccelChannelState(saved.accelChannel);
    setDriveState(saved.drive);
    setColorDriveState(saved.colorDrive);
    setSourcePref(saved.audioSource);
    setMicGatePref(saved.micGate);
    setMicGainPref(saved.micGain);
    setPeakGainPref(saved.peakGain);
  };

  const rehydrateFromStorage = () => {
    const loaded = loadScreenPrefs<
      MatrixControls & { bassBoost?: number; colorSpeed?: number }
    >(SCREEN_ID, { ...DEFAULTS });
    applySaved(migratePrefs(loaded));
  };

  useLayoutEffect(() => {
    rehydrateFromStorage();
  }, []);

  useEffect(() => onTabSyncApply(SCREEN_ID, rehydrateFromStorage), []);

  const setTwinkle = (on: boolean) => {
    if (!on && twinkleRef.current) {
      fixedHslRef.current = hexToHslCss(prefsRef.current.color);
      commitPrefs({ twinkle: false });
      return;
    }
    if (on) {
      twinkleHueRef.current = hueDegFromHex(prefsRef.current.color);
    }
    commitPrefs({ twinkle: on });
  };

  const setTwinkleSpeed = (value: number) =>
    commitPrefs({ twinkleSpeed: value });
  const setTwinkleS = (value: number) => commitPrefs({ twinkleS: value });
  const setTwinkleL = (value: number) => commitPrefs({ twinkleL: value });
  const setColor = (value: string) => commitPrefs({ color: value });
  const setFallSpeed = (value: number) => commitPrefs({ fallSpeed: value });
  const setSpeedChannel = (value: ReactiveChannel) =>
    commitPrefs({ speedChannel: value });
  const setSpeedDrive = (value: number) =>
    commitPrefs({
      speedDrive: clamp(value, 0, MATRIX_DRIVE_MAX, DEFAULTS.speedDrive),
    });
  const setAccelChannel = (value: ReactiveChannel) =>
    commitPrefs({ accelChannel: value });
  const setDrive = (value: number) =>
    commitPrefs({ drive: clamp(value, 0, MATRIX_DRIVE_MAX, DEFAULTS.drive) });
  const setColorDrive = (value: number) =>
    commitPrefs({
      colorDrive: clamp(
        value,
        0,
        MATRIX_COLOR_DRIVE_MAX,
        DEFAULTS.colorDrive,
      ),
    });

  const reset = () => {
    commitPrefs({ ...DEFAULTS });
    resetFxOverlay(SCREEN_ID);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const chars = CHARSET.split("");
    let width = 1;
    let height = 1;
    let columns = 1;
    let drops: number[] = [];
    let speeds: number[] = [];
    let dropAcc: number[] = [];
    let raf = 0;
    let rafView: Window = window;
    let last = performance.now();
    let lowImpulse = 0;
    let peakHold = 0;
    let prevLow = 0;
    const vizRef = visualizer.vizRef;

    const viewOf = () => canvas.ownerDocument.defaultView ?? window;

    const cancelRaf = () => {
      rafView.cancelAnimationFrame(raf);
      if (rafView !== window) window.cancelAnimationFrame(raf);
      raf = 0;
    };

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

    const measureHost = () => {
      const shell = canvas.parentElement?.parentElement ?? canvas.parentElement;
      const parent = shell?.parentElement;
      const view = viewOf();
      const w =
        shell?.clientWidth ||
        parent?.clientWidth ||
        view.innerWidth ||
        window.innerWidth;
      const h =
        shell?.clientHeight ||
        parent?.clientHeight ||
        view.innerHeight ||
        window.innerHeight;
      return { width: Math.max(1, w), height: Math.max(1, h) };
    };

    const resize = () => {
      const next = measureHost();
      const dpr = scaledPixelRatio(2, "matrix");
      const nextW = Math.floor(next.width * dpr);
      const nextH = Math.floor(next.height * dpr);
      if (
        next.width === width &&
        next.height === height &&
        canvas.width === nextW &&
        canvas.height === nextH
      ) {
        return;
      }
      width = next.width;
      height = next.height;
      canvas.width = nextW;
      canvas.height = nextH;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.max(1, Math.floor(width / FONT_SIZE));
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
      resize();

      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const viz = vizRef.current;
      const reactiveOn = Boolean(viz.enabled);
      const spectrum = reactiveOn ? viz.bands : null;
      const rms = reactiveOn ? Math.max(0, viz.rms) : 0;
      const peak = reactiveOn ? Math.max(0, viz.peak) : 0;
      const drive = driveRef.current;
      const colorDrive = colorDriveRef.current;

      const low = spectrum
        ? sliceBands(spectrum, LOW_HZ.lo, LOW_HZ.hi)
        : 0;
      const speedRaw = reactiveOn
        ? channelLevel(viz, speedChannelRef.current)
        : 0;
      const accelRaw = reactiveOn
        ? channelLevel(viz, accelChannelRef.current)
        : 0;

      // peak → brightness (hold) for non-twinkle trail
      peakHold = Math.max(peak, peakHold * Math.exp(-dt * PEAK_HOLD_DECAY));

      // accel rising edge → column fall dump
      if (risingEdge(accelRaw, prevLow, LOW_EDGE, LOW_MIN)) {
        lowImpulse = Math.max(
          lowImpulse,
          Math.min(1, 0.35 + accelRaw * 0.35),
        );
        const dump = (1 + drive) * LOW_FALL_DUMP * accelRaw;
        for (let i = 0; i < dropAcc.length; i++) {
          dropAcc[i]! += dump;
        }
      }
      prevLow = accelRaw;
      lowImpulse = Math.max(
        lowImpulse * Math.exp(-dt * LOW_IMPULSE_DECAY),
        accelRaw * 0.35,
      );

      const { speedMul, kickEnv } = motionSpeedMul({
        cruiseRaw: speedRaw,
        cruiseDrive: speedDriveRef.current,
        cruiseArmed: reactiveOn && speedChannelRef.current !== "off",
        kickRaw: accelRaw,
        kickDrive: drive,
        kickArmed: reactiveOn && accelChannelRef.current !== "off",
        kick: motionKickRef.current,
        dt,
      });

      const crest = Math.max(0, peak - rms * 1.15);
      const punch = Math.min(1, Math.max(peakHold, crest * 1.4));
      const flash = Math.min(1, Math.max(lowImpulse, kickEnv));
      const twinkleOn = twinkleRef.current;

      let glyphColor: string;
      if (twinkleOn) {
        twinkleHueRef.current = advanceTwinkleHue(
          twinkleHueRef.current,
          dt,
          twinkleSpeedRef.current,
        );
        resolveTwinkleColor(
          twinkleHueRef.current,
          twinkleSRef.current,
          twinkleLRef.current,
          _tint,
        );
        if (reactiveOn) {
          const pulseAmt = updateTwinklePulseEnv(
            twinklePulseRef.current,
            Math.max(low, accelRaw),
            colorDrive,
            dt,
          );
          pulseTwinkleLight(_tint, pulseAmt, colorDrive);
        }
        glyphColor = `#${_tint.getHexString()}`;
      } else {
        const current = fixedHslRef.current;
        let s: number;
        let l: number;
        if (reactiveOn) {
          const fullS = Math.max(current.s, 75);
          const idleS = Math.min(fullS, REACTIVE_IDLE_S);
          s = idleS + (fullS - idleS) * flash;
          const baseL = Math.min(current.l * 0.55, REACTIVE_BASE_L);
          l = Math.min(
            88,
            baseL + flash * REACTIVE_DRIVE_L + punch * REACTIVE_PEAK_L,
          );
        } else {
          s = Math.max(current.s, 75);
          l = current.l;
        }
        glyphColor = `hsl(${current.h}, ${s}%, ${l}%)`;
      }

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

      rafView = viewOf();
      raf = rafView.requestAnimationFrame(tick);
    };

    const onPipChange = () => {
      cancelRaf();
      resize();
      rafView = viewOf();
      raf = rafView.requestAnimationFrame(tick);
    };

    const resetRuntime = () => {
      seedDrops();
      lowImpulse = 0;
      peakHold = 0;
      prevLow = 0;
      motionKickRef.current = createMotionKickState();
      last = performance.now();
      twinkleHueRef.current = hueDegFromHex(prefsRef.current.color);
      twinklePulseRef.current = createTwinklePulseEnv();
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
    };
    const unregRuntime = registerRuntimeReset(SCREEN_ID, resetRuntime);

    resize();
    rafView = viewOf();
    raf = rafView.requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener(VISUAL_PIP_CHANGE, onPipChange);

    return () => {
      unregRuntime();
      cancelRaf();
      window.removeEventListener("resize", resize);
      window.removeEventListener(VISUAL_PIP_CHANGE, onPipChange);
    };
  }, [visualizer.vizRef]);

  return {
    canvasRef,
    controls: {
      twinkle,
      setTwinkle,
      twinkleSpeed,
      setTwinkleSpeed,
      twinkleS,
      setTwinkleS,
      twinkleL,
      setTwinkleL,
      color,
      setColor,
      fallSpeed,
      setFallSpeed,
      speedChannel,
      setSpeedChannel,
      speedDrive,
      setSpeedDrive,
      accelChannel,
      setAccelChannel,
      drive,
      setDrive,
      driveMax: MATRIX_DRIVE_MAX,
      speedDriveMax: MATRIX_DRIVE_MAX,
      colorDrive,
      setColorDrive,
      colorDriveMax: MATRIX_COLOR_DRIVE_MAX,
      reset,
      fullscreen: () => void toggleFullscreen(),
    },
    visualizer,
  };
};

export default useMatrixHook;
