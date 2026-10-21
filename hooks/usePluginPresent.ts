"use client";

import { useEffect, useState } from "react";
import { postHelloRequest, subscribeAudioBus } from "@/lib/audioBus";
import { notePluginGone, notePluginHello } from "@/lib/pluginPresence";

const HELLO_STALE_MS = 6000;
const HELLO_POLL_MS = 2000;

/**
 * Extension presence via `hello` — independent of visualizer / viz lease.
 * Used on home and for plugin-only UI (e.g. Wet Glass track-change).
 */
export function usePluginPresent(): boolean {
  const [present, setPresent] = useState(false);

  useEffect(() => {
    let lastHello = 0;
    let alive = true;

    const mark = () => {
      lastHello = performance.now();
      if (alive) setPresent(true);
    };

    const unsub = subscribeAudioBus({
      onHello: (hello) => {
        notePluginHello(hello);
        mark();
      },
      onTabTitle: mark,
      onFrame: mark,
    });

    const tick = () => {
      postHelloRequest();
      if (lastHello > 0 && performance.now() - lastHello > HELLO_STALE_MS) {
        setPresent(false);
        notePluginGone();
      }
    };

    tick();
    const poll = window.setInterval(tick, HELLO_POLL_MS);

    return () => {
      alive = false;
      unsub();
      window.clearInterval(poll);
    };
  }, []);

  return present;
}
