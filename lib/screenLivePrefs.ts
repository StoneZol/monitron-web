/**
 * In-memory screen prefs for Sync.
 * Tabs share localStorage — a sibling can overwrite disk while this tab still
 * shows older knobs. Sync must push *this tab's* live snapshot, not raw disk.
 */

import { readScreenPrefsRaw, saveScreenPrefs } from "@/lib/screenPrefs";

type LiveGetter = () => Record<string, unknown>;

const getters = new Map<string, LiveGetter>();

/** Register this tab's live controls. Returns unsubscribe. */
export function registerScreenLivePrefs(
  screenId: string,
  getLive: LiveGetter,
): () => void {
  getters.set(screenId, getLive);
  return () => {
    if (getters.get(screenId) === getLive) getters.delete(screenId);
  };
}

/**
 * Flush live prefs to disk (if registered), then return the snapshot to broadcast.
 * Falls back to raw localStorage when no live getter is mounted.
 */
export function snapshotScreenPrefsForSync(
  screenId: string,
): Record<string, unknown> {
  const getLive = getters.get(screenId);
  if (getLive) {
    try {
      saveScreenPrefs(screenId, getLive());
    } catch {
      /* private mode / quota */
    }
  }
  return readScreenPrefsRaw(screenId);
}
