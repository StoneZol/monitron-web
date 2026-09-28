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
