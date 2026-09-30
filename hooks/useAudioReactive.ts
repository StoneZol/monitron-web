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

type UseAudioReactiveOptions = {
  /** Restored from screen prefs — re-applied when extension comes online */
  preferredReactive?: boolean;
  /** Fired when user toggles reactive (for persistence) */
  onReactiveChange?: (enabled: boolean) => void;
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

/**
 * Extension handshake + raw spectrum feed.
 * Analysis stays on whenever the plugin is present (bus panel).
 * `reactive` only gates whether the screen reads vizRef.
 * Screens derive EQ / onset themselves via `sliceBands` / peak.
 */
export function useAudioReactive({
  preferredReactive = false,
  onReactiveChange,
}: UseAudioReactiveOptions = {}) {
  const vizRef = useRef<VizBands>(emptyVizBands(false));
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
  const [bus, setBus] = useState<AudioBusSnap | null>(null);
  const [busAgeMs, setBusAgeMs] = useState<number | null>(null);
  const [busLive, setBusLive] = useState(false);

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

    const pauseForOffline = () => {
      lastToggleRef.current = false;
      setReactiveState(false);
      vizRef.current = emptyVizBands(false);
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
        const bands = copyBands(frame.bands);
        const rms = clip01(frame.rms);
        const peak = clip01(frame.peak);
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
            sampleRate: frame.sampleRate,
            t: frame.t,
            fps,
          });
          setBusAgeMs(frame.t > 0 ? frame.t : null);
          setBusLive(true);
        }

        if (!vizRef.current.enabled) return;

        vizRef.current = {
          enabled: true,
          bands,
          rms,
          peak,
        };
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

  return {
    vizRef,
    /** Plugin-style ::audio-bus panel state */
    bus,
    busAgeMs,
    busLive,
    pluginPresent,
    reactive,
    setReactive,
  };
}
