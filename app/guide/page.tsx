import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { panelButtonClassName } from "@/components/ControlPanel/PanelButton";
import { PLUGIN_URL } from "@/lib/audioBus";
import { SITE_NAME } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

const GUIDE_DESCRIPTION =
  "How to drive Monitron with the Chrome plugin or mic, and share look presets via monitron keys.";

export const metadata: Metadata = {
  title: "Guide",
  description: GUIDE_DESCRIPTION,
  alternates: { canonical: "/guide" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: `Guide · ${SITE_NAME}`,
    description: GUIDE_DESCRIPTION,
    url: `${getSiteUrl()}/guide`,
    images: [
      {
        url: `${getSiteUrl()}/og/monitronOG.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Guide · ${SITE_NAME}`,
    description: GUIDE_DESCRIPTION,
    images: [`${getSiteUrl()}/og/monitronOG.png`],
  },
};

export default function GuidePage() {
  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col overflow-x-hidden">
      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-12 sm:mb-16">
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            <Link
              href="/"
              className="text-signal transition-colors hover:text-cyan"
            >
              ← home
            </Link>
            <span className="text-muted/50">/</span>
            <span className="text-cyan">guide</span>
          </div>

          <h1 className="text-[clamp(2.4rem,8vw,3.75rem)] font-bold leading-[0.9] tracking-tight text-ink">
            Signal in
          </h1>
          <p className="mt-5 max-w-md text-sm leading-snug text-muted sm:text-base">
            Screens run without audio. Plug in a source when you want the
            picture to move with sound.
          </p>
          <div
            aria-hidden
            className="mt-8 h-px w-full bg-linear-to-r from-signal via-magenta/60 to-transparent"
          />
        </header>

        <div className="flex flex-col gap-14 text-sm leading-relaxed text-ink/90 sm:text-[15px]">
          <section className="space-y-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
              ::1 open a channel
            </h2>
            <p className="text-muted">
              Pick any screen from the home dump. Open the HUD overlay, find{" "}
              <span className="text-ink">visualizer</span>, set{" "}
              <span className="text-ink">source</span>.
            </p>
            <ul className="space-y-2 font-mono text-[12px] uppercase tracking-[0.14em] text-muted">
              <li>
                <span className="text-signal">off</span>
                <span className="mx-2 text-muted/40">—</span>
                idle look only
              </li>
              <li>
                <span className="text-cyan">plugin</span>
                <span className="mx-2 text-muted/40">—</span>
                tab audio via Chrome extension
              </li>
              <li>
                <span className="text-magenta">mic</span>
                <span className="mx-2 text-muted/40">—</span>
                browser microphone
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
              ::2 chrome plugin
            </h2>
            <p className="text-muted">
              Best path for music in another tab. The extension taps that tab’s
              audio and posts spectrum into the page — bass / mid / high / beat
              stay local to each screen.
            </p>
            <ol className="list-decimal space-y-3 pl-5 text-muted marker:text-signal">
              <li>
                Install from{" "}
                <a
                  href={PLUGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:text-signal"
                >
                  monitron-plugin
                </a>
                .
              </li>
              <li>Play audio in a Chrome tab you want to react to.</li>
              <li>
                On a Monitron screen, set source to{" "}
                <span className="text-ink">plugin</span>. Status should read{" "}
                <span className="text-signal">online</span>.
              </li>
              <li>
                Wire <span className="text-ink">channels</span> +{" "}
                <span className="text-ink">drive</span> to color, speed, etc.
              </li>
            </ol>
            <a
              href={PLUGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(panelButtonClassName, "mt-2 inline-flex gap-2")}
            >
              <span className="text-muted">src://</span>
              plugin
              <span aria-hidden className="text-cyan">
                →
              </span>
            </a>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warn/90">
              if status stays offline — reload the screen tab after installing
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
              ::3 microphone
            </h2>
            <p className="text-muted">
              No extension needed. The page listens through the browser mic —
              room sound, speakers, live input.
            </p>
            <ol className="list-decimal space-y-3 pl-5 text-muted marker:text-signal">
              <li>
                Set source to <span className="text-ink">mic</span>.
              </li>
              <li>
                Allow the permission prompt. If you see{" "}
                <span className="text-magenta">click anywhere to enable mic</span>
                , tap the page once — browsers need a gesture.
              </li>
              <li>
                Raise <span className="text-ink">noise gate</span> if room hiss
                moves the meters. Lower it for quiet sources.
              </li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
              ::4 peak gain
            </h2>
            <p className="text-muted">
              Quiet tabs or weak mics: bump{" "}
              <span className="text-ink">peak gain</span> on the visualizer.
              Soft-clipped so ×3 still moves without hard clipping the bus.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
              ::5 share presets
            </h2>
            <p className="text-muted">
              Dial a look you like, then pass it around. In the HUD{" "}
              <span className="text-ink">preset</span> strip:
            </p>
            <ul className="space-y-3 text-muted">
              <li>
                <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-cyan">
                  copy
                </span>
                <span className="mx-2 text-muted/40">—</span>
                seals current knobs + fx overlay into a{" "}
                <span className="text-ink">monitron:…</span> key on the
                clipboard.
              </li>
              <li>
                <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-cyan">
                  paste
                </span>
                <span className="mx-2 text-muted/40">—</span>
                drop someone else’s key on the{" "}
                <span className="text-ink">same screen</span>, applies it, and
                reloads.
              </li>
            </ul>
            <p className="text-muted">
              Keys are screen-locked (a hexacore dump won’t load on warpburst).
              Panel fold state stays local — only the look travels.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-magenta/90">
              tip — dump keys in chat, Discord, or a gist; paste to recreate
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
