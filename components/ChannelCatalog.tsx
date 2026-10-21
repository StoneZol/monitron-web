"use client";

import { PlaceholderGrid } from "@/components/PlaceholderGrid";
import type { PlaceholderMeta } from "@/lib/placeholders";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

type ChannelCatalogProps = {
  chapters: readonly PlaceholderMeta[][];
};

function clampChapter(raw: string | null, count: number): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > count) return count;
  return n;
}

function ChapterNav({
  chapterCount,
  chapter,
  hrefFor,
}: {
  chapterCount: number;
  chapter: number;
  hrefFor: (n: number) => string;
}) {
  if (chapterCount <= 1) return null;

  return (
    <nav
      aria-label="Catalog chapters"
      className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]"
    >
      {Array.from({ length: chapterCount }, (_, i) => {
        const n = i + 1;
        const active = n === chapter;
        return (
          <Link
            key={n}
            href={hrefFor(n)}
            scroll={false}
            className={cn(
              "border px-2.5 py-1 transition-colors",
              active
                ? "border-signal text-signal"
                : "border-muted/40 text-muted hover:border-cyan hover:text-cyan",
            )}
            aria-current={active ? "page" : undefined}
          >
            {String(n).padStart(2, "0")}
          </Link>
        );
      })}
    </nav>
  );
}

export function ChannelCatalog({ chapters }: ChannelCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chapterCount = chapters.length;
  const chapter = clampChapter(searchParams.get("ch"), chapterCount);
  const items = chapters[chapter - 1] ?? [];
  const indexOffset = useMemo(
    () =>
      chapters
        .slice(0, chapter - 1)
        .reduce((sum, list) => sum + list.length, 0),
    [chapters, chapter],
  );

  const hrefFor = useMemo(
    () => (n: number) => (n <= 1 ? pathname : `${pathname}?ch=${n}`),
    [pathname],
  );

  useEffect(() => {
    const raw = searchParams.get("ch");
    if (raw == null) return;
    const clamped = clampChapter(raw, chapterCount);
    if (String(clamped) === raw) return;
    router.replace(hrefFor(clamped), { scroll: false });
  }, [chapterCount, hrefFor, router, searchParams]);

  return (
    <section aria-label="Available placeholders">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
          ::channels
          <span className="ml-3 text-muted">
            ch.{String(chapter).padStart(2, "0")}
          </span>
        </h2>

        <ChapterNav
          chapterCount={chapterCount}
          chapter={chapter}
          hrefFor={hrefFor}
        />
      </div>

      <PlaceholderGrid placeholders={items} indexOffset={indexOffset} />

      <div className="mt-8 flex justify-end">
        <ChapterNav
          chapterCount={chapterCount}
          chapter={chapter}
          hrefFor={hrefFor}
        />
      </div>
    </section>
  );
}
