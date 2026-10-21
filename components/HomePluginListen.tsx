"use client";

import { useEffect, useState } from "react";
import {
  postHelloRequest,
  subscribeAudioBus,
} from "@/lib/audioBus";
import {
  notePluginGone,
  notePluginHello,
} from "@/lib/pluginPresence";

const HELLO_STALE_MS = 6000;
const TITLE_STALE_MS = 2500;
const HELLO_POLL_MS = 2000;

function truncateTitle(title: string, max = 42): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Home-only listener: plugin hello (+ version) + tab-title stream.
 * Lives outside visualizer / viz lease — just presence + now-playing label.
 */
export function HomePluginListen() {
  const [pluginOn, setPluginOn] = useState(false);
  const [pluginVer, setPluginVer] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [streamOn, setStreamOn] = useState(false);

  useEffect(() => {
    let lastHello = 0;
    let lastTitle = 0;
    let alive = true;

    const markHello = (version?: string) => {
      lastHello = performance.now();
      if (!alive) return;
      setPluginOn(true);
      if (version?.trim()) setPluginVer(version.trim());
    };

    const unsub = subscribeAudioBus({
      onHello: (hello) => {
        notePluginHello(hello);
        markHello(hello.version);
      },
      onTabTitle: (msg) => {
        markHello();
        lastTitle = performance.now();
        if (!alive) return;
        setStreamOn(true);
        setTitle(msg.title.trim());
      },
    });

    const tick = () => {
      postHelloRequest();
      const now = performance.now();
      if (lastHello > 0 && now - lastHello > HELLO_STALE_MS) {
        setPluginOn(false);
        setPluginVer(null);
        notePluginGone();
      }
      if (lastTitle > 0 && now - lastTitle > TITLE_STALE_MS) {
        setStreamOn(false);
        setTitle("");
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

  const verLabel = pluginVer ? `v${pluginVer}` : null;

  if (!pluginOn) {
    return (
      <>
        <span className="text-muted/70">plugin</span>
        <span className="text-muted">/</span>
        <span className="text-muted/50">offline</span>
      </>
    );
  }

  if (!streamOn || !title) {
    return (
      <>
        <span className="text-cyan">plugin</span>
        {verLabel ? (
          <>
            <span className="text-muted">/</span>
            <span className="text-signal/80">{verLabel}</span>
          </>
        ) : null}
        <span className="text-muted">/</span>
        <span className="text-warn">idle</span>
      </>
    );
  }

  return (
    <>
      <span className="text-cyan">plugin</span>
      {verLabel ? (
        <>
          <span className="text-muted">/</span>
          <span className="text-signal/80">{verLabel}</span>
        </>
      ) : null}
      <span className="text-muted">/</span>
      <span className="text-signal">live</span>
      <span className="text-muted">/</span>
      <span
        className="max-w-[min(42ch,55vw)] truncate normal-case tracking-normal text-ink/85"
        title={title}
      >
        {truncateTitle(title)}
      </span>
    </>
  );
}
