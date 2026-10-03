import { bwMod } from "./bw";
import type { FxModeMod, FxModePaintContext } from "./types";

export type { FxModeMod, FxModePaintContext } from "./types";
export { bwMod } from "./bw";

/** Registry of overlay algorithms — add new mods here. */
export const FX_MODE_MODS: Record<string, FxModeMod> = {
  [bwMod.id]: bwMod,
};

export function getFxModeMod(modeId: string): FxModeMod | null {
  if (modeId === "off") return null;
  return FX_MODE_MODS[modeId] ?? null;
}

export function applyFxMode(modeId: string, ctx: FxModePaintContext) {
  const mod = getFxModeMod(modeId);
  if (!mod) {
    clearAllFxModes(ctx.root);
    return;
  }
  // Clear other mods first so filters don't stack across switches
  for (const other of Object.values(FX_MODE_MODS)) {
    if (other.id !== mod.id) other.clear(ctx.root);
  }
  mod.apply(ctx);
}

export function clearAllFxModes(root: HTMLElement) {
  for (const mod of Object.values(FX_MODE_MODS)) {
    mod.clear(root);
  }
}
