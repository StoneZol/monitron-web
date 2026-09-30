"use client";

import { useEffect, useRef, useState } from "react";
import {
  emptyAudioBusSnap,
  type AudioBusSnap,
} from "@/components/AudioBusPanel";
import {
  emptySpectrumSnap,
  type SpectrumSnap,
} from "@/components/AudioSpectrum";
import {
  emptyVizBands,
  postHelloRequest,
  postVisualizerToggle,
  subscribeAudioBus,
  type VizBands,
} from "@/lib/audioBus";
import { AudioDeriver } from "@/lib/audioDerive";
import { BpmEstimator } from "@/lib/bpmEstimate";

export type VizBandKey = "bass" | "mid" | "high" | "beat";

/** Which audio channels this screen actually drives. Unused stay hidden in UI. */
export type VizBandMask = Partial<Record<VizBandKey, boolean>>;

const ALL_BANDS: VizBandKey[] = ["bass", "mid", "high", "beat"];

const DEFAULT_BANDS: Record<VizBandKey, boolean> = {
  bass: true,
  mid: true,
  high: true,
  beat: true,
};

type UseAudioReactiveOptions = {
  /** Gate channels for this screen — false/omitted-as-false hides the meter */
  bands?: VizBandMask;
  /** Restored from screen prefs — re-applied when extension comes online */
  preferredReactive?: boolean;
  /** Fired when user toggles reactive (for persistence) */
  onReactiveChange?: (enabled: boolean) => void;
};

function resolveBands(mask?: VizBandMask): Record<VizBandKey, boolean> {
  if (!mask) return { ...DEFAULT_BANDS };
  return {
    bass: mask.bass === true,
    mid: mask.mid === true,
    high: mask.high === true,
    beat: mask.beat === true,
  };
}

export type AudioReactiveMeters = Record<VizBandKey, number>;

const ZERO_METERS: AudioReactiveMeters = {
  bass: 0,
  mid: 0,
  high: 0,
  beat: 0,
};

/**
 * Extension handshake + raw spectrum feed.
 * Analysis stays on whenever the plugin is present (bus panel + future savers).
 * `reactive` only gates whether the screen reads vizRef.
 */
export function useAudioReactive({
  bands: bandsMask,
  preferredReactive = false,
  onReactiveChange,
}: UseAudioReactiveOptions = {}) {
  const active = resolveBands(bandsMask);
  const activeRef = useRef(active);
  const vizRef = useRef<VizBands>(emptyVizBands(false));
  const spectrumRef = useRef<SpectrumSnap>(emptySpectrumSnap());
  const lastUiSync = useRef(0);
  const beatPeakRef = useRef(0);
  const deriverRef = useRef(new AudioDeriver());
  const bpmEstimatorRef = useRef(new BpmEstimator());
  const pluginRef = useRef(false);
  const lastToggleRef = useRef<boolean | null>(null);
  const preferredRef = useRef(preferredReactive);
  const onReactiveChangeRef = useRef(onReactiveChange);
  const busStatsRef = useRef({
    lastUi: 0,
    frames: 0,
    windowStart: performance.now(),
    receivedAt: 0,
  });

  const [pluginPresent, setPluginPresent] = useState(false);
  const [reactive, setReactiveState] = useState(false);
  const [meters, setMeters] = useState<AudioReactiveMeters>(ZERO_METERS);
  const [bpm, setBpm] = useState(0);
  const [bus, setBus] = useState<AudioBusSnap | null>(null);
  const [busAgeMs, setBusAgeMs] = useState<number | null>(null);
  const [busLive, setBusLive] = useState(false);

  useEffect(() => {
    activeRef.current = resolveBands(bandsMask);
  }, [bandsMask]);

  useEffect(() => {
    onReactiveChangeRef.current = onReactiveChange;
  }, [onReactiveChange]);

  const sendToggle = (enabled: boolean) => {
    if (lastToggleRef.current === enabled) return;
    lastToggleRef.current = enabled;
    postVisualizerToggle(enabled);
  };

  /** Keep analyser on while plugin is present — bus panel needs the stream */
  const ensureAnalysing = () => {
    if (!pluginRef.current) return;
    sendToggle(true);
  };

  const applyReactive = (enabled: boolean, notify: boolean) => {
    if (enabled && !pluginRef.current) return;
    preferredRef.current = enabled;
    setReactiveState(enabled);
    if (enabled) {
      vizRef.current = { ...vizRef.current, enabled: true };
      ensureAnalysing();
    } else {
      vizRef.current = emptyVizBands(false);
      setMeters(ZERO_METERS);
      setBpm(0);
      beatPeakRef.current = 0;
      bpmEstimatorRef.current.reset();
    }
    if (notify) onReactiveChangeRef.current?.(enabled);
  };

  const setReactive = (enabled: boolean) => {
    applyReactive(enabled, true);
  };

  useEffect(() => {
    preferredRef.current = preferredReactive;
    if (!pluginRef.current) return;
    if (preferredReactive && !vizRef.current.enabled) {
      applyReactive(true, false);
    } else if (!preferredReactive && vizRef.current.enabled) {
      applyReactive(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredReactive]);

  useEffect(() => {
    let lastHelloAt = 0;
    let present = false;
    let pollTimer: number | null = null;
    let staleTimer: number | null = null;
    const deriver = deriverRef.current;
    const bpmEstimator = bpmEstimatorRef.current;

    const pauseForOffline = () => {
      lastToggleRef.current = false;
      setReactiveState(false);
      setMeters(ZERO_METERS);
      setBpm(0);
      vizRef.current = emptyVizBands(false);
      spectrumRef.current = emptySpectrumSnap();
      busStatsRef.current = {
        lastUi: 0,
        frames: 0,
        windowStart: performance.now(),
        receivedAt: 0,
      };
      setBus(emptyAudioBusSnap());
      setBusAgeMs(null);
      setBusLive(false);
      beatPeakRef.current = 0;
      deriver.reset();
      bpmEstimator.reset();
    };

    const onPluginOnline = () => {
      ensureAnalysing();
      if (!preferredRef.current) return;
      preferredRef.current = true;
      setReactiveState(true);
      vizRef.current = { ...vizRef.current, enabled: true };
    };

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
        pauseForOffline();
      } else {
        onPluginOnline();
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
        const derived = deriver.push(frame);
        const now = performance.now();
        const stats = busStatsRef.current;
        stats.frames += 1;
        stats.receivedAt = now;

        // Always feed spectrumRef (future savers) + bus panel
        spectrumRef.current = {
          bands: derived.bands,
          rms: derived.rms,
          peak: derived.peak,
          sampleRate: frame.sampleRate,
          t: frame.t,
          at: now,
        };

        if (now - stats.lastUi >= 80) {
          stats.lastUi = now;
          const elapsed = (now - stats.windowStart) / 1000;
          const fps = elapsed > 0 ? stats.frames / elapsed : 0;
          if (elapsed >= 1) {
            stats.frames = 0;
            stats.windowStart = now;
          }
          setBus({
            bands: derived.bands.slice(),
            rms: derived.rms,
            peak: derived.peak,
            sampleRate: frame.sampleRate,
            t: frame.t,
            fps,
          });
          setBusAgeMs(frame.t > 0 ? frame.t : null);
          setBusLive(true);
        }

        if (!vizRef.current.enabled) return;

        const mask = activeRef.current;
        const nextBeat = mask.beat ? derived.beat : 0;
        const nextBass = mask.bass ? derived.bass : 0;
        const nextMid = mask.mid ? derived.mid : 0;
        const nextHigh = mask.high ? derived.high : 0;

        beatPeakRef.current = Math.max(nextBeat, beatPeakRef.current * 0.88);
        const nextBpm = bpmEstimator.push(nextBeat, nextBass, now);

        vizRef.current = {
          enabled: true,
          bands: derived.bands,
          bass: nextBass,
          mid: nextMid,
          high: nextHigh,
          beat: nextBeat,
          rms: derived.rms,
          peak: derived.peak,
          bpm: nextBpm,
        };

        if (now - lastUiSync.current > 80) {
          lastUiSync.current = now;
          setMeters({
            bass: nextBass,
            mid: nextMid,
            high: nextHigh,
            beat: beatPeakRef.current,
          });
          setBpm(nextBpm > 0 ? nextBpm : 0);
        }
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
      if (lastToggleRef.current) postVisualizerToggle(false);
      pluginRef.current = false;
      setPluginPresent(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleBands = ALL_BANDS.filter((key) => active[key]);

  return {
    vizRef,
    /** Live spectrum ref for future savers (AudioSpectrum module) */
    spectrumRef,
    /** Plugin-style ::audio-bus panel state */
    bus,
    busAgeMs,
    busLive,
    pluginPresent,
    reactive,
    setReactive,
    meters,
    /** Smoothed BPM estimate for UI (0 = unlocked) */
    bpm,
    visibleBands,
  };
}
