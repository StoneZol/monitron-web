import { PlaceholderGrid } from "@/components/PlaceholderGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { panelButtonClassName } from "@/components/ControlPanel/PanelButton";
import { PLUGIN_URL } from "@/lib/audioBus";
import { placeholders } from "@/lib/placeholders";
import { PLUGIN_VERSION, SITE_VERSION } from "@/lib/versions";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
    return (
        <div className="atmosphere relative flex min-h-full flex-1 flex-col overflow-x-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute top-24 -right-4 z-10 hidden rotate-12 select-none sm:block"
            >
                <div className="stamp px-3 py-2 text-[10px]">bootleg feed</div>
            </div>

            <p
                aria-hidden
                className="pointer-events-none absolute bottom-28 left-3 z-10 hidden origin-bottom-left -rotate-90 font-mono text-[10px] uppercase tracking-[0.35em] text-muted/60 md:block"
            >
                monitron::underground_av
            </p>

            <main className="relative z-10 flex w-full flex-1 flex-col px-4 pb-16 pt-10 sm:px-8 sm:pt-14 lg:px-12">
                <header className="relative mb-14 max-w-4xl sm:mb-20">
                    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                        <span className="text-warn">rec</span>
                        <span className="text-muted">/</span>
                        <span>ch.00</span>
                        <span className="text-muted">/</span>
                        <span className="text-cyan">illegal_idle</span>
                        <span className="text-muted">/</span>
                        <span>
                            <span className="text-signal/80">web</span>{" "}
                            {SITE_VERSION}
                        </span>
                        <span className="text-muted">/</span>
                        <span>
                            <span className="text-cyan/80">plugin</span>{" "}
                            {PLUGIN_VERSION}
                        </span>
                    </div>

                    <h1
                        className="brand-glitch text-[clamp(3.5rem,14vw,9rem)] font-bold leading-[0.82]"
                        data-text="MONITRON"
                    >
                        MONITRON
                        <span className="brand-glitch-extra" aria-hidden>
                            MONITRON
                        </span>
                    </h1>

                    <div className="mt-8 flex flex-col gap-5 sm:mt-10 sm:flex-row sm:items-end sm:justify-between">
                        <p className="max-w-md text-sm leading-snug text-muted sm:text-base">
                            Full-screen generative savers for idle monitors.
                            <span className="mt-1.5 block text-ink/80">
                                Chrome extension grabs tab audio — bass, mid,
                                high, beat — and drives the picture. No
                                dashboard. Just signal.
                            </span>
                        </p>
                        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                            <a
                                href={PLUGIN_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    panelButtonClassName,
                                    "group gap-2",
                                )}
                            >
                                <span className="text-muted group-hover:text-magenta">
                                    src://
                                </span>
                                plugin
                                <span aria-hidden className="text-cyan">
                                    →
                                </span>
                            </a>
                            <Link
                                href="/guide"
                                className={cn(
                                    panelButtonClassName,
                                    "group gap-2",
                                )}
                            >
                                <span className="text-muted group-hover:text-magenta">
                                    src://
                                </span>
                                guide
                                <span aria-hidden className="text-cyan">
                                    →
                                </span>
                            </Link>
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-magenta/80">
                                [ dump /{" "}
                                {String(placeholders.length).padStart(2, "0")} ]
                            </p>
                        </div>
                    </div>

                    <div
                        aria-hidden
                        className="mt-8 h-px w-full bg-linear-to-r from-signal via-magenta/60 to-transparent"
                    />
                </header>

                <section aria-label="Available placeholders">
                    <div className="mb-6">
                        <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
                            ::channels
                        </h2>
                    </div>

                    <PlaceholderGrid placeholders={placeholders} />
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
