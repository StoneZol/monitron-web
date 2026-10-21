"use client";

import { useState } from "react";
import {
  formatSourceCredit,
  MONITRON_PORTER,
  resolveAiTag,
  resolvePorter,
  type PlaceholderMeta,
  type PlaceholderSource,
} from "@/lib/placeholders";
import { cn } from "@/lib/utils";
import { PanelButton } from "@/components/ControlPanel/PanelButton";
import { ScreenAbout } from "@/components/ScreenAbout";

type PlaceholderCreditProps = {
  meta: PlaceholderMeta;
  className?: string;
  /** plain = panel; rail = under-preview tick; plaque/frame legacy */
  variant?: "plaque" | "frame" | "plain" | "rail";
};

const rowClass =
  "inline-flex min-w-0 max-w-full items-baseline gap-1 truncate transition-colors hover:text-signal";

function CreditLink({
  href,
  label,
  name,
  title,
}: {
  href?: string;
  label: string;
  name: string;
  title?: string;
}) {
  const text = (
    <>
      <span className="shrink-0 text-muted/80">{label}</span>
      <span className="shrink-0 text-cyan/40">—</span>
      <span className="truncate text-cyan">{name}</span>
      <span className="shrink-0 text-magenta/70">↗</span>
    </>
  );

  if (!href) {
    return (
      <span className={rowClass} title={title}>
        {text}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={rowClass}
      title={title}
    >
      {text}
    </a>
  );
}

function SourceBlock({ source }: { source: PlaceholderSource }) {
  const porter = resolvePorter(source.portedBy);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <CreditLink
        href={source.href}
        label="ref"
        name={source.author}
        title={formatSourceCredit(source)}
      />
      {porter ? (
        <CreditLink
          href={porter.href}
          label="adapt"
          name={porter.name}
          title={`adapted by ${porter.name}`}
        />
      ) : null}
    </div>
  );
}

function AuthorBlock({ meta }: { meta: PlaceholderMeta }) {
  const porter =
    resolvePorter(meta.author ?? MONITRON_PORTER) ?? MONITRON_PORTER;
  return (
    <CreditLink href={porter.href} label="author" name={porter.name} />
  );
}

function AiBlock({ meta }: { meta: PlaceholderMeta }) {
  const ai = resolveAiTag(meta);
  if (!ai) return null;
  const via = meta.ai?.via?.trim();
  return (
    <CreditLink
      href={meta.ai?.href}
      label="ai helper"
      name={via || "yes"}
      title={ai.title}
    />
  );
}

/** Card / panel credit: ref+adapt stacked, or author when no source; AI under. */
export function PlaceholderCredit({
  meta,
  className,
  variant = "plain",
}: PlaceholderCreditProps) {
  const sources = meta.sources;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
        variant === "plaque" &&
          "border border-cyan/55 bg-screen/92 px-2 py-1.5 shadow-[2px_2px_0_var(--magenta)] backdrop-blur-sm",
        variant === "frame" &&
          "border-t border-r border-signal/55 bg-screen/92 px-2 py-1.5 backdrop-blur-sm group-hover:border-signal",
        variant === "rail" && "credit-rail",
        className,
      )}
    >
      {sources?.length ? (
        sources.map((src) => <SourceBlock key={src.href} source={src} />)
      ) : (
        <AuthorBlock meta={meta} />
      )}
      <AiBlock meta={meta} />
    </div>
  );
}

type ScreenTitleCreditProps = {
  /** Panel chrome title — click opens about / credits. */
  title: string;
  meta: PlaceholderMeta;
  className?: string;
};

/**
 * Overlay chrome title as a button: `TITLE (c)` → about modal.
 */
export function ScreenTitleCredit({
  title,
  meta,
  className,
}: ScreenTitleCreditProps) {
  const sources = meta.sources ?? [];
  const hasSources = sources.length > 0;
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <PanelButton
        onClick={() => setAboutOpen(true)}
        title="About / sources / credits"
        className={cn(
          "h-9 min-w-0 flex-1 justify-between gap-2 px-2.5 py-0 text-start text-sm tracking-[0.28em]",
          className,
        )}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="shrink-0 text-[10px] tracking-[0.18em] text-muted" aria-hidden>
          (c)
        </span>
      </PanelButton>

      {aboutOpen ? (
        <ScreenAbout title={meta.title} onClose={() => setAboutOpen(false)}>
          <p className="text-muted normal-case tracking-normal">
            Monitron screen — generative fullscreen saver.
          </p>
          <div className="flex flex-col gap-1 border-t border-line/50 pt-2 font-mono text-[9px] uppercase tracking-[0.14em]">
            {hasSources ? (
              sources.map((src) => (
                <SourceBlock key={src.href} source={src} />
              ))
            ) : (
              <AuthorBlock meta={meta} />
            )}
            <AiBlock meta={meta} />
          </div>
        </ScreenAbout>
      ) : null}
    </>
  );
}
