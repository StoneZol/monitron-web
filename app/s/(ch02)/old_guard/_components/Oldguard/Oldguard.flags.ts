/**
 * Bundled default flags — files in `../../_assets/flags/`.
 * Not served from /public; Next emits hashed static media URLs.
 */
import type { StockPlaceholder } from "@/lib/stockPlaceholders";
import avs from "../../_assets/flags/AVS.webp";
import eng from "../../_assets/flags/ENG.webp";
import fr from "../../_assets/flags/FR.webp";
import isp from "../../_assets/flags/ISP.webp";
import pr from "../../_assets/flags/PR.webp";
import ri from "../../_assets/flags/RI.webp";

export const OLD_GUARD_FLAG_IDS = [
  "RI",
  "FR",
  "PR",
  "AVS",
  "ENG",
  "ISP",
] as const;

export type OldGuardFlagId = (typeof OLD_GUARD_FLAG_IDS)[number];

type StaticSrc = string | { src: string };

function mediaSrc(mod: StaticSrc): string {
  return typeof mod === "string" ? mod : mod.src;
}

const LABELS: Record<OldGuardFlagId, string> = {
  RI: "Russian Empire",
  PR: "Prussia",
  FR: "France",
  ENG: "England",
  ISP: "Spain",
  AVS: "Austria",
};

const FILES: Record<OldGuardFlagId, StaticSrc> = {
  RI: ri,
  PR: pr,
  FR: fr,
  ENG: eng,
  ISP: isp,
  AVS: avs,
};

export const OLD_GUARD_FLAGS: readonly StockPlaceholder[] =
  OLD_GUARD_FLAG_IDS.map((id) => ({
    id,
    src: mediaSrc(FILES[id]),
    label: LABELS[id],
  }));

export const DEFAULT_FLAG_ID: OldGuardFlagId = "RI";

export function isOldGuardFlagId(v: unknown): v is OldGuardFlagId {
  return (
    typeof v === "string" &&
    (OLD_GUARD_FLAG_IDS as readonly string[]).includes(v)
  );
}

export function oldGuardFlagSrc(id: OldGuardFlagId): string {
  return mediaSrc(FILES[id]);
}
