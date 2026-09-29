"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMPTY_VIZ_BANDS,
  postHelloRequest,
  postVisualizerToggle,
  subscribeAudioBus,
  type VizBands,
} from "@/lib/audioBus";

export type VizBandKey = keyof Omit<VizBands, "enabled">;

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
 * Extension handshake + band feed. Canvas reads `vizRef` in rAF;
 * meters are throttled for the control panel UI.
 */
export function useAudioReactive({
  bands: bandsMask,
  preferredReactive = false,
  onReactiveChange,
}: UseAudioReactiveOptions = {}) {
  const active = resolveBands(bandsMask);
  const activeRef = useRef(active);
  const vizRef = useRef<VizBands>({ ...EMPTY_VIZ_BANDS });
  const lastUiSync = useRef(0);
  const beatPeakRef = useRef(0);
  const pluginRef = useRef(false);
  const lastToggleRef = useRef<boolean | null>(null);
  const preferredRef = useRef(preferredReactive);
  const onReactiveChangeRef = useRef(onReactiveChange);

  const [pluginPresent, setPluginPresent] = useState(false);
  const [reactive, setReactiveState] = useState(false);
  const [meters, setMeters] = useState<AudioReactiveMeters>(ZERO_METERS);

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

  const applyReactive = (enabled: boolean, notify: boolean) => {
    if (enabled && !pluginRef.current) return;
    preferredRef.current = enabled;
    setReactiveState(enabled);
    vizRef.current = enabled
      ? { ...vizRef.current, enabled: true }
      : { ...EMPTY_VIZ_BANDS, enabled: false };
    sendToggle(enabled);
    if (!enabled) {
      setMeters(ZERO_METERS);
      beatPeakRef.current = 0;
    }
    if (notify) onReactiveChangeRef.current?.(enabled);
  };

  const setReactive = (enabled: boolean) => {
    applyReactive(enabled, true);
  };

  // Keep preference from screen prefs in sync
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

    const pauseForOffline = () => {
      lastToggleRef.current = false;
      setReactiveState(false);
      setMeters(ZERO_METERS);
      vizRef.current = { ...EMPTY_VIZ_BANDS };
      beatPeakRef.current = 0;
    };

    const resumeIfPreferred = () => {
      if (!preferredRef.current) return;
      preferredRef.current = true;
      setReactiveState(true);
      vizRef.current = { ...vizRef.current, enabled: true };
      if (lastToggleRef.current !== true) {
        lastToggleRef.current = true;
        postVisualizerToggle(true);
      }
    };

    const syncPoll = () => {
      if (pollTimer != null) window.clearInterval(pollTimer);
      // Offline: poll faster so a returning extension is noticed without refresh
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
        pauseForOffline();
      } else {
        resumeIfPreferred();
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
        if (!vizRef.current.enabled) return;

        const bands = activeRef.current;
        const nextBeat = bands.beat ? frame.beat : 0;
        // Peak-hold so short kicks stay visible in the panel
        beatPeakRef.current = Math.max(nextBeat, beatPeakRef.current * 0.88);

        vizRef.current = {
          enabled: true,
          bass: bands.bass ? frame.bass : 0,
          mid: bands.mid ? frame.mid : 0,
          high: bands.high ? frame.high : 0,
          beat: nextBeat,
        };

        const now = performance.now();
        if (now - lastUiSync.current > 80) {
          lastUiSync.current = now;
          setMeters({
            bass: bands.bass ? frame.bass : 0,
            mid: bands.mid ? frame.mid : 0,
            high: bands.high ? frame.high : 0,
            beat: beatPeakRef.current,
          });
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
  }, []);

  const visibleBands = ALL_BANDS.filter((key) => active[key]);

  return {
    vizRef,
    pluginPresent,
    reactive,
    setReactive,
    meters,
    visibleBands,
  };
}
