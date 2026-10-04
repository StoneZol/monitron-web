export type PlaceholderPorter =
  | string
  | {
      name: string;
      href: string;
    };

export type PlaceholderSource = {
  href: string;
  /** Original shader / piece author */
  author: string;
  /** Full original title */
  title: string;
  /** Who ported it into Monitron — plain name or `{ name, href }` */
  portedBy?: PlaceholderPorter;
};

/** Subjective GPU / resource weight for the card stamp. */
export type PlaceholderCost = "low" | "mid" | "high";

/**
 * Declared card tags. `sourced` and `ai` are injected automatically
 * when `sources` / `ai` are set — do not list them here.
 */
export type PlaceholderTag = "reactive" | "only-reactive" | (string & {});

export type PlaceholderAi = {
  /** Model / service name on the credit row (`ai helper — cursor`). */
  via?: string;
  /** Optional link for the helper name (e.g. https://cursor.com/). */
  href?: string;
};

export type PlaceholderMeta = {
  id: string;
  title: string;
  href: string;
  /** static preview image (screenshot) */
  previewSrc?: string;
  /** Clickable stamps — order preserved; sourced/ai prepended/appended by resolve */
  tags?: PlaceholderTag[];
  /** Subjective load badge under CH-## */
  cost: PlaceholderCost;
  /** Attribution — auto-adds `sourced` stamp + credit under the card */
  sources?: PlaceholderSource[];
  /**
   * Native author when there is no external source.
   * Defaults to MONITRON_PORTER (StoneZol) in the credit UI.
   */
  author?: PlaceholderPorter;
  /** Auto-adds `ai` stamp when set */
  ai?: PlaceholderAi;
};

export type ResolvedPlaceholderTag = {
  id: string;
  label: string;
  /** Visual tone for the stamp */
  tone: "signal" | "warn" | "cyan" | "magenta";
  title: string;
};

/** Default porter credit for Shadertoy ports. */
export const MONITRON_PORTER = {
  name: "StoneZol",
  href: "https://github.com/StoneZol",
} as const;

/** Default AI stamp — Cursor session that helped ship the screen. */
export const MONITRON_AI = {
  via: "cursor",
  href: "https://cursor.com/",
} as const;

const TAG_META: Record<
  string,
  Omit<ResolvedPlaceholderTag, "id" | "label"> & { label?: string }
> = {
  sourced: {
    label: "sourced",
    tone: "cyan",
    title: "Based on an external source — credit below",
  },
  reactive: {
    label: "reactive",
    tone: "signal",
    title: "Works with Monitron Chrome extension / mic bus",
  },
  "only-reactive": {
    label: "only reactive",
    tone: "warn",
    title: "Audio-only — idle without mic or plugin",
  },
  ai: {
    label: "ai helper",
    tone: "magenta",
    title: "Built or ported with AI assistance",
  },
};

export const COST_META: Record<
  PlaceholderCost,
  { label: string; tone: "signal" | "cyan" | "warn"; title: string }
> = {
  low: {
    label: "low",
    tone: "signal",
    title: "Light — usually fine on integrated GPUs",
  },
  mid: {
    label: "mid",
    tone: "cyan",
    title: "Moderate — drop Render scale if the fan spins up",
  },
  high: {
    label: "high",
    tone: "warn",
    title: "Heavy — raymarch / dense GPU. Start at 50% Render scale",
  },
};

export function resolvePorter(
  portedBy: PlaceholderPorter | undefined,
): { name: string; href?: string } | null {
  if (!portedBy) return null;
  if (typeof portedBy === "string") return { name: portedBy };
  return { name: portedBy.name, href: portedBy.href };
}

/** Stamp stack on the card (no AI — that lives under credit). */
export function resolveCornerTags(
  meta: PlaceholderMeta,
): ResolvedPlaceholderTag[] {
  return resolvePlaceholderTags(meta).filter((t) => t.id !== "ai");
}

/** AI stamp for the credit plaque — null when unset. */
export function resolveAiTag(
  meta: PlaceholderMeta,
): ResolvedPlaceholderTag | null {
  if (!meta.ai) return null;
  const via = meta.ai.via?.trim();
  const preset = TAG_META.ai;
  return {
    id: "ai",
    label: via ? `ai helper — ${via}` : (preset?.label ?? "ai helper"),
    tone: preset?.tone ?? "magenta",
    title: preset?.title ?? "Built or ported with AI assistance",
  };
}

/** Full tag set for filtering: sourced → declared → ai. */
export function resolvePlaceholderTags(
  meta: PlaceholderMeta,
): ResolvedPlaceholderTag[] {
  const out: ResolvedPlaceholderTag[] = [];
  const seen = new Set<string>();

  const push = (id: string, labelOverride?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const preset = TAG_META[id];
    out.push({
      id,
      label: labelOverride ?? preset?.label ?? id.replace(/-/g, " "),
      tone: preset?.tone ?? "signal",
      title: preset?.title ?? id,
    });
  };

  if (meta.sources?.length) push("sourced");

  for (const tag of meta.tags ?? []) {
    push(tag);
  }

  const ai = resolveAiTag(meta);
  if (ai) push(ai.id, ai.label);

  return out;
}

/** Plain-text fallback (titles, clipboard). Prefer `SourceCredit` in UI. */
export function formatSourceCredit(src: PlaceholderSource): string {
  const porter = resolvePorter(src.portedBy);
  if (porter) return `original — ${src.author} · port ${porter.name}`;
  return `original — ${src.author}`;
}

function withPorter(source: Omit<PlaceholderSource, "portedBy">): PlaceholderSource {
  return { ...source, portedBy: MONITRON_PORTER };
}

export const placeholders: PlaceholderMeta[] = [
  {
    id: "matrix",
    title: "Matrix",
    href: "/s/matrix",
    previewSrc: "/s/matrix.webp",
    tags: ["reactive"],
    cost: "low",
    ai: MONITRON_AI,
  },
  {
    id: "hexagons_place",
    title: "Hexagons Place",
    href: "/s/hexagons_place",
    previewSrc: "/s/hexagons_place.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
  },
  {
    id: "synthwave",
    title: "Synthwave",
    href: "/s/synthwave",
    previewSrc: "/s/synthwave.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
  },
  {
    id: "blackhole",
    title: "Blackhole",
    href: "/s/blackhole",
    previewSrc: "/s/blackhole.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "set111",
        title: "Black hole with accretion disk",
        href: "https://www.shadertoy.com/view/tsBXW3",
      }),
    ],
  },
  {
    id: "hexacore",
    title: "Hexacore",
    href: "/s/hexacore",
    previewSrc: "/s/hexacore.webp",
    tags: ["reactive"],
    cost: "high",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "nobody93",
        title: "Hexagonal Hive Lattice",
        href: "https://www.shadertoy.com/view/73KGRd",
      }),
    ],
  },
  {
    id: "warpburst",
    title: "Warpburst",
    href: "/s/warpburst",
    previewSrc: "/s/warpburst.webp",
    tags: ["reactive"],
    cost: "mid",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "heidro",
        title: "Warpburst 2",
        href: "https://www.shadertoy.com/view/fXGGDV",
      }),
    ],
  },
  {
    id: "fairysmoke",
    title: "Fairy Smoke",
    href: "/s/fairysmoke",
    previewSrc: "/s/fairysmoke.webp",
    tags: ["reactive"],
    cost: "high",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "Himred",
        title: "Fairy smoke",
        href: "https://www.shadertoy.com/view/fXG3Ww",
      }),
    ],
  },
  {
    id: "kalistarnest",
    title: "Kali Star Nest",
    href: "/s/kalistarnest",
    previewSrc: "/s/kalistarnest.webp",
    tags: ["reactive"],
    cost: "low",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "aladiN",
        title: "kali star nest, free 360° flight",
        href: "https://www.shadertoy.com/view/f3y3DW",
      }),
    ],
  },
  {
    id: "coralreef",
    title: "Coral Reef",
    href: "/s/coralreef",
    previewSrc: "/s/coralreef.webp",
    tags: ["reactive"],
    cost: "high",
    ai: MONITRON_AI,
    sources: [
      withPorter({
        author: "Yusef28",
        title: "Coral Reef Y28",
        href: "https://www.shadertoy.com/view/7X3GRS",
      }),
    ],
  },
  {
    id: "spectrum",
    title: "Spectrum",
    href: "/s/spectrum",
    previewSrc: "/s/spectrum.webp",
    tags: ["reactive", "only-reactive"],
    cost: "low",
    ai: MONITRON_AI,
  },
];
