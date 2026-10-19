import {
  DEFAULT_STOCK_ID,
  type StockPlaceholderId,
} from "@/lib/stockPlaceholders";

export type WetglassProps = {
  showOverlay?: boolean;
};

export type WetglassBgSource = "stock" | "library" | "session";

export type WetglassLive = {
  rainAmount: number;
  dropSpeed: number;
  glass: number;
  lightning: number;
  /** Cover crop anchor X: 0 left → 1 right (0.5 center) */
  bgAlignX: number;
  /** Cover crop anchor Y: 0 top → 1 bottom (0.5 center) */
  bgAlignY: number;
  /** Cycle backgrounds on a timer */
  slideshow: boolean;
  slideshowStock: boolean;
  slideshowLibrary: boolean;
  slideshowSession: boolean;
  /** Seconds between slides */
  slideshowIntervalSec: number;
  bgSource: WetglassBgSource;
  stockId: StockPlaceholderId;
  libraryId: string | null;
  /** Session file id — valid only until refresh */
  sessionId: string | null;
};

export const WETGLASS_DEFAULTS: WetglassLive = {
  rainAmount: 0.75,
  dropSpeed: 1,
  glass: 0.85,
  lightning: 0.35,
  bgAlignX: 0.5,
  bgAlignY: 0.5,
  slideshow: false,
  slideshowStock: true,
  slideshowLibrary: true,
  slideshowSession: true,
  slideshowIntervalSec: 15,
  bgSource: "stock",
  stockId: DEFAULT_STOCK_ID,
  libraryId: null,
  sessionId: null,
};

export const WETGLASS_RANGES = {
  rainAmount: { min: 0, max: 1, step: 0.01 },
  dropSpeed: { min: 0.05, max: 3, step: 0.05 },
  glass: { min: 0, max: 1, step: 0.01 },
  lightning: { min: 0, max: 1, step: 0.01 },
  bgAlignX: { min: 0, max: 1, step: 0.01 },
  bgAlignY: { min: 0, max: 1, step: 0.01 },
  slideshowIntervalSec: { min: 3, max: 600, step: 1, coarseStep: 15 },
} as const;
