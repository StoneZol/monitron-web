/**
 * Bundled Midjourney stills under /public/placeholders — tiny prefs (id only).
 * Safe to restore forever; not user uploads.
 */

export const STOCK_PLACEHOLDER_IDS = ["1", "2", "3", "4"] as const;

export type StockPlaceholderId = (typeof STOCK_PLACEHOLDER_IDS)[number];

export type StockPlaceholder = {
  id: StockPlaceholderId;
  src: string;
  label: string;
};

export const STOCK_PLACEHOLDERS: readonly StockPlaceholder[] =
  STOCK_PLACEHOLDER_IDS.map((id) => ({
    id,
    src: `/placeholders/${id}.webp`,
    label: id,
  }));

export const DEFAULT_STOCK_ID: StockPlaceholderId = "1";

export function isStockPlaceholderId(v: unknown): v is StockPlaceholderId {
  return (
    typeof v === "string" &&
    (STOCK_PLACEHOLDER_IDS as readonly string[]).includes(v)
  );
}

export function stockPlaceholderSrc(id: StockPlaceholderId): string {
  return `/placeholders/${id}.webp`;
}
