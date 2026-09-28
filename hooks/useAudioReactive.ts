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
  activeRef.current = active;

  const vizRef = useRef<VizBands>({ ...EMPTY_VIZ_BANDS });
  const lastUiSync = useRef(0);
  const beatPeakRef = useRef(0);
  const pluginRef = useRef(false);
  const lastToggleRef = useRef<boolean | null>(null);
  const preferredRef = useRef(preferredReactive);
  const onReactiveChangeRef = useRef(onReactiveChange);
  onReactiveChangeRef.current = onReactiveChange;

  const [pluginPresent, setPluginPresent] = useState(false);
  const [reactive, setReactiveState] = useState(false);
  const [meters, setMeters] = useState<AudioReactiveMeters>({
    bass: 0,
    mid: 0,
    high: 0,
    beat: 0,
  });

  const sendToggle = (enabled: boolean) => {
    if (lastToggleRef.current === enabled) return;
    lastToggleRef.current = enabled;
    postVisualizerToggle(enabled);
  };

  const zeroMeters = (): AudioReactiveMeters => ({
    bass: 0,
    mid: 0,
    high: 0,
    beat: 0,
  });

  const applyReactive = (enabled: boolean, notify: boolean) => {
    if (enabled && !pluginRef.current) return;
    preferredRef.current = enabled;
    setReactiveState(enabled);
    vizRef.current = enabled
      ? { ...vizRef.current, enabled: true }
      : { ...EMPTY_VIZ_BANDS, enabled: false };
    sendToggle(enabled);
    if (!enabled) {
      setMeters(zeroMeters());
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
    if (!pluginPresent) {
      // Pause stream — keep preferredRef so we can resume after hello
      setReactiveState(false);
      setMeters(zeroMeters());
      vizRef.current = { ...EMPTY_VIZ_BANDS };
      lastToggleRef.current = false;
      beatPeakRef.current = 0;
      return;
    }
    if (preferredRef.current) {
      applyReactive(true, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginPresent]);

  useEffect(() => {
    let lastHelloAt = 0;

    const markPresent = () => {
      lastHelloAt = performance.now();
      pluginRef.current = true;
      // Always set — recovers if state/ref ever desync
      setPluginPresent(true);
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

    postHelloRequest();
    const retry = window.setInterval(() => {
      postHelloRequest();
      if (
        pluginRef.current &&
        lastHelloAt > 0 &&
        performance.now() - lastHelloAt > 6000
      ) {
        pluginRef.current = false;
        setPluginPresent(false);
        if (lastToggleRef.current) postVisualizerToggle(false);
      }
    }, 2000);

    return () => {
      unsubscribe();
      window.clearInterval(retry);
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
