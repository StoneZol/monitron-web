/** Catalog chapter return marker on screen URLs (`?via=ch-02` → `/?ch=2`). */

export function formatCatalogVia(chapter: number): string {
  return `ch-${String(Math.max(1, chapter)).padStart(2, "0")}`;
}

/** Parse `via=ch-02` → `2`. Invalid / missing → null. */
export function parseCatalogVia(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = /^ch-0*([1-9]\d*)$/i.exec(raw.trim());
  if (!m) return null;
  return Number(m[1]);
}

export function catalogHomeHref(chapter: number): string {
  return chapter <= 1 ? "/" : `/?ch=${chapter}`;
}

/** Append `?via=ch-NN` (or `&via=`) to a screen href. */
export function screenHrefWithVia(href: string, chapter: number): string {
  const via = formatCatalogVia(chapter);
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}via=${via}`;
}

/** Home path from current screen search (`via` query). Defaults to `/`. */
export function homeHrefFromViaParam(
  via: string | null | undefined,
): string {
  const chapter = parseCatalogVia(via);
  return chapter ? catalogHomeHref(chapter) : "/";
}
