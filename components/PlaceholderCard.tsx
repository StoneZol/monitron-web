"use client";

import Image from "next/image";
import Link from "next/link";
import { PlaceholderCredit } from "@/components/SourceCredit";
import {
    COST_META,
    resolveCornerTags,
    type PlaceholderMeta,
    type ResolvedPlaceholderTag,
} from "@/lib/placeholders";
import { cn } from "@/lib/utils";

type PlaceholderCardProps = {
    placeholder: PlaceholderMeta;
    index?: number;
};

const TONE_CLASS: Record<ResolvedPlaceholderTag["tone"], string> = {
    signal: "text-signal border-signal",
    warn: "text-warn border-warn",
    cyan: "text-cyan border-cyan",
    magenta: "text-magenta border-magenta",
};

const COST_TONE_CLASS: Record<
    (typeof COST_META)[keyof typeof COST_META]["tone"],
    string
> = {
    signal: "text-signal/80",
    cyan: "text-cyan/80",
    warn: "text-warn/80",
};

export function PlaceholderCard({
    placeholder,
    index = 0,
}: PlaceholderCardProps) {
    const channel = String(index + 1).padStart(2, "0");
    const hasPreview = Boolean(placeholder.previewSrc);
    const tags = resolveCornerTags(placeholder);
    const cost = COST_META[placeholder.cost];

    return (
        <div className="relative">
            <div className="group relative clip-frame">
                <Link
                    href={placeholder.href}
                    className="relative block outline-none"
                    aria-label={placeholder.title}
                >
                    <div className="preview-slot relative aspect-16/10 w-full overflow-hidden bg-screen transition-[filter] duration-200 group-hover:brightness-110 group-focus-visible:outline group-focus-visible:outline-offset-2 group-focus-visible:outline-signal">
                        {hasPreview ? (
                            <Image
                                src={placeholder.previewSrc!}
                                alt=""
                                fill
                                className="object-cover"
                                loading="eager"
                                sizes="(max-width: 768px) 100vw, 33vw"
                            />
                        ) : null}

                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-10 border border-signal/35 group-hover:border-signal/80"
                        />

                        {!hasPreview ? (
                            <div className="absolute inset-0 z-5 flex items-center justify-center">
                                <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted/40 group-hover:text-cyan/70">
                                    ▌ no_feed
                                </span>
                            </div>
                        ) : null}
                    </div>
                </Link>

                {/* CH + ON + load — same language as credit rail */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
                    <div
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/70 via-black/25 to-transparent"
                    />
                    <div className="credit-rail relative mx-2.5 mt-2.5 font-mono uppercase tracking-[0.18em]">
                        <div className="flex items-baseline gap-2">
                            <span className="text-[9px] text-signal">
                                CH-{channel}
                            </span>
                            <span
                                className={cn(
                                    "text-[9px]",
                                    hasPreview ? "text-magenta" : "text-muted",
                                )}
                            >
                                {hasPreview ? "ON" : "OFF"}
                            </span>
                        </div>
                        <span
                            className={cn(
                                "mt-0.5 block text-[8px]",
                                COST_TONE_CLASS[cost.tone],
                            )}
                            title={cost.title}
                        >
                            load {cost.label}
                        </span>
                    </div>
                </div>

                {/* Tags — classic stamps */}
                {tags.length ? (
                    <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                title={tag.title}
                                className={cn(
                                    "stamp px-1.5 py-0.5 text-[8px] tracking-[0.2em]",
                                    TONE_CLASS[tag.tone],
                                )}
                            >
                                {tag.label}
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* Credits over preview — full-width bottom veil; rail inset from frame */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
                    <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/95 via-black/60 to-transparent"
                    />
                    <div className="pointer-events-auto relative mx-2.5 mb-2.5 pt-8">
                        <PlaceholderCredit
                            meta={placeholder}
                            variant="rail"
                        />
                    </div>
                </div>
            </div>

            <Link
                href={placeholder.href}
                className="group mt-2 flex items-start justify-between gap-3 border-t border-dashed border-line pt-2 outline-none"
            >
                <div>
                    <span className="block text-lg font-semibold uppercase leading-none tracking-tight text-ink group-hover:text-signal">
                        {placeholder.title}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                        src://s/{placeholder.id}
                    </span>
                </div>
                <span className="font-mono text-[10px] text-warn/80">→</span>
            </Link>
        </div>
    );
}
