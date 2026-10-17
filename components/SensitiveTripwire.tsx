"use client";

import { useEffect } from "react";
import {
  isSensitiveConfirmArmed,
  SENSITIVE_CONFIRM_SELECTOR,
  SENSITIVE_GATE_SELECTOR,
  subscribeSensitiveConfirm,
} from "@/lib/sensitiveGate";
import {
  getSensitivePreviewsEnabled,
  subscribeSensitivePreview,
} from "@/lib/sensitivePreview";
import { isTamperLocked, lockdown } from "@/lib/tamperLock";

const DEBOUNCE_MS = 280;

function channelGatePresent(): boolean {
  return Boolean(document.querySelector(SENSITIVE_GATE_SELECTOR));
}

function confirmGatePresent(): boolean {
  return Boolean(document.querySelector(SENSITIVE_CONFIRM_SELECTOR));
}

/**
 * Kill screen if:
 * - sensitive channel gate was shown (opt-in off) and yeeted via DevTools, or
 * - toggle confirm was armed and its portal vanished without disarm (F12).
 */
export function SensitiveTripwire() {
  useEffect(() => {
    if (getSensitivePreviewsEnabled() || isTamperLocked()) {
      return;
    }

    let seenChannel = false;
    let tripTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const cancelTrip = () => {
      if (tripTimer !== null) {
        clearTimeout(tripTimer);
        tripTimer = null;
      }
    };

    const shouldTrip = () => {
      if (getSensitivePreviewsEnabled()) return false;
      if (channelGatePresent()) return false;
      if (confirmGatePresent()) return false;
      const channelTamper = seenChannel;
      const confirmTamper =
        isSensitiveConfirmArmed() && !confirmGatePresent();
      return channelTamper || confirmTamper;
    };

    const scheduleTrip = () => {
      if (stopped || tripTimer !== null) return;
      tripTimer = setTimeout(() => {
        tripTimer = null;
        if (stopped || isTamperLocked()) return;
        if (!shouldTrip()) return;
        stopped = true;
        observer.disconnect();
        unsubPreview();
        unsubConfirm();
        lockdown("sensitive");
      }, DEBOUNCE_MS);
    };

    const tick = () => {
      if (stopped || isTamperLocked()) return;
      if (getSensitivePreviewsEnabled()) {
        stopped = true;
        cancelTrip();
        observer.disconnect();
        unsubPreview();
        unsubConfirm();
        return;
      }

      if (channelGatePresent()) {
        seenChannel = true;
      }

      if (channelGatePresent() || confirmGatePresent()) {
        cancelTrip();
        return;
      }

      if (seenChannel || isSensitiveConfirmArmed()) {
        scheduleTrip();
      }
    };

    const observer = new MutationObserver(tick);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const unsubPreview = subscribeSensitivePreview(tick);
    const unsubConfirm = subscribeSensitiveConfirm(tick);
    tick();

    return () => {
      stopped = true;
      cancelTrip();
      observer.disconnect();
      unsubPreview();
      unsubConfirm();
    };
  }, []);

  return null;
}
