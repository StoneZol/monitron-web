"use client";

import { useEffect, useRef, useState } from "react";
import {
  emptyAudioBusSnap,
  type AudioBusSnap,
} from "@/components/AudioBusPanel";
import {
  AUDIO_BAND_COUNT,
  emptyVizBands,
  postHelloRequest,
  postVisualizerToggle,
  subscribeAudioBus,
  type VizBands,
} from "@/lib/audioBus";
import { MicCapture, gateMicFrame, MIC_GATE_DEFAULT, MIC_GATE_MAX, clampMicGate, normalizeMicGate } from "@/lib/audioMic";

export { MIC_GATE_DEFAULT, MIC_GATE_MAX, normalizeMicGate };

/** How the screen is fed — plugin tab audio, browser mic, or quiet */
export type AudioSource = "off" | "mic" | "plugin";

export const AUDIO_SOURCE_OPTIONS: {
  value: AudioSource;
  label: string;
}[] = [
  { value: "off", label: "off" },
  { value: "mic", label: "mic" },
  { value: "plugin", label: "plugin" },
];

type UseAudioReactiveOptions = {
  /** Restored from screen prefs */
  preferredSource?: AudioSource;
  /** Fired when user / auto-fallback changes source (for persistence) */
  onSourceChange?: (source: AudioSource) => void;
  /** Mic noise-gate threshold 0..MIC_GATE_MAX (only affects mic path) */
  preferredMicGate?: number;
  onMicGateChange?: (gate: number) => void;
};

function clip01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function copyBands(src: number[]): number[] {
  const out = new Array<number>(AUDIO_BAND_COUNT);
  for (let i = 0; i < AUDIO_BAND_COUNT; i++) {
    out[i] = src[i] ?? 0;
  }
  return out;
}

function normalizeSource(value: unknown): AudioSource {
  if (value === "mic" || value === "plugin" || value === "off") return value;
  return "off";
}

/** Migrate legacy `reactive: boolean` prefs → AudioSource */
export function migrateAudioSource(
  saved: { audioSource?: unknown; reactive?: unknown },
): AudioSource {
  if (
    saved.audioSource === "off" ||
    saved.audioSource === "mic" ||
    saved.audioSource === "plugin"
  ) {
    return saved.audioSource;
  }
  if (saved.reactive === true) return "plugin";
  return "off";
}

/**
 * Source router: plugin bus and/or mic → one vizRef + AudioBusPanel snap.
 * Screens only read vizRef; they don't care which pipe is live.
 */
export function useAudioReactive({
  preferredSource = "off",
  onSourceChange,
  preferredMicGate = MIC_GATE_DEFAULT,
  onMicGateChange,
}: UseAudioReactiveOptions = {}) {
  const vizRef = useRef<VizBands>(emptyVizBands(false));
  const pluginRef = useRef(false);
  const sourceRef = useRef<AudioSource>(normalizeSource(preferredSource));
  const preferredRef = useRef<AudioSource>(normalizeSource(preferredSource));
  const micGateRef = useRef(clampMicGate(preferredMicGate));
  const lastToggleRef = useRef<boolean | null>(null);
  const onSourceChangeRef = useRef(onSourceChange);
  const onMicGateChangeRef = useRef(onMicGateChange);
  const micRef = useRef(new MicCapture());
  const applySourceRef = useRef<(next: AudioSource, notify: boolean) => void>(
    () => {},
  );
  const busStatsRef = useRef({
    lastUi: 0,
    frames: 0,
    windowStart: performance.now(),
    receivedAt: 0,
  });

  const [pluginPresent, setPluginPresent] = useState(false);
  const [source, setSourceState] = useState<AudioSource>(() =>
    normalizeSource(preferredSource),
  );
  const [micGate, setMicGateState] = useState(() =>
    clampMicGate(preferredMicGate),
  );
  const [bus, setBus] = useState<AudioBusSnap | null>(null);
  const [busAgeMs, setBusAgeMs] = useState<number | null>(null);
  const [busLive, setBusLive] = useState(false);
  /** Mic selected but capture blocked until a user gesture */
  const [micNeedsGesture, setMicNeedsGesture] = useState(false);

  useEffect(() => {
    onSourceChangeRef.current = onSourceChange;
  }, [onSourceChange]);

  useEffect(() => {
    onMicGateChangeRef.current = onMicGateChange;
  }, [onMicGateChange]);

  useEffect(() => {
    preferredRef.current = normalizeSource(preferredSource);
  }, [preferredSource]);

  useEffect(() => {
    const next = clampMicGate(preferredMicGate);
    micGateRef.current = next;
    setMicGateState(next);
  }, [preferredMicGate]);

  applySourceRef.current = (next, notify) => {
    let resolved = next;
    if (resolved === "plugin" && !pluginRef.current) {
      resolved = "off";
    }

    const prev = sourceRef.current;
    sourceRef.current = resolved;
    setSourceState(resolved);

    const sendPluginToggle = (enabled: boolean) => {
      if (lastToggleRef.current === enabled) return;
      lastToggleRef.current = enabled;
      postVisualizerToggle(enabled);
    };

    const clearBusUi = () => {
      busStatsRef.current = {
        lastUi: 0,
        frames: 0,
        windowStart: performance.now(),
        receivedAt: 0,
      };
      setBus(emptyAudioBusSnap());
      setBusAgeMs(null);
      setBusLive(false);
    };

    if (resolved === "off") {
      void micRef.current.stop();
      sendPluginToggle(false);
      vizRef.current = emptyVizBands(false);
      clearBusUi();
      setMicNeedsGesture(false);
    } else if (resolved === "plugin") {
      void micRef.current.stop();
      sendPluginToggle(true);
      vizRef.current = { ...vizRef.current, enabled: true };
      setMicNeedsGesture(false);
    } else {
      sendPluginToggle(false);
      vizRef.current = { ...vizRef.current, enabled: true };
      if (prev !== "mic" || !micRef.current.active) {
        void micRef.current
          .start({
            onFrame: (frame) => {
              if (sourceRef.current !== "mic") return;
              const gated = gateMicFrame(
                frame.bands,
                frame.rms,
                frame.peak,
                micGateRef.current,
              );
              pushSpectrumRef.current(
                copyBands(gated.bands),
                clip01(gated.rms),
                clip01(gated.peak),
                frame.sampleRate,
                frame.t,
              );
            },
            onError: () => {
              // Device lost — keep mic selected, wait for a gesture to retry
              if (sourceRef.current === "mic") {
                setMicNeedsGesture(true);
              }
            },
          })
          .then(() => {
            setMicNeedsGesture(false);
          })
          .catch(() => {
            // No user activation / denied — don't wipe prefs, arm gesture resume
            if (sourceRef.current === "mic") {
              setMicNeedsGesture(true);
            }
          });
      }
    }

    if (notify) onSourceChangeRef.current?.(resolved);
  };

  const pushSpectrumRef = useRef(
    (
      bands: number[],
      rms: number,
      peak: number,
      sampleRate: number,
      t: number,
    ) => {
      const now = performance.now();
      const stats = busStatsRef.current;
      stats.frames += 1;
      stats.receivedAt = now;

      if (now - stats.lastUi >= 80) {
        stats.lastUi = now;
        const elapsed = (now - stats.windowStart) / 1000;
        const fps = elapsed > 0 ? stats.frames / elapsed : 0;
        if (elapsed >= 1) {
          stats.frames = 0;
          stats.windowStart = now;
        }
        setBus({
          bands: bands.slice(),
          rms,
          peak,
          sampleRate,
          t,
          fps,
        });
        setBusAgeMs(t > 0 ? t : null);
        setBusLive(true);
      }

      vizRef.current = {
        enabled: true,
        bands,
        rms,
        peak,
      };
    },
  );

  const setSource = (next: AudioSource) => {
    applySourceRef.current(next, true);
  };

  const setMicGate = (value: number) => {
    const next = clampMicGate(value);
    micGateRef.current = next;
    setMicGateState(next);
    onMicGateChangeRef.current?.(next);
  };

  useEffect(() => {
    const preferred = normalizeSource(preferredSource);
    // Always (re)apply — remount with source already "mic" must still open capture.
    // (Previously we bailed when preferred === sourceRef and never called start.)
    if (preferred === "plugin" && !pluginRef.current) {
      sourceRef.current = "plugin";
      setSourceState("plugin");
      return;
    }
    applySourceRef.current(preferred, false);
  }, [preferredSource]);

  /** Browser blocks getUserMedia without a gesture — first click/key resumes mic */
  useEffect(() => {
    if (source !== "mic" || !micNeedsGesture) return;

    const resume = () => {
      if (sourceRef.current !== "mic") return;
      applySourceRef.current("mic", false);
    };

    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("keydown", resume, true);
    return () => {
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
    };
  }, [source, micNeedsGesture]);

  useEffect(() => {
    let lastHelloAt = 0;
    let present = false;
    let pollTimer: number | null = null;
    let staleTimer: number | null = null;

    const syncPoll = () => {
      if (pollTimer != null) window.clearInterval(pollTimer);
      pollTimer = window.setInterval(tick, present ? 2000 : 800);
    };

    const setPresent = (next: boolean) => {
      if (next) lastHelloAt = performance.now();
      else lastHelloAt = 0;

      pluginRef.current = next;
      if (present === next) return;

      present = next;
      setPluginPresent(next);
      syncPoll();

      if (!next) {
        if (lastToggleRef.current) postVisualizerToggle(false);
        lastToggleRef.current = false;
        if (sourceRef.current === "plugin") {
          applySourceRef.current("off", true);
        }
      } else if (preferredRef.current === "plugin") {
        applySourceRef.current("plugin", false);
      }
    };

    const markPresent = () => setPresent(true);

    const tick = () => {
      postHelloRequest();
      if (
        present &&
        lastHelloAt > 0 &&
        performance.now() - lastHelloAt > 6000
      ) {
        setPresent(false);
      }
    };

    const unsubscribe = subscribeAudioBus({
      onHello: markPresent,
      onFrame: (frame) => {
        markPresent();
        if (sourceRef.current !== "plugin") return;
        pushSpectrumRef.current(
          copyBands(frame.bands),
          clip01(frame.rms),
          clip01(frame.peak),
          frame.sampleRate,
          frame.t,
        );
      },
    });

    staleTimer = window.setInterval(() => {
      const { receivedAt } = busStatsRef.current;
      if (!receivedAt) {
        setBusLive(false);
        return;
      }
      setBusLive(performance.now() - receivedAt < 500);
    }, 200);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    tick();
    syncPoll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);

    return () => {
      unsubscribe();
      if (pollTimer != null) window.clearInterval(pollTimer);
      if (staleTimer != null) window.clearInterval(staleTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
      void micRef.current.stop();
      if (lastToggleRef.current) postVisualizerToggle(false);
      pluginRef.current = false;
      setPluginPresent(false);
    };
  }, []);

  return {
    vizRef,
    bus,
    busAgeMs,
    busLive,
    pluginPresent,
    source,
    setSource,
    /** Mic noise gate 0..MIC_GATE_MAX — only applied on mic path */
    micGate,
    setMicGate,
    micGateMax: MIC_GATE_MAX,
    /** Mic wants a click/key to start (autoplay / remount policy) */
    micNeedsGesture,
    /** true when source is mic or plugin — screens keep using this gate */
    reactive: source !== "off",
  };
}
