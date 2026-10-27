"use client";

import {
    createContext,
    Suspense,
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useScreensOverlay } from "@/components/ScreensOverlay/ScreensOverlay.context";
import { NavBackButton } from "@/components/NavBackButton";
import { VisualPipButton } from "@/components/VisualPipButton";
import { ScreenTitleCredit } from "@/components/SourceCredit";
import { placeholders } from "@/lib/placeholders";
import {
    readPanelSections,
    writePanelSection,
} from "@/lib/screenPrefs";
import {
    applyScreenShare,
    encodeScreenShare,
    type ShareDecodeError,
} from "@/lib/screenShare";
import { FieldInfo } from "./FieldInfo";
import { PanelButton } from "./PanelButton";
import { Slider } from "./Slider";
import { useRenderScale } from "@/lib/renderScale";

type ControlPanelProps = {
    title: string;
    children: ReactNode;
    /** Restores screen defaults — sits beside render scale */
    onReset?: () => void;
    /** Toggle document fullscreen — lives in chrome `mode` with PiP */
    onFullscreen?: () => void;
    className?: string;
};

const SHARE_FLASH: Record<ShareDecodeError | "copied" | "fail", string> = {
    copied: "copied",
    empty: "empty",
    format: "bad key",
    screen: "wrong screen",
    decrypt: "bad key",
    fail: "fail",
};

/** Same hit area for text chrome + window icons. */
const chromeBtnClass = "h-9 min-w-0 flex-1 px-1.5 py-0";

function ChromePair({
    label,
    info,
    status,
    children,
}: {
    label: string;
    info: string;
    status?: string | null;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-1 border border-line/50 p-1">
            <div className="flex items-center gap-1 px-0.5">
                <span className="text-[8px] uppercase tracking-[0.22em] text-muted">
                    {label}
                </span>
                <FieldInfo text={info} />
                {status ? (
                    <span className="ml-auto text-[8px] uppercase tracking-[0.18em] text-cyan">
                        {status}
                    </span>
                ) : null}
            </div>
            <div className="flex w-full items-stretch gap-1 *:min-w-0 *:flex-1">
                {children}
            </div>
        </div>
    );
}

export function ControlPanel({
    title,
    children,
    onReset,
    onFullscreen,
    className,
}: ControlPanelProps) {
    const overlay = useScreensOverlay();
    const [shareFlash, setShareFlash] = useState<string | null>(null);
    const flashTimer = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
        };
    }, []);

    const flash = (msg: string) => {
        setShareFlash(msg);
        if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setShareFlash(null), 1400);
    };

    const onCopyShare = async () => {
        if (!overlay) return;
        try {
            const key = encodeScreenShare(overlay.screenId);
            await navigator.clipboard.writeText(key);
            flash(SHARE_FLASH.copied);
        } catch {
            flash(SHARE_FLASH.fail);
        }
    };

    const onPasteShare = async () => {
        if (!overlay) return;
        try {
            const text = await navigator.clipboard.readText();
            const result = applyScreenShare(overlay.screenId, text);
            if (!result.ok) {
                flash(SHARE_FLASH[result.error]);
                return;
            }
            window.location.reload();
        } catch {
            flash(SHARE_FLASH.fail);
        }
    };

    const placeholder = overlay
        ? placeholders.find((p) => p.id === overlay.screenId)
        : undefined;

    return (
        <div
            className={cn(
                "flex max-h-[min(88vh,820px)] w-full flex-col border border-signal bg-screen/85 font-mono text-signal shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm",
                className,
            )}
        >
            <div className="flex shrink-0 flex-col gap-1.5 border-b border-line p-2">
                {/* Title full width + reset; display/preset share the next row */}
                <div className="flex w-full items-center gap-2">
                    {overlay ? (
                        <Suspense fallback={<NavBackButton href="/" />}>
                            <NavBackButton />
                        </Suspense>
                    ) : null}
                    {placeholder ? (
                        <ScreenTitleCredit title={title} meta={placeholder} />
                    ) : (
                        <span className="min-w-0 flex-1 text-start text-sm uppercase tracking-[0.28em]">
                            {title}
                        </span>
                    )}
                    {onReset ? (
                        <PanelButton
                            onClick={onReset}
                            className="h-9 shrink-0 px-2.5 py-0"
                            title="Reset look + fx to defaults"
                        >
                            reset
                        </PanelButton>
                    ) : null}
                </div>
                {overlay ? (
                    <div className="grid w-full grid-cols-3 gap-1.5">
                        <ChromePair
                            label="sync"
                            info="Sync pushes prefs to other tabs of this same screen. Follow soft-navigates every open Monitron tab onto this screen (App Router — fullscreen stays) and applies the look."
                        >
                            <PanelButton
                                onClick={overlay.sync}
                                disabled={!overlay.hasPeers}
                                className={chromeBtnClass}
                                title="Sync same screen"
                                aria-label="Sync same screen"
                            >
                                sync
                            </PanelButton>
                            <PanelButton
                                onClick={overlay.follow}
                                disabled={!overlay.hasSitePeers}
                                className={chromeBtnClass}
                                title="Follow — all tabs → this screen"
                                aria-label="Follow — all tabs to this screen"
                            >
                                follow
                            </PanelButton>
                        </ChromePair>
                        <ChromePair
                            label="preset"
                            info="Copy seals current look knobs + fx overlay into a monitron key (clipboard). Paste reads a key for this screen, applies it, and reloads. HUD fold state is not shared."
                            status={shareFlash}
                        >
                            <PanelButton
                                onClick={onCopyShare}
                                className={chromeBtnClass}
                            >
                                copy
                            </PanelButton>
                            <PanelButton
                                onClick={onPasteShare}
                                className={chromeBtnClass}
                            >
                                paste
                            </PanelButton>
                        </ChromePair>
                        <ChromePair
                            label="window"
                            info="Minimize hides the HUD (tap empty scene to wake). Maximize is fullscreen. PiP floats the visual (Chromium)."
                        >
                            <PanelButton
                                onClick={overlay.hide}
                                className={chromeBtnClass}
                                title="Hide controls"
                                aria-label="Hide controls"
                            >
                                <svg
                                    viewBox="0 0 12 12"
                                    className="size-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.35"
                                    aria-hidden
                                >
                                    <path d="M2.5 9.25h7" />
                                </svg>
                            </PanelButton>
                            {onFullscreen ? (
                                <PanelButton
                                    onClick={onFullscreen}
                                    className={chromeBtnClass}
                                    title="Fullscreen"
                                    aria-label="Fullscreen"
                                >
                                    <svg
                                        viewBox="0 0 12 12"
                                        className="size-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.25"
                                        aria-hidden
                                    >
                                        <rect x="2" y="2" width="8" height="8" />
                                    </svg>
                                </PanelButton>
                            ) : null}
                            <VisualPipButton className={chromeBtnClass} />
                        </ChromePair>
                    </div>
                ) : null}
            </div>
            {overlay ? <RenderScaleChrome /> : null}
            <div className="control-panel-scroll control-panel-sections min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-2">
                {children}
            </div>
        </div>
    );
}

/** Fixed above the scroll body — first place to cut GPU on every screen. */
function RenderScaleChrome() {
    const overlay = useScreensOverlay();
    const renderScale = useRenderScale(overlay?.screenId);
    return (
        <div className="shrink-0 border-b border-line px-2 py-1.5">
            <Slider
                label="Render scale"
                value={renderScale.scale}
                min={renderScale.min}
                max={renderScale.max}
                step={renderScale.step}
                onChange={renderScale.setScale}
                format={(v) => `${Math.round(v * 100)}%`}
                info="Internal buffer resolution for this screen. Default 50% ≈ half the pixels / GPU load. 100% = full native look. Slider is shared chrome; the value is saved per screen."
                className="w-full sm:max-w-none"
            />
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
    /**
     * Trailing chrome in the fold header (e.g. visualizer source).
     * Clicks do not toggle the section. Cap width from the caller.
     */
    headerExtra?: ReactNode;
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
    headerExtra,
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
                "flex min-w-0 flex-col self-start",
                /* Nested folds = wrap chips; grow fills a short last row.
                   @container drives ControlCluster `cols` (2-up when wide). */
                isSub &&
                    /* No overflow-hidden — clips Select dropdowns inside the chip */
                    "@container w-full max-w-full basis-full sm:min-w-62 sm:flex-1 sm:basis-62",
                isSub ? "border border-line/30" : "border border-line/50",
                className,
            )}
        >
            <div
                className={cn(
                    "flex min-w-0 items-center gap-1",
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
                        "flex min-w-0 shrink items-center gap-1.5 text-left uppercase transition-colors",
                        "focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-signal",
                        isSub
                            ? "py-0.5 text-[8px] tracking-[0.2em]"
                            : "py-1 text-[9px] tracking-[0.24em]",
                        open ? "text-signal" : "text-muted hover:text-signal/80",
                    )}
                >
                    <span
                        className={cn(
                            "inline-flex shrink-0 items-center justify-center text-magenta",
                            isSub ? "size-3.5" : "size-4",
                        )}
                        aria-hidden
                    >
                        <svg
                            viewBox="0 0 12 12"
                            className="size-full"
                            fill="currentColor"
                        >
                            {open ? (
                                <path d="M2 4.5 L6 8.5 L10 4.5" />
                            ) : (
                                <path d="M4.5 2 L8.5 6 L4.5 10" />
                            )}
                        </svg>
                    </span>
                    <span className="truncate">{label}</span>
                </button>
                {info ? <FieldInfo text={info} /> : null}
                {headerExtra ? (
                    <div
                        className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        {headerExtra}
                    </div>
                ) : null}
            </div>
            {open ? (
                <PanelSectionPathContext.Provider value={sectionId}>
                    <div
                        id={panelDomId}
                        className={cn(
                            isSub
                                ? /* Stack clusters; beat fieldRoot sm:max-w so knobs fill the chip */
                                  "flex w-full flex-col gap-1.5 px-1 py-1 *:max-w-none!"
                                : /* Category: wrap subsection chips; orphans flex-grow to fill */
                                  "flex flex-row flex-wrap content-start items-start gap-1.5 px-1.5 py-1.5",
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
    headerExtra?: ReactNode;
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
    defaultOpen = true,
    ...props
}: ControlSubSectionProps) {
    return <PanelFold {...props} depth="sub" defaultOpen={defaultOpen} />;
}
