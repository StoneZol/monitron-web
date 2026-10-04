import {
  formatSourceCredit,
  MONITRON_PORTER,
  resolveAiTag,
  resolvePorter,
  type PlaceholderMeta,
  type PlaceholderSource,
} from "@/lib/placeholders";
import { cn } from "@/lib/utils";

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
        label="original"
        name={source.author}
        title={formatSourceCredit(source)}
      />
      {porter ? (
        <CreditLink
          href={porter.href}
          label="port"
          name={porter.name}
          title={`ported by ${porter.name}`}
        />
      ) : null}
    </div>
  );
}

/** Card / panel credit: original+port stacked, or author when no source; AI under. */
export function PlaceholderCredit({
  meta,
  className,
  variant = "plain",
}: PlaceholderCreditProps) {
  const sources = meta.sources;
  const ai = resolveAiTag(meta);
  const via = meta.ai?.via?.trim();

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
        <CreditLink
          href={
            resolvePorter(meta.author ?? MONITRON_PORTER)?.href ??
            MONITRON_PORTER.href
          }
          label="author"
          name={
            resolvePorter(meta.author ?? MONITRON_PORTER)?.name ??
            MONITRON_PORTER.name
          }
        />
      )}

      {ai ? (
        <CreditLink
          href={meta.ai?.href}
          label="ai helper"
          name={via || "yes"}
          title={ai.title}
        />
      ) : null}
    </div>
  );
}
