"use client";

import { useEffect, useRef, useState } from "react";
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
 * Analysis stays on whenever the plugin is present (HUD spectrum).
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

  const [pluginPresent, setPluginPresent] = useState(false);
  const [reactive, setReactiveState] = useState(false);
  const [meters, setMeters] = useState<AudioReactiveMeters>(ZERO_METERS);
  const [bpm, setBpm] = useState(0);

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

  /** Keep analyser on while plugin is present — HUD needs the stream */
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
      // keep deriver + analyser for overlay spectrum
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
    const deriver = deriverRef.current;
    const bpmEstimator = bpmEstimatorRef.current;

    const pauseForOffline = () => {
      lastToggleRef.current = false;
      setReactiveState(false);
      setMeters(ZERO_METERS);
      setBpm(0);
      vizRef.current = emptyVizBands(false);
      spectrumRef.current = emptySpectrumSnap();
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

        // HUD spectrum — always, even when screen reactive is off
        spectrumRef.current = {
          bands: derived.bands,
          rms: derived.rms,
          peak: derived.peak,
          at: now,
        };

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
    /** Live spectrum for overlay HUD (always fed while plugin streams) */
    spectrumRef,
    pluginPresent,
    reactive,
    setReactive,
    meters,
    /** Smoothed BPM estimate for UI (0 = unlocked) */
    bpm,
    visibleBands,
  };
}
