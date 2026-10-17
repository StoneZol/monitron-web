"use client";

import { useEffect } from "react";
import {
  CONSENT_GATE_SELECTOR,
  isPhotosensitiveBootChecked,
  readPhotosensitiveAccepted,
  subscribePhotosensitiveBoot,
} from "@/lib/photosensitiveConsent";
import { isTamperLocked, lockdown } from "@/lib/tamperLock";

const GRACE_MS = 1000;
const DEBOUNCE_MS = 280;

function gatePresent(): boolean {
  return Boolean(document.querySelector(CONSENT_GATE_SELECTOR));
}

/**
 * Watches the first-visit hazard portal. Arms only after PhotosensitiveAlert
 * has finished its client boot read — then if the gate is missing without
 * accept, nuke the page into a vanilla DOM lock.
 */
export function ConsentTripwire() {
  useEffect(() => {
    if (readPhotosensitiveAccepted() || isTamperLocked()) {
      return;
    }

    let armed = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let tripTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const cancelTrip = () => {
      if (tripTimer !== null) {
        clearTimeout(tripTimer);
        tripTimer = null;
      }
    };

    const cancelGrace = () => {
      if (graceTimer !== null) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
    };

    const scheduleTrip = () => {
      if (stopped || tripTimer !== null) return;
      tripTimer = setTimeout(() => {
        tripTimer = null;
        if (stopped) return;
        if (readPhotosensitiveAccepted()) return;
        if (gatePresent()) return;
        stopped = true;
        observer.disconnect();
        unsubBoot();
        lockdown("hazard");
      }, DEBOUNCE_MS);
    };

    const arm = () => {
      if (stopped || armed) return;
      if (readPhotosensitiveAccepted()) {
        stopped = true;
        return;
      }
      armed = true;
      graceTimer = setTimeout(() => {
        graceTimer = null;
        tick();
      }, GRACE_MS);
    };

    const tick = () => {
      if (stopped) return;
      if (readPhotosensitiveAccepted()) {
        stopped = true;
        cancelTrip();
        cancelGrace();
        observer.disconnect();
        unsubBoot();
        return;
      }
      if (!isPhotosensitiveBootChecked()) return;
      if (!armed) {
        arm();
        return;
      }
      if (graceTimer !== null) return;
      if (gatePresent()) {
        cancelTrip();
        return;
      }
      scheduleTrip();
    };

    const observer = new MutationObserver(tick);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const unsubBoot = subscribePhotosensitiveBoot(tick);
    tick();

    return () => {
      stopped = true;
      cancelTrip();
      cancelGrace();
      observer.disconnect();
      unsubBoot();
    };
  }, []);

  return null;
}
