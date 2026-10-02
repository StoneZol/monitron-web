"use client";

import {
    createContext,
    useContext,
    useId,
    useState,
    type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useScreensOverlay } from "@/components/ScreensOverlay/ScreensOverlay.context";
import {
    readPanelSections,
    writePanelSection,
} from "@/lib/screenPrefs";
import { FieldInfo } from "./FieldInfo";
import { PanelButton } from "./PanelButton";

type ControlPanelProps = {
    title: string;
    children: ReactNode;
    /** Fixed under the title — outside the scroll body (back / reset / fullscreen) */
    actions?: ReactNode;
    className?: string;
};

export function ControlPanel({
    title,
    children,
    actions,
    className,
}: ControlPanelProps) {
    const overlay = useScreensOverlay();

    return (
        <div
            className={cn(
                "flex h-[min(80vh,720px)] flex-col border border-signal bg-screen/85 font-mono text-signal shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm",
                className,
            )}
        >
            <div className="flex shrink-0 flex-col items-center gap-1.5 border-b border-line p-2">
                <span className="w-full text-start text-sm uppercase tracking-[0.28em]">
                    {title}
                </span>
                {overlay ? (
                    <div className="flex w-full items-center justify-end gap-1.5">
                        {overlay.hasPeers ? (
                            <PanelButton
                                onClick={overlay.sync}
                                className="flex-1 p-1"
                            >
                                sync
                            </PanelButton>
                        ) : null}
                        <PanelButton onClick={overlay.hide} className="flex-1 p-1">
                            hide
                        </PanelButton>
                    </div>
                ) : null}
            </div>
            {actions ? (
                <div className="shrink-0 border-b border-line p-2">
                    {actions}
                </div>
            ) : null}
            <div className="control-panel-scroll min-h-0 flex-1 flex flex-col gap-1.5 overflow-x-hidden overflow-y-auto overscroll-contain p-2">
                {children}
            </div>
        </div>
    );
}

/** Parent path for nested `_panelSections` keys (`look` → `look/sky`). */
const PanelSectionPathContext = createContext("");

type FoldProps = {
    label: string;
    children: ReactNode;
    info?: string;
    className?: string;
    sectionId?: string;
    defaultOpen?: boolean;
    /** Visual depth — top section vs nested layer */
    depth?: "section" | "sub";
};

function initialSectionOpen(
    screenId: string | null,
    sectionId: string,
    defaultOpen: boolean,
): boolean {
    if (typeof window === "undefined" || !screenId) return defaultOpen;
    const stored = readPanelSections(screenId);
    return sectionId in stored ? Boolean(stored[sectionId]) : defaultOpen;
}

function PanelFold({
    label,
    children,
    info,
    className,
    sectionId: sectionIdProp,
    defaultOpen = true,
    depth = "section",
}: FoldProps) {
    const overlay = useScreensOverlay();
    const screenId = overlay?.screenId ?? null;
    const parentPath = useContext(PanelSectionPathContext);
    const localId = sectionIdProp ?? label;
    const sectionId = parentPath ? `${parentPath}/${localId}` : localId;
    const panelDomId = useId();

    const [open, setOpen] = useState(() =>
        initialSectionOpen(screenId, sectionId, defaultOpen),
    );

    const toggle = () => {
        setOpen((prev) => {
            const next = !prev;
            if (screenId) writePanelSection(screenId, sectionId, next);
            return next;
        });
    };

    const isSub = depth === "sub";

    return (
        <section
            className={cn(
                "flex flex-col",
                isSub ? "border border-line/30" : "border border-line/50",
                className,
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-1",
                    isSub
                        ? "border-b border-line/25 px-1 py-0"
                        : "border-b border-line/40 px-1.5 py-0.5",
                )}
            >
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelDomId}
                    onClick={toggle}
                    className={cn(
                        "flex min-w-0 flex-1 items-center gap-1.5 text-left uppercase transition-colors",
                        "focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-signal",
                        isSub
                            ? "py-0.5 text-[8px] tracking-[0.2em]"
                            : "py-1 text-[9px] tracking-[0.24em]",
                        open ? "text-signal" : "text-muted hover:text-signal/80",
                    )}
                >
                    <span
                        className={cn(
                            "shrink-0 text-magenta",
                            isSub ? "w-1.5" : "w-2",
                        )}
                        aria-hidden
                    >
                        {open ? "▾" : "▸"}
                    </span>
                    <span className="truncate">{label}</span>
                </button>
                {info ? <FieldInfo text={info} /> : null}
            </div>
            {open ? (
                <PanelSectionPathContext.Provider value={sectionId}>
                    <div
                        id={panelDomId}
                        className={cn(
                            "flex flex-col",
                            isSub ? "gap-1 px-1 py-1" : "gap-1.5 px-1.5 py-1.5",
                        )}
                    >
                        {children}
                    </div>
                </PanelSectionPathContext.Provider>
            ) : null}
        </section>
    );
}

type ControlSectionProps = {
    label: string;
    children: ReactNode;
    info?: string;
    className?: string;
    sectionId?: string;
    defaultOpen?: boolean;
};

/** Top-level panel fold — persists as `_panelSections[id]`. */
export function ControlSection(props: ControlSectionProps) {
    return <PanelFold {...props} depth="section" />;
}

type ControlSubSectionProps = ControlSectionProps;

/**
 * Nested fold under a ControlSection (or another sub).
 * Storage key = `parent/child` (e.g. `look/sky`).
 */
export function ControlSubSection({
    defaultOpen = false,
    ...props
}: ControlSubSectionProps) {
    return <PanelFold {...props} depth="sub" defaultOpen={defaultOpen} />;
}
