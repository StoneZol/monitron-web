import Image from "next/image";
import Link from "next/link";
import type { PlaceholderMeta } from "@/lib/placeholders";

type PlaceholderCardProps = {
  placeholder: PlaceholderMeta;
  index?: number;
};

export function PlaceholderCard({
  placeholder,
  index = 0,
}: PlaceholderCardProps) {
  const channel = String(index + 1).padStart(2, "0");
  const hasPreview = Boolean(placeholder.previewSrc);

  return (
    <Link
      href={placeholder.href}
      className="group relative flex flex-col outline-none"
    >
      <div className="preview-slot relative aspect-16/10 w-full overflow-hidden bg-screen clip-frame transition-[filter] duration-200 group-hover:brightness-125 group-focus-visible:outline group-focus-visible:outline-offset-2 group-focus-visible:outline-signal">
        {hasPreview ? (
          <Image
            src={placeholder.previewSrc!}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 border border-signal/25 group-hover:border-signal/70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,255,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,255,0,0.05) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.22]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.55) 1px, rgba(0,0,0,0.55) 2px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-linear-to-b from-signal/25 to-transparent opacity-0 group-hover:animate-[scan_1.4s_linear_infinite] group-hover:opacity-100"
        />
        <div className="absolute top-2 left-2 z-10 font-mono text-[9px] tracking-[0.2em] text-signal/50 group-hover:text-signal">
          CH-{channel}
        </div>
        <div className="absolute right-2 bottom-2 z-10 font-mono text-[9px] tracking-[0.18em] text-magenta/50 group-hover:text-magenta">
          {hasPreview ? "ON" : "OFF"}
        </div>
        {!hasPreview ? (
          <div className="absolute inset-0 z-5 flex items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted/40 group-hover:text-cyan/70">
              ▌ no_feed
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-start justify-between gap-3 border-t border-dashed border-line pt-2">
        <div>
          <span className="block text-lg font-semibold uppercase leading-none tracking-tight text-ink group-hover:text-signal">
            {placeholder.title}
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            src://s/{placeholder.id}
          </span>
        </div>
        <span className="font-mono text-[10px] text-warn/80">→</span>
      </div>
    </Link>
  );
}
