export type Clouds2dProps = {
  showOverlay?: boolean;
};

export type Clouds2dLive = {
  /** Multiplier on stock drift speed (0.03). 1 = Shadertoy default. */
  flightSpeed: number;
  /** Cloud cover / density. Stock ≈ 0.2. */
  cover: number;
  /** Gray wash — clear blue → socked-in overcast. */
  overcast: number;
  /** Clock hour 0–23 (noon = 12 ≈ stock sky). */
  hour: number;
  /** Drive hour from the device clock. */
  syncDeviceTime: boolean;
};

export const CLOUDS2D_DEFAULTS: Clouds2dLive = {
  flightSpeed: 1,
  cover: 0.2,
  overcast: 0,
  hour: 12,
  syncDeviceTime: false,
};

export const CLOUDS2D_RANGES = {
  flightSpeed: { min: 0, max: 4, step: 0.05 },
  cover: { min: 0, max: 1, step: 0.01 },
  overcast: { min: 0, max: 1, step: 0.01 },
  hour: { min: 0, max: 23, step: 1 },
} as const;

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
