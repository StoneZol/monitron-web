import { PlaceholderCard } from "@/components/PlaceholderCard";
import { placeholders } from "@/lib/placeholders";

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
                className="pointer-events-none absolute bottom-8 left-3 z-10 hidden origin-bottom-left -rotate-90 font-mono text-[10px] uppercase tracking-[0.35em] text-muted/60 md:block"
            >
                monitron::underground_av
            </p>

            <main className="relative z-10 flex w-full flex-1 flex-col px-4 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
                <header className="relative mb-14 max-w-4xl sm:mb-20">
                    <div className="animate-rise mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                        <span className="text-warn">rec</span>
                        <span className="text-muted">/</span>
                        <span>ch.00</span>
                        <span className="text-muted">/</span>
                        <span className="text-cyan">illegal_idle</span>
                    </div>

                    <h1
                        className="brand-glitch animate-rise text-[clamp(3.5rem,14vw,9rem)] font-bold leading-[0.82]"
                        data-text="MONITRON"
                        style={{ animationDelay: "40ms" }}
                    >
                        MONITRON
                        <span className="brand-glitch-extra" aria-hidden>
                            MONITRON
                        </span>
                    </h1>

                    <div
                        className="animate-rise mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-end sm:justify-between"
                        style={{ animationDelay: "100ms" }}
                    >
                        <p className="max-w-sm text-sm leading-snug text-muted sm:text-base">
                            Generative techno abstractions for dead screens.
                            <span className="mt-1 block text-ink/80">
                                No dashboard. Just signal.
                            </span>
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-magenta/80">
                            [ dump / {String(placeholders.length).padStart(2, "0")} ]
                        </p>
                    </div>

                    <div
                        aria-hidden
                        className="mt-8 h-px w-full bg-linear-to-r from-signal via-magenta/60 to-transparent"
                    />
                </header>

                <section aria-label="Available placeholders">
                    <div className="mb-6 flex items-baseline justify-between gap-4">
                        <h2 className="animate-rise font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
                            ::channels
                        </h2>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                            hover = preview later
                        </span>
                    </div>

                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                        {placeholders.map((placeholder, index) => (
                            <li
                                key={placeholder.id}
                                className="animate-rise"
                                style={{ animationDelay: `${140 + index * 60}ms` }}
                            >
                                <PlaceholderCard placeholder={placeholder} index={index} />
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </div>
    );
}
