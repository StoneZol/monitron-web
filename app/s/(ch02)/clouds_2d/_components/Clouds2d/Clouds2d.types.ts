export type Clouds2dProps = {
  showOverlay?: boolean;
};

export type Clouds2dLive = {
  /** Multiplier on stock drift speed (0.03). 1 = Shadertoy default. */
  flightSpeed: number;
  /** Cloud cover / density. Stock ≈ 0.2. */
  cover: number;
  /** Clock hour 0–23 (noon = 12 ≈ stock sky). */
  hour: number;
  /** Drive hour from the device clock. */
  syncDeviceTime: boolean;
};

export const CLOUDS2D_DEFAULTS: Clouds2dLive = {
  flightSpeed: 1,
  cover: 0.2,
  hour: 12,
  syncDeviceTime: false,
};

export const CLOUDS2D_RANGES = {
  flightSpeed: { min: 0, max: 4, step: 0.05 },
  cover: { min: 0, max: 1, step: 0.01 },
  /** 15-minute steps: 0 … 23.75 (23:45) */
  hour: { min: 0, max: 23.75, step: 0.25 },
} as const;

export function snapHourQuarter(hour: number): number {
  if (!Number.isFinite(hour)) return CLOUDS2D_DEFAULTS.hour;
  const snapped = Math.round(hour * 4) / 4;
  const wrapped = ((snapped % 24) + 24) % 24;
  return Math.min(CLOUDS2D_RANGES.hour.max, wrapped);
}

/** Local civil hour as float (14:30 → 14.5). */
export function deviceHourFloat(now = new Date()): number {
  return (
    now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  );
}

export function formatHourLabel(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  if (m <= 0) return `${String(h).padStart(2, "0")}:00`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
