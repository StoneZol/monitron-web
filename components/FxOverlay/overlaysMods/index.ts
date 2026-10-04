import { blurMod } from "./blur";
import { bwMod } from "./bw";
import { grainMod } from "./grain";
import { hueMod } from "./hue";
import { negativeMod } from "./negative";
import { sepiaMod } from "./sepia";
import type { FxModeMod, FxModePaintContext } from "./types";

export type {
  FxModeMod,
  FxModePaintContext,
  FxModeKnob,
  FxModeSource,
} from "./types";
export { blurMod } from "./blur";
export { bwMod } from "./bw";
export { grainMod } from "./grain";
export { hueMod } from "./hue";
export { negativeMod } from "./negative";
export { sepiaMod } from "./sepia";

/**
 * Registry — add a new overlay:
 * 1) overlaysMods/<id>.ts with apply/clear
 * 2) register here + add id to FxOverlayMode in FxOverlay.types.ts
 */
export const FX_MODE_MODS: Record<string, FxModeMod> = {
  [bwMod.id]: bwMod,
  [sepiaMod.id]: sepiaMod,
  [negativeMod.id]: negativeMod,
  [hueMod.id]: hueMod,
  [blurMod.id]: blurMod,
  [grainMod.id]: grainMod,
};

export function getFxModeMod(modeId: string): FxModeMod | null {
  if (modeId === "off") return null;
  return FX_MODE_MODS[modeId] ?? null;
}

/** Same path for every mode — clear siblings, then apply. */
export function applyFxMode(modeId: string, ctx: FxModePaintContext) {
  const mod = getFxModeMod(modeId);
  if (!mod) {
    clearAllFxModes(ctx.root);
    return;
  }
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
