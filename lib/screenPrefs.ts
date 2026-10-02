import { loadLocal, saveLocal } from "@/lib/localStore";

/** `monitron:<screenId>:controls` — screenId = screensaver slug (matrix, gecs, …) */
export function screenPrefsKey(screenId: string) {
  return `monitron:${screenId}:controls`;
}

/** HUD / panel chrome keys — preserved when screens rewrite live controls. */
export const PANEL_SECTIONS_KEY = "_panelSections" as const;

export type PanelSectionsMap = Record<string, boolean>;

export function loadScreenPrefs<T extends Record<string, unknown>>(
  screenId: string,
  defaults: T,
): T {
  return loadLocal(screenPrefsKey(screenId), defaults);
}

/**
 * Write screen controls. Keys starting with `_` already in storage are kept
 * unless the payload explicitly sets them (so HUD chrome survives knob saves).
 */
export function saveScreenPrefs<T extends Record<string, unknown>>(
  screenId: string,
  prefs: T,
): void {
  const raw = readScreenPrefsRaw(screenId);
  const reserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_") && !(key in prefs)) {
      reserved[key] = value;
    }
  }
  saveLocal(screenPrefsKey(screenId), { ...reserved, ...prefs });
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

export function readPanelSections(screenId: string): PanelSectionsMap {
  const raw = readScreenPrefsRaw(screenId)[PANEL_SECTIONS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PanelSectionsMap = {};
  for (const [key, value] of Object.entries(raw as object)) {
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

export function writePanelSection(
  screenId: string,
  sectionId: string,
  open: boolean,
): void {
  const next = { ...readPanelSections(screenId), [sectionId]: open };
  saveScreenPrefs(screenId, {
    ...readScreenPrefsRaw(screenId),
    [PANEL_SECTIONS_KEY]: next,
  });
}
