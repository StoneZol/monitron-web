import { invalidateFxOverlayCache } from "@/components/FxOverlay";
import { runRuntimeResets } from "@/lib/runtimeReset";
import { subscribeTabSyncApply } from "@/lib/tabBroadcast";

/**
 * On shared sync deadline: rehydrate screen prefs, bust FX cache, cold-boot runtime.
 * Call from each screen hook's useEffect.
 */
export function onTabSyncApply(
  screenId: string,
  rehydrate: () => void,
): () => void {
  return subscribeTabSyncApply(screenId, () => {
    rehydrate();
    invalidateFxOverlayCache(screenId);
    runRuntimeResets(screenId);
  });
}
