import {
  DEFAULT_STOCK_ID,
  type StockPlaceholderId,
} from "@/lib/stockPlaceholders";

export type HeartfeltProps = {
  showOverlay?: boolean;
};

export type HeartfeltBgSource = "stock" | "user";

export type HeartfeltLive = {
  /** Rain density 0…1 (Shadertoy rainAmount) */
  rainAmount: number;
  /** Drop fall / time scale */
  dropSpeed: number;
  /** Glass fog — 0 clear, 1 opaque foggy */
  glass: number;
  /** Lightning flash mix 0…1 */
  lightning: number;
  /** stock = bundled placeholder; user = single IndexedDB slot */
  bgSource: HeartfeltBgSource;
  /** Remembered stock id (also used when clearing custom) */
  stockId: StockPlaceholderId;
};

export const HEARTFELT_DEFAULTS: HeartfeltLive = {
  rainAmount: 0.75,
  dropSpeed: 1,
  glass: 0.85,
  lightning: 0.35,
  bgSource: "stock",
  stockId: DEFAULT_STOCK_ID,
};

export const HEARTFELT_RANGES = {
  rainAmount: { min: 0, max: 1, step: 0.01 },
  dropSpeed: { min: 0.05, max: 3, step: 0.05 },
  glass: { min: 0, max: 1, step: 0.01 },
  lightning: { min: 0, max: 1, step: 0.01 },
} as const;
