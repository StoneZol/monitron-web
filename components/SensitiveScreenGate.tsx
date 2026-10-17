"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { panelButtonClassName } from "@/components/ControlPanel/PanelButton";
import { SensitivePreviewToggle } from "@/components/SensitivePreviewToggle";
import {
  SENSITIVE_GATE_ATTR,
  SENSITIVE_GATE_ID,
} from "@/lib/sensitiveGate";
import {
  getSensitivePreviewsEnabled,
  subscribeSensitivePreview,
} from "@/lib/sensitivePreview";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

type SensitiveScreenGateProps = {
  screenTitle?: string;
  children: ReactNode;
};

function GateFace({ screenTitle }: { screenTitle?: string }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2 border-2 border-danger/45"
      />

      <p className="relative z-1 font-mono text-[10px] uppercase tracking-[0.28em] text-danger/70">
        !LOCKED // SENSITIVE_CHANNEL!
      </p>

      <h1
        id="sensitive-gate-title"
        className="relative z-1 mt-5 font-mono text-2xl font-semibold uppercase tracking-[0.16em] text-danger sm:text-3xl"
      >
        sensitive
      </h1>

      <p className="relative z-1 mt-6 font-mono text-[11px] leading-relaxed tracking-[0.06em] text-danger/90 uppercase sm:text-xs">
        {screenTitle ? (
          <>
            <span className="text-ink">{screenTitle}</span> is marked
            sensitive. Flip the toggle yourself — hazard alert + this gate. You
            opt in; that&apos;s on you.
          </>
        ) : (
          <>
            This channel is marked sensitive. Flip the toggle yourself — hazard
            alert + this gate. You opt in; that&apos;s on you.
          </>
        )}
      </p>

      <div className="relative z-1 mt-7 border-2 border-danger/40 bg-black/40 px-3 py-3">
        <SensitivePreviewToggle />
      </div>

      <div className="relative z-1 mt-7">
        <Link href="/" className={cn(panelButtonClassName, "inline-flex gap-2")}>
          <span className="text-muted">src://</span>
          home
          <span aria-hidden className="text-cyan">
            →
          </span>
        </Link>
      </div>
    </>
  );
}

function GatePlate({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative border-4 border-danger bg-black/85 p-7 shadow-[8px_8px_0_#5c0a12] sm:p-9",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Hard gate for screens tagged `sensitive`. Direct URL still needs the header
 * toggle — same opt-in as the catalog censor. Children do not mount until open.
 */
export function SensitiveScreenGate({
  screenTitle,
  children,
}: SensitiveScreenGateProps) {
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
    return <div className="fixed inset-0 z-50 bg-black" aria-hidden />;
  }

  if (enabled) return children;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sensitive-gate-title"
      {...{ [SENSITIVE_GATE_ATTR]: SENSITIVE_GATE_ID }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
    >
      <div className="sensitive-frame-glitch relative w-full max-w-lg">
        <GatePlate
          className="sensitive-frame-glitch__ghost sensitive-frame-glitch__ghost--magenta"
          aria-hidden
        >
          <GateFace screenTitle={screenTitle} />
        </GatePlate>
        <GatePlate
          className="sensitive-frame-glitch__ghost sensitive-frame-glitch__ghost--cyan"
          aria-hidden
        >
          <GateFace screenTitle={screenTitle} />
        </GatePlate>
        <GatePlate className="sensitive-frame-glitch__body">
          <GateFace screenTitle={screenTitle} />
        </GatePlate>
      </div>
    </div>
  );
}
