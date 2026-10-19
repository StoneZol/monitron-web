import type { MediaSelection } from "@/components/ControlPanel";
import { STOCK_PLACEHOLDERS } from "@/lib/stockPlaceholders";
import { listMediaLibrary, listSessionMedia } from "@/lib/userMedia";
import type { HeartfeltLive } from "./Heartfelt.types";

/** Build ordered pool from enabled slideshow categories. */
export function buildSlideshowPool(live: HeartfeltLive): MediaSelection[] {
  const pool: MediaSelection[] = [];
  if (live.slideshowStock) {
    for (const s of STOCK_PLACEHOLDERS) {
      pool.push({ kind: "stock", id: s.id });
    }
  }
  if (live.slideshowLibrary) {
    for (const e of listMediaLibrary()) {
      pool.push({ kind: "library", id: e.id });
    }
  }
  if (live.slideshowSession) {
    for (const e of listSessionMedia()) {
      pool.push({ kind: "session", id: e.id });
    }
  }
  return pool;
}

export function currentMediaSelection(live: HeartfeltLive): MediaSelection {
  if (live.bgSource === "library" && live.libraryId) {
    return { kind: "library", id: live.libraryId };
  }
  if (live.bgSource === "session" && live.sessionId) {
    return { kind: "session", id: live.sessionId };
  }
  return { kind: "stock", id: live.stockId };
}

export function nextSlideshowSelection(
  live: HeartfeltLive,
): MediaSelection | null {
  const pool = buildSlideshowPool(live);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0]!;

  const cur = currentMediaSelection(live);
  const idx = pool.findIndex((p) => p.kind === cur.kind && p.id === cur.id);
  const next = pool[(idx < 0 ? 0 : idx + 1) % pool.length]!;
  return next;
}
