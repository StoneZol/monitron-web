"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { PlaceholderCredit } from "@/components/SourceCredit";
import { SensitiveCensorMark } from "@/components/SensitiveCensorMark";
import { screenHrefWithVia } from "@/lib/catalogVia";
import {
  COST_META,
  isSensitivePlaceholder,
  resolveCornerTags,
  type PlaceholderMeta,
  type ResolvedPlaceholderTag,
} from "@/lib/placeholders";
import {
  getSensitivePreviewsEnabled,
  subscribeSensitivePreview,
} from "@/lib/sensitivePreview";
import { cn } from "@/lib/utils";

type PlaceholderCardProps = {
  placeholder: PlaceholderMeta;
  index?: number;
  /** When set, screen links keep `?via=ch-NN` so back returns to that chapter. */
  catalogChapter?: number;
};

const TONE_CLASS: Record<ResolvedPlaceholderTag["tone"], string> = {
  signal: "text-signal border-signal",
  warn: "text-warn border-warn",
  cyan: "text-cyan border-cyan",
  magenta: "text-magenta border-magenta",
  danger: "text-danger border-danger",
};

const COST_TONE_CLASS: Record<
  (typeof COST_META)[keyof typeof COST_META]["tone"],
  string
> = {
  signal: "text-signal/80",
  cyan: "text-cyan/80",
  warn: "text-warn/80",
};

function PreviewShell({
  locked,
  href,
  label,
  children,
}: {
  locked: boolean;
  href: string;
  label: string;
  children: ReactNode;
}) {
  if (locked) {
    return (
      <div
        className="relative block cursor-not-allowed outline-none"
        aria-label={label}
        aria-disabled="true"
      >
        {children}
      </div>
    );
  }
  return (
    <Link href={href} className="relative block outline-none" aria-label={label}>
      {children}
    </Link>
  );
}

export function PlaceholderCard({
  placeholder,
  index = 0,
  catalogChapter,
}: PlaceholderCardProps) {
  const channel = String(index + 1).padStart(2, "0");
  const hasPreview = Boolean(placeholder.previewSrc);
  const tags = resolveCornerTags(placeholder);
  const cost = COST_META[placeholder.cost];
  const sensitive = isSensitivePlaceholder(placeholder);
  const revealSensitive = useSyncExternalStore(
    subscribeSensitivePreview,
    getSensitivePreviewsEnabled,
    () => false,
  );
  const locked = sensitive && !revealSensitive;
  const href =
    catalogChapter != null
      ? screenHrefWithVia(placeholder.href, catalogChapter)
      : placeholder.href;

  return (
    <div className="group relative">
      <div className="relative clip-frame">
        <PreviewShell
          locked={locked}
          href={href}
          label={
            locked
              ? `${placeholder.title} (locked — enable sensitive previews in header)`
              : placeholder.title
          }
        >
          <div
            className={cn(
              "preview-slot relative aspect-16/10 w-full overflow-hidden bg-screen transition-[filter] duration-200 group-focus-visible:outline group-focus-visible:outline-offset-2 group-focus-visible:outline-signal",
              locked
                ? "group-hover:brightness-100"
                : "group-hover:brightness-110",
            )}
          >
            {hasPreview ? (
              <Image
                src={placeholder.previewSrc!}
                alt=""
                fill
                className={cn(
                  "object-cover transition-[filter] duration-300",
                  locked &&
                    "scale-105 blur-md saturate-[0.35] brightness-[0.32] group-hover:brightness-[0.58] group-hover:saturate-[0.65]",
                )}
                loading="eager"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : null}

            {locked ? (
              <div className="sensitive-censor-veil absolute inset-0 z-15 flex items-center justify-center">
                <SensitiveCensorMark />
              </div>
            ) : null}

            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-10 border",
                locked
                  ? "border-danger/70"
                  : "border-signal/35 group-hover:border-signal/80",
              )}
            />

            {!hasPreview ? (
              <div className="absolute inset-0 z-5 flex items-center justify-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted/40 group-hover:text-cyan/70">
                  ▌ no_feed
                </span>
              </div>
            ) : null}
          </div>
        </PreviewShell>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/70 via-black/25 to-transparent"
          />
          <div className="credit-rail relative mx-2.5 mt-2.5 font-mono uppercase tracking-[0.18em]">
            <div className="flex items-baseline gap-2">
              <span className="text-[9px] text-signal">CH-{channel}</span>
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/95 via-black/60 to-transparent"
          />
          <div
            className={cn(
              "relative mx-2.5 mb-2.5 pt-8",
              locked ? "pointer-events-none" : "pointer-events-auto",
            )}
          >
            <PlaceholderCredit meta={placeholder} variant="rail" />
          </div>
        </div>
      </div>

      {locked ? (
        <div
          className="mt-2 flex items-start justify-between gap-3 border-t border-dashed border-danger/40 pt-2"
          aria-disabled="true"
        >
          <div>
            <span className="block text-lg font-semibold uppercase leading-none tracking-tight text-muted">
              {placeholder.title}
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-danger/70">
              locked · sensitive previews off
            </span>
          </div>
          <span className="font-mono text-[10px] text-danger/50">✕</span>
        </div>
      ) : (
        <Link
          href={href}
          className="mt-2 flex items-start justify-between gap-3 border-t border-dashed border-line pt-2 outline-none"
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
      )}
    </div>
  );
}
