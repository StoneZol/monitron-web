"use client";

import { useRef, useState } from "react";
import {
  migrateAudioSource,
  MIC_GATE_DEFAULT,
  normalizeMicGate,
  normalizePeakGain,
  PEAK_GAIN_DEFAULT,
  useAudioReactive,
  type AudioSource,
} from "@/hooks/useAudioReactive";
import { toggleFullscreen } from "@/lib/fullscreen";
import { loadScreenPrefs, saveScreenPrefs } from "@/lib/screenPrefs";
import {
  BLACKHOLE_DEFAULTS,
  type BlackholeLive,
} from "./Blackhole.types";

const SCREEN_ID = "blackhole";

type AudioChrome = {
  audioSource: AudioSource;
  micGate: number;
  peakGain: number;
};

type StoredPrefs = BlackholeLive & Partial<AudioChrome> & {
  reactive?: unknown;
};

function persist(live: BlackholeLive, chrome: AudioChrome) {
  saveScreenPrefs(SCREEN_ID, { ...live, ...chrome });
}

export default function useBlackholeHook() {
  const [audioChrome, setAudioChrome] = useState<AudioChrome>(() => {
    const loaded = loadScreenPrefs(SCREEN_ID, {
      ...BLACKHOLE_DEFAULTS,
      audioSource: "off" as AudioSource,
      micGate: MIC_GATE_DEFAULT,
      peakGain: PEAK_GAIN_DEFAULT,
    } as StoredPrefs);
    return {
      audioSource: migrateAudioSource(loaded),
      micGate: normalizeMicGate(loaded.micGate),
      peakGain: normalizePeakGain(loaded.peakGain),
    };
  });

  const liveRef = useRef<BlackholeLive>({ ...BLACKHOLE_DEFAULTS });
  // v1: look / quality / channels stay on defaults (no panel knobs yet)
  liveRef.current = { ...BLACKHOLE_DEFAULTS };

  const chromeRef = useRef(audioChrome);
  chromeRef.current = audioChrome;

  const visualizer = useAudioReactive({
    preferredSource: audioChrome.audioSource,
    preferredMicGate: audioChrome.micGate,
    preferredPeakGain: audioChrome.peakGain,
    onSourceChange: (audioSource) => {
      const next = { ...chromeRef.current, audioSource };
      chromeRef.current = next;
      setAudioChrome(next);
      persist(liveRef.current, next);
    },
    onMicGateChange: (micGate) => {
      const next = { ...chromeRef.current, micGate };
      chromeRef.current = next;
      setAudioChrome(next);
      persist(liveRef.current, next);
    },
    onPeakGainChange: (peakGain) => {
      const next = { ...chromeRef.current, peakGain };
      chromeRef.current = next;
      setAudioChrome(next);
      persist(liveRef.current, next);
    },
  });

  return {
    liveRef,
    vizRef: visualizer.vizRef,
    visualizer,
    controls: {
      fullscreen: () => void toggleFullscreen(),
      reset: () => {
        persist(BLACKHOLE_DEFAULTS, {
          audioSource: "off",
          micGate: MIC_GATE_DEFAULT,
          peakGain: PEAK_GAIN_DEFAULT,
        });
        window.location.reload();
      },
    },
  };
}
