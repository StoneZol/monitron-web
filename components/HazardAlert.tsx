"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PanelButton } from "@/components/ControlPanel/PanelButton";
import { cn } from "@/lib/utils";

export type HazardAlertTone = "warn" | "danger";

type HazardAlertAction = {
    label: string;
    onClick: () => void;
    /**
     * `true` — always signal + hover glitch (first-visit Run).
     * `"arm"` — muted until hover, then same glitch (risk unlock).
     */
    glitch?: boolean | "arm";
    /** Force signal-green active look (safe dismiss). */
    signal?: boolean;
};

type HazardAlertProps = {
    tone?: HazardAlertTone;
    eyebrow: string;
    title: string;
    children: ReactNode;
    primary: HazardAlertAction;
    secondary: HazardAlertAction;
    /** Backdrop click — usually same as secondary dismiss */
    onDismiss?: () => void;
    maxWidthClass?: string;
    /**
     * Marks this portal as the first-visit consent gate for ConsentTripwire
     * (`data-monitron-consent-gate`).
     */
    consentGate?: string;
};

const TONE: Record<
    HazardAlertTone,
    {
        border: string;
        shadow: string;
        inset: string;
        eyebrow: string;
        title: string;
        rule: string;
        body: string;
        secondary: string;
    }
> = {
    warn: {
        border: "border-warn",
        shadow: "shadow-[4px_4px_0_#8b1a00]",
        inset: "border-warn/40",
        eyebrow: "text-warn/70",
        title: "text-warn",
        rule: "text-warn/50",
        body: "text-warn/90",
        secondary:
            "border-warn/50 text-warn/60 shadow-none hover:border-warn hover:text-warn hover:shadow-[2px_2px_0_#8b1a00] focus-visible:outline-warn",
    },
    danger: {
        border: "border-danger",
        shadow: "shadow-[4px_4px_0_#5c0a12]",
        inset: "border-danger/40",
        eyebrow: "text-danger/70",
        title: "text-danger",
        rule: "text-danger/50",
        body: "text-danger/90",
        secondary:
            "border-danger/45 text-danger/55 shadow-none hover:border-danger hover:text-danger hover:shadow-[2px_2px_0_#5c0a12] focus-visible:outline-danger",
    },
};

function actionClass(
    action: HazardAlertAction,
    fallbackMuted: string,
): string | undefined {
    if (action.glitch === "arm") {
        return "alert-run-glitch-arm focus-visible:outline-danger";
    }
    if (action.glitch === true) {
        return "alert-run-glitch focus-visible:outline-signal";
    }
    if (action.signal) {
        // Signal-green frame, no glitch
        return "alert-safe-btn focus-visible:outline-safe";
    }
    return fallbackMuted;
}

/**
 * Full-viewport hazard dialog — always portaled to `document.body` so header
 * stacking / blur never traps `position: fixed`.
 */
export function HazardAlert({
    tone = "warn",
    eyebrow,
    title,
    children,
    primary,
    secondary,
    onDismiss,
    maxWidthClass = "max-w-xl",
    consentGate,
}: HazardAlertProps) {
    const titleId = useId();
    const bodyId = useId();
    const t = TONE[tone];
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && onDismiss) onDismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onDismiss]);

    // Sibling comments on body — never prepend into React-managed children
    // (that caused removeChild NotFoundError during reconcile).
    useEffect(() => {
        if (!consentGate || !rootRef.current) return;
        const el = rootRef.current;
        const parent = el.parentNode;
        if (!parent) return;
        const notes = [
            " monitron :: Don't mess around here. System does not sleep. ",
        ];
        const nodes = notes.map((text) => document.createComment(text));
        for (const node of nodes) parent.insertBefore(node, el);
        return () => {
            for (const node of nodes) node.remove();
        };
    }, [consentGate]);

    return createPortal(
        <div
            ref={rootRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            {...(consentGate
                ? { "data-monitron-consent-gate": consentGate }
                : {})}
      className="fixed inset-0 z-200 flex items-center justify-center bg-black p-4"
      onClick={onDismiss}
    >
      <div
        className={cn(
          "relative w-full border-2 bg-black p-5 sm:p-7",
          maxWidthClass,
          t.border,
          t.shadow,
        )}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute inset-1 border",
                        t.inset,
                    )}
                />

                <p
                    className={cn(
                        "font-mono text-[10px] uppercase tracking-[0.28em]",
                        t.eyebrow,
                    )}
                >
                    {eyebrow}
                </p>

                <h2
                    id={titleId}
                    className={cn(
                        "mt-4 font-mono text-xl font-semibold uppercase tracking-[0.12em] sm:text-2xl",
                        t.title,
                    )}
                >
                    {title}
                </h2>
                <div
                    className={cn(
                        "mt-2 font-mono text-[10px] tracking-[0.4em]",
                        t.rule,
                    )}
                >
                    ---------------
                </div>

                <div
                    id={bodyId}
                    className={cn(
                        "mt-5 space-y-4 font-mono text-[11px] leading-relaxed tracking-[0.06em] uppercase sm:text-xs",
                        t.body,
                    )}
                >
                    {children}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <PanelButton
                        onClick={primary.onClick}
                        data-text={primary.glitch ? primary.label : undefined}
                        className={actionClass(primary, t.secondary)}
                    >
                        {primary.label}
                    </PanelButton>
                    <PanelButton
                        onClick={secondary.onClick}
                        data-text={secondary.glitch ? secondary.label : undefined}
                        className={actionClass(secondary, t.secondary)}
                    >
                        {secondary.label}
                    </PanelButton>
                </div>
            </div>
        </div>,
        document.body,
    );
}
