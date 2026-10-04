"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import {
    AUDIO_BAND_COUNT,
    type SpectrumSnap,
} from "./AudioSpectrum.types";

export type { SpectrumSnap } from "./AudioSpectrum.types";
export { emptySpectrumSnap } from "./AudioSpectrum.types";

type AudioSpectrumProps = {
    spectrumRef: RefObject<SpectrumSnap>;
    pluginPresent: boolean;
    className?: string;
};

/**
 * Live bus spectrum for ScreensOverlay — canvas bars + rms/peak rail.
 * Reads spectrumRef every frame (works even when screen reactive is off).
 */
export function AudioSpectrum({
    spectrumRef,
    pluginPresent,
    className,
}: AudioSpectrumProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const peaksRef = useRef<Float32Array>(new Float32Array(AUDIO_BAND_COUNT));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let raf = 0;
        let cssW = 0;
        let cssH = 0;

        const resize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const rect = canvas.getBoundingClientRect();
            cssW = Math.max(1, rect.width);
            cssH = Math.max(1, rect.height);
            canvas.width = Math.floor(cssW * dpr);
            canvas.height = Math.floor(cssH * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = () => {
            const snap = spectrumRef.current;
            const live =
                pluginPresent &&
                snap != null &&
                performance.now() - snap.at < 400;

            ctx.clearRect(0, 0, cssW, cssH);

            ctx.fillStyle = "rgba(3, 4, 5, 0.72)";
            ctx.fillRect(0, 0, cssW, cssH);
            ctx.strokeStyle = "rgba(198, 255, 74, 0.14)";
            ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

            const padX = 10;
            const padTop = 18;
            const padBot = 14;
            const plotW = cssW - padX * 2;
            const plotH = cssH - padTop - padBot;
            const n = AUDIO_BAND_COUNT;
            const gap = 1.5;
            const barW = Math.max(1, (plotW - gap * (n - 1)) / n);
            const peaks = peaksRef.current;

            for (let i = 0; i < n; i++) {
                const raw = live ? Math.max(0, Math.min(1, snap.bands[i] ?? 0)) : 0;
                peaks[i] = Math.max(raw, peaks[i]! * 0.92);
                if (peaks[i]! < 0.02) peaks[i] = 0;

                const h = raw * plotH;
                const ph = peaks[i]! * plotH;
                const x = padX + i * (barW + gap);
                const y = padTop + plotH - h;

                const t = i / (n - 1);
                const r =
                    t < 0.5
                        ? Math.round(0 + 198 * (t * 2))
                        : Math.round(198 + (255 - 198) * ((t - 0.5) * 2));
                const g =
                    t < 0.5
                        ? Math.round(240 + (255 - 240) * (t * 2))
                        : Math.round(255 + (43 - 255) * ((t - 0.5) * 2));
                const b =
                    t < 0.5
                        ? Math.round(255 + (74 - 255) * (t * 2))
                        : Math.round(74 + (214 - 74) * ((t - 0.5) * 2));

                ctx.fillStyle = `rgba(${r},${g},${b},${live ? 0.85 : 0.2})`;
                ctx.fillRect(x, y, barW, h);

                if (ph > 1) {
                    ctx.fillStyle = live
                        ? "rgba(230, 235, 231, 0.9)"
                        : "rgba(230, 235, 231, 0.15)";
                    ctx.fillRect(x, padTop + plotH - ph, barW, 1.5);
                }
            }

            const rms = live ? Math.max(0, Math.min(1, snap.rms)) : 0;
            const peak = live ? Math.max(0, Math.min(1, snap.peak)) : 0;
            const railY = cssH - 6;
            ctx.fillStyle = "rgba(106, 115, 112, 0.45)";
            ctx.fillRect(padX, railY, plotW, 2);
            ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
            ctx.fillRect(padX, railY, plotW * rms, 2);
            ctx.fillStyle = "rgba(255, 90, 54, 0.95)";
            ctx.fillRect(padX + plotW * peak - 1.5, railY - 2, 3, 6);

            raf = requestAnimationFrame(draw);
        };

        resize();
        raf = requestAnimationFrame(draw);
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [pluginPresent, spectrumRef]);

    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-6 sm:pb-4",
                className,
            )}
        >
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-1 flex items-baseline justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.22em]">
                    <span className="text-signal/90">::bus</span>
                    <span className="flex items-center gap-3 text-muted">
                        <span>
                            <span className="text-cyan">rms</span>
                            <span className="mx-1 text-muted/50">/</span>
                            <span className="text-warn">peak</span>
                        </span>
                        <span className={pluginPresent ? "text-signal" : "text-warn"}>
                            {pluginPresent ? "online" : "offline"}
                        </span>
                    </span>
                </div>
                <canvas
                    ref={canvasRef}
                    className="h-16 w-full sm:h-18"
                    aria-hidden
                />
            </div>
        </div>
    );
}
