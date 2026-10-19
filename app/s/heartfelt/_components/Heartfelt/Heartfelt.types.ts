import {
  DEFAULT_STOCK_ID,
  type StockPlaceholderId,
} from "@/lib/stockPlaceholders";

export type HeartfeltProps = {
  showOverlay?: boolean;
};

export type HeartfeltBgSource = "stock" | "library" | "session";

export type HeartfeltLive = {
  rainAmount: number;
  dropSpeed: number;
  glass: number;
  lightning: number;
  /** Cover crop anchor X: 0 left → 1 right (0.5 center) */
  bgAlignX: number;
  /** Cover crop anchor Y: 0 top → 1 bottom (0.5 center) */
  bgAlignY: number;
  bgSource: HeartfeltBgSource;
  stockId: StockPlaceholderId;
  libraryId: string | null;
  /** Session file id — valid only until refresh */
  sessionId: string | null;
};

export const HEARTFELT_DEFAULTS: HeartfeltLive = {
  rainAmount: 0.75,
  dropSpeed: 1,
  glass: 0.85,
  lightning: 0.35,
  bgAlignX: 0.5,
  bgAlignY: 0.5,
  bgSource: "stock",
  stockId: DEFAULT_STOCK_ID,
  libraryId: null,
  sessionId: null,
};

export const HEARTFELT_RANGES = {
  rainAmount: { min: 0, max: 1, step: 0.01 },
  dropSpeed: { min: 0.05, max: 3, step: 0.05 },
  glass: { min: 0, max: 1, step: 0.01 },
  lightning: { min: 0, max: 1, step: 0.01 },
  bgAlignX: { min: 0, max: 1, step: 0.01 },
  bgAlignY: { min: 0, max: 1, step: 0.01 },
} as const;
