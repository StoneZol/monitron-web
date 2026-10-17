"use client";

import { useSyncExternalStore } from "react";
import { HazardAlert } from "@/components/HazardAlert";

const STORAGE_KEY = "monitron:photosensitive-alert:v3";

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
 * First-visit hazard gate (photosensitive + heavy GPU load) — blocks the whole
 * app until the visitor accepts or leaves. Mounted from the root layout.
 *
 * Never paint until the client has read localStorage (avoids reload / HMR flash).
 */
export function PhotosensitiveAlert() {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const accepted = useSyncExternalStore(subscribe, readAccepted, () => true);

  if (!isClient || accepted) return null;

  return (
    <HazardAlert
      tone="warn"
      eyebrow="!SYSTEM FAILURE // HAZARD_ALERT!"
      title="Health & hardware warning"
      primary={{
        label: "Run unstable signal",
        onClick: acceptAlert,
        glitch: true,
      }}
      secondary={{ label: "Force quit", onClick: forceQuit }}
    >
      <p>
        The following visual signal contains extreme strobe, intense flashing,
        rapid color shifts, and high-contrast motion.
      </p>
      <p>
        If you are prone to seizures, migraines, vestibular / motion sickness,
        or photosensitivity of any kind — shut down immediately.
      </p>
      <p>
        Patterns on this site may also trigger anxiety, sensory overload, or
        visual after-images. Proceed only if you know your limits.
      </p>
      <p>
        Some pieces carry the authors&apos; odd worldviews and may unsettle you,
        leave you uneasy, or just mess with your mood. Screens marked sensitive
        flag that. Step away if it hits too hard.
      </p>
      <p>
        Some screen configs can push GPU / CPU extremely hard. If you ignore
        that, leave heavy presets running, and your machine overheats,
        throttles, or dies because the hardware is weak — that is on you. The
        site creator is not responsible for fried PCs, lost work, or hardware
        damage from load you chose to run.
      </p>
      <p className="text-warn">You have been warned.</p>
    </HazardAlert>
  );
}
