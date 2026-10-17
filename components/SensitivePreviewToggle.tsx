"use client";

import { useState, useSyncExternalStore } from "react";
import { HazardAlert } from "@/components/HazardAlert";
import {
  armSensitiveConfirm,
  disarmSensitiveConfirm,
  SENSITIVE_CONFIRM_GATE_ID,
} from "@/lib/sensitiveGate";
import {
  getSensitivePreviewsEnabled,
  setSensitivePreviewsEnabled,
  subscribeSensitivePreview,
} from "@/lib/sensitivePreview";
import { cn } from "@/lib/utils";

type SensitivePreviewToggleProps = {
  className?: string;
};

const subscribeNoop = () => () => {};

/**
 * Header control: off (default) = censor + lock sensitive channels;
 * on = show stills and allow open. Turning on requires a final confirm.
 */
export function SensitivePreviewToggle({
  className,
}: SensitivePreviewToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const enabled = useSyncExternalStore(
    subscribeSensitivePreview,
    getSensitivePreviewsEnabled,
    () => false,
  );

  if (!isClient) {
    return (
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.2em] text-muted/50",
          className,
        )}
      >
        sensitive previews
      </span>
    );
  }

  const closeConfirm = () => {
    disarmSensitiveConfirm();
    setConfirmOpen(false);
  };

  const requestEnable = () => {
    if (enabled) {
      setSensitivePreviewsEnabled(false);
      return;
    }
    armSensitiveConfirm();
    setConfirmOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={requestEnable}
        className={cn(
          "group inline-flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] outline-none",
          "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-danger",
          className,
        )}
        title={
          enabled
            ? "Sensitive channels unlocked — click to lock again"
            : "Sensitive channels locked — click to unlock (final warning)"
        }
        aria-pressed={enabled}
      >
        <span
          aria-hidden
          className={cn(
            "relative h-3.5 w-6 shrink-0 border transition-colors",
            enabled
              ? "border-danger bg-danger/25"
              : "border-muted/50 bg-screen group-hover:border-danger/60",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-2 w-2 bg-muted transition-all",
              enabled && "left-3 bg-danger",
            )}
          />
        </span>
        <span
          className={cn(
            "transition-colors",
            enabled ? "text-danger" : "text-muted group-hover:text-ink/80",
          )}
        >
          sensitive previews
        </span>
      </button>

      {confirmOpen ? (
        <HazardAlert
          tone="danger"
          consentGate={SENSITIVE_CONFIRM_GATE_ID}
          eyebrow="!FINAL_GATE // LAST_WARNING!"
          title="Really unlock sensitive?"
          maxWidthClass="max-w-md"
          onDismiss={closeConfirm}
          primary={{
            label: "I own it — unlock",
            onClick: () => {
              disarmSensitiveConfirm();
              setSensitivePreviewsEnabled(true);
              setConfirmOpen(false);
            },
            glitch: "arm",
          }}
          secondary={{
            label: "Keep locked",
            onClick: closeConfirm,
            signal: true,
          }}
        >
          <p>
            Hazard alert already hit you. This is the last warning before
            previews and channels marked sensitive open up.
          </p>
          <p>
            If you are this insistent — do not come back complaining that your
            feelings got hurt, that you were offended, or that the mood wrecked
            your day. You own that.
          </p>
          <p className="text-danger">
            Own the consequences. Toggle only if you mean it.
          </p>
        </HazardAlert>
      ) : null}
    </>
  );
}
