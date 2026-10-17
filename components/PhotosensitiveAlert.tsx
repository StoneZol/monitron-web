"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { HazardAlert } from "@/components/HazardAlert";
import {
  CONSENT_GATE_ID,
  markPhotosensitiveBoot,
  readPhotosensitiveAccepted,
  writePhotosensitiveAccepted,
} from "@/lib/photosensitiveConsent";

const mountListeners = new Set<() => void>();
const acceptListeners = new Set<() => void>();

/** Flipped once on the client so the gate can open after hydration. */
let clientMounted = false;

function subscribeMount(listener: () => void) {
  mountListeners.add(listener);
  return () => {
    mountListeners.delete(listener);
  };
}

function subscribeAccept(listener: () => void) {
  acceptListeners.add(listener);
  return () => {
    acceptListeners.delete(listener);
  };
}

function emitMount() {
  for (const listener of mountListeners) listener();
}

function emitAccept() {
  for (const listener of acceptListeners) listener();
}

function acceptAlert() {
  writePhotosensitiveAccepted();
  markPhotosensitiveBoot(true);
  emitAccept();
}

function forceQuit() {
  window.location.href = "https://www.google.com";
}

/**
 * First-visit hazard gate (photosensitive + heavy GPU load) — blocks the whole
 * app until the visitor accepts or leaves. Mounted from the root layout.
 *
 * Mount + localStorage are external stores (not useEffect→setState) so cold
 * loads always open the gate after hydration, and ConsentTripwire can boot.
 */
export function PhotosensitiveAlert() {
  const mounted = useSyncExternalStore(
    subscribeMount,
    () => clientMounted,
    () => false,
  );
  const accepted = useSyncExternalStore(
    subscribeAccept,
    readPhotosensitiveAccepted,
    () => true,
  );

  useLayoutEffect(() => {
    clientMounted = true;
    const acceptedNow = readPhotosensitiveAccepted();
    markPhotosensitiveBoot(acceptedNow);
    emitMount();
    emitAccept();
  }, []);

  if (!mounted || accepted) return null;

  return (
    <HazardAlert
      tone="warn"
      consentGate={CONSENT_GATE_ID}
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
