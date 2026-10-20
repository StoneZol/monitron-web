# Plan: hot tab-sync (no reload)

Status: **done** — shipped. Share paste remains reload-based.

## Problem

`sync` used to `broadcastTabSync` → `scheduleReloadAt` → `location.reload()`, which killed Page Fullscreen.

## Target behavior

Cross-tab barrier (`BroadcastChannel` + shared `applyAt` ~`TAB_SYNC_LEAD_MS`). At the deadline:

1. Persist / apply incoming prefs into screen stores.
2. Rehydrate live stores + invalidate FX overlay cache.
3. Run registered runtime cold-boot resets (pose/phase, not prefs knobs).
4. Stay in fullscreen; HUD hide state stays per-tab.

## Implementation

- [`lib/tabBroadcast.ts`](../lib/tabBroadcast.ts) — `TAB_SYNC_VERSION` 5, `applyAt`, session media Blobs, `scheduleTabSyncApply` / `subscribeTabSyncApply`
- [`lib/runtimeReset.ts`](../lib/runtimeReset.ts) — registry + helpers
- [`lib/tabSyncHotApply.ts`](../lib/tabSyncHotApply.ts) — rehydrate hook helper (`onTabSyncApply`)
- Per-screen hooks rehydrate; Canvas/loops register cold-boot slots

## Out of scope (still)

- Share paste hot-apply
- Syncing HUD fold / hide
- Perfect bit-identical RNG across tabs
