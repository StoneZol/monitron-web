import { loadLocal, saveLocal } from "@/lib/localStore";

/** `monitron:<screenId>:controls` — screenId = screensaver slug (matrix, gecs, …) */
export function screenPrefsKey(screenId: string) {
  return `monitron:${screenId}:controls`;
}

export function loadScreenPrefs<T extends Record<string, unknown>>(
  screenId: string,
  defaults: T,
): T {
  return loadLocal(screenPrefsKey(screenId), defaults);
}

export function saveScreenPrefs<T extends Record<string, unknown>>(
  screenId: string,
  prefs: T,
): void {
  saveLocal(screenPrefsKey(screenId), prefs);
}

/** Raw stored controls for this screen (empty object if missing). */
export function readScreenPrefsRaw(screenId: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(screenPrefsKey(screenId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return { ...(parsed as object) } as Record<string, unknown>;
  } catch {
    return {};
  }
}
