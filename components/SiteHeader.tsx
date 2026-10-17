"use client";

import Link from "next/link";
import { SensitivePreviewToggle } from "@/components/SensitivePreviewToggle";
import { PLUGIN_URL, WEB_URL } from "@/lib/audioBus";
import { PLUGIN_VERSION, SITE_VERSION } from "@/lib/versions";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  className?: string;
};

/** Slim top chrome for catalog / guide — carries the sensitive-preview gate. */
export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "relative z-30 border-b border-line/50 bg-bg/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-8 lg:px-12">
        <nav
          aria-label="Site"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.22em]"
        >
          <Link
            href="/"
            className="text-signal transition-colors hover:text-cyan"
          >
            monitron
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
            href={WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted/70 transition-colors hover:text-signal"
            title="monitron-web on GitHub"
          >
            <span className="text-signal/80">web</span> {SITE_VERSION}
          </a>
          <span className="text-muted/40" aria-hidden>
            /
          </span>
          <a
            href={PLUGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted/70 transition-colors hover:text-cyan"
            title="monitron-plugin on GitHub"
          >
            <span className="text-cyan/80">plugin</span> {PLUGIN_VERSION}
          </a>
        </nav>

        <SensitivePreviewToggle />
      </div>
    </header>
  );
}
