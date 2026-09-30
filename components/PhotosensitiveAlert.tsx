"use client";

import { useSyncExternalStore } from "react";
import { PanelButton } from "@/components/ControlPanel/PanelButton";

const STORAGE_KEY = "monitron:photosensitive-alert:v1";

const listeners = new Set<() => void>();
const subscribeNoop = () => () => {};

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cached: boolean | null = null;

function readAccepted(): boolean {
  if (cached !== null) return cached;
  try {
    cached = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    cached = false;
  }
  return cached;
}

function acceptAlert() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode — still proceed this session */
  }
  cached = true;
  emit();
}

function forceQuit() {
  window.location.href = "https://www.google.com";
}

/**
 * First-visit photosensitive / epilepsy gate — blocks the whole app until
 * the visitor accepts or leaves. Mounted from the root layout.
 *
 * Never paint until the client has read localStorage (avoids reload / HMR flash).
 */
export function PhotosensitiveAlert() {
  // false on SSR / first server snapshot — skip banner until client store is live
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const accepted = useSyncExternalStore(
    subscribe,
    readAccepted,
    () => true,
  );

  if (!isClient || accepted) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="photosensitive-alert-title"
      aria-describedby="photosensitive-alert-body"
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl border-2 border-warn bg-black/80 p-5 shadow-[4px_4px_0_#8b1a00] sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-1 border border-warn/40"
        />

        <p className="font-mono text-[10px] tracking-[0.28em] text-warn/70 uppercase">
          !SYSTEM FAILURE // PHOTOSENSITIVE_ALERT!
        </p>

        <h1
          id="photosensitive-alert-title"
          className="mt-4 font-mono text-xl font-semibold tracking-[0.12em] text-warn uppercase sm:text-2xl"
        >
          Epilepsy warning
        </h1>
        <div className="mt-2 font-mono text-[10px] tracking-[0.4em] text-warn/50">
          ---------------
        </div>

        <div
          id="photosensitive-alert-body"
          className="mt-5 space-y-4 font-mono text-[11px] leading-relaxed tracking-[0.06em] text-warn/90 uppercase sm:text-xs"
        >
          <p>
            The following visual signal contains extreme strobe, intense
            flashing, rapid color shifts, and high-contrast motion.
          </p>
          <p>
            If you are prone to seizures, migraines, vestibular / motion
            sickness, or photosensitivity of any kind — shut down immediately.
          </p>
          <p>
            Patterns on this site may also trigger anxiety, sensory overload,
            or visual after-images. Proceed only if you know your limits.
          </p>
          <p className="text-warn">You have been warned.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <PanelButton
            onClick={acceptAlert}
            data-text="Run unstable signal"
            className="alert-run-glitch focus-visible:outline-signal"
          >
            Run unstable signal
          </PanelButton>
          <PanelButton
            onClick={forceQuit}
            className="border-warn/50 text-warn/60 shadow-none hover:border-warn hover:text-warn hover:shadow-[2px_2px_0_#8b1a00] focus-visible:outline-warn"
          >
            Force quit
          </PanelButton>
        </div>
      </div>
    </div>
  );
}
