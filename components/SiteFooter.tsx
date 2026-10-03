import Link from "next/link";
import { PLUGIN_URL } from "@/lib/audioBus";
import { panelButtonClassName } from "@/components/ControlPanel/PanelButton";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "relative z-10 mt-auto border-t border-line/60 px-4 py-8 sm:px-8 lg:px-12",
        className,
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-signal">
            ::monitron
          </p>
          <p className="max-w-sm text-sm leading-snug text-muted">
            Bootleg generative signals for idle monitors.
          </p>
        </div>

        <nav
          aria-label="Site"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em]"
        >
          <Link
            href="/"
            className="text-muted transition-colors hover:text-signal"
          >
            home
          </Link>
          <span className="text-muted/40" aria-hidden>
            /
          </span>
          <Link
            href="/guide"
            className="text-muted transition-colors hover:text-signal"
          >
            guide
          </Link>
          <span className="text-muted/40" aria-hidden>
            /
          </span>
          <a
            href={PLUGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              panelButtonClassName,
              "gap-1.5 px-2 py-1 text-[10px]",
            )}
          >
            plugin
            <span aria-hidden className="text-cyan">
              →
            </span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
