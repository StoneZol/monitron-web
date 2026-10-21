/**
 * Catalog barrel — import from `@/lib/placeholders`.
 * Screens live in route groups `app/s/(chNN)/<id>` (URL stays `/s/<id>`).
 * Meta is split per chapter; this file merges for search / SEO / home.
 */

import { blurbsCh01, placeholdersCh01 } from "./ch01";
import { blurbsCh02, placeholdersCh02 } from "./ch02";

export type {
  PlaceholderAi,
  PlaceholderCost,
  PlaceholderMeta,
  PlaceholderPorter,
  PlaceholderSource,
  PlaceholderTag,
  ResolvedPlaceholderTag,
} from "./types";

export {
  COST_META,
  MONITRON_AI,
  MONITRON_PORTER,
  PLACEHOLDER_CHAPTER_SIZE,
  formatSourceCredit,
  isSensitivePlaceholder,
  resolveAiTag,
  resolveCornerTags,
  resolvePlaceholderTags,
  resolvePorter,
  withPorter,
} from "./types";

/** Ordered chapters for home paging (ch.01, ch.02, …). */
export const placeholderChapters = [
  placeholdersCh01,
  placeholdersCh02,
] as const;

/** Flat catalog — search / sitemap / SEO across every screen. */
export const placeholders = placeholderChapters.flat();

/** SEO blurbs keyed by screen id (merged from chapters). */
export const screenBlurbs: Record<string, string> = {
  ...blurbsCh01,
  ...blurbsCh02,
};
