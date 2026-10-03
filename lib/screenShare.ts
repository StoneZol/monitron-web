import { libertyCore } from "liberty-core";
import { FX_OVERLAY_KEY } from "@/components/FxOverlay/FxOverlay.types";
import { readScreenPrefsRaw, saveScreenPrefs } from "@/lib/screenPrefs";

/**
 * Public easter-egg key — integrity / “Liberty look”, not real secrecy.
 * Anyone with the sources can forge shares; HMAC still catches typos/corruption.
 */
export const SHARE_SECRET = "monitron-share-v1-easter-egg";

export const SHARE_MAGIC = "monitron";
export const SHARE_VERSION = "1";

/** Fixed noise length so paste always matches what we sealed. */
const NOISE_LENGTH = 12;

/**
 * Underscore keys that travel with the look preset.
 * `_panelSections` and other HUD chrome stay local.
 */
const SHAREABLE_RESERVED = new Set<string>([FX_OVERLAY_KEY]);

export type ShareDecodeError = "empty" | "format" | "screen" | "decrypt";

export type ShareDecodeResult =
  | { ok: true; screenId: string; prefs: Record<string, unknown> }
  | { ok: false; error: ShareDecodeError };

/** Drop HUD chrome (`_*`) — panel fold state is local; fx overlay is shared. */
export function stripReservedPrefs(
  prefs: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(prefs)) {
    if (key.startsWith("_") && !SHAREABLE_RESERVED.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Seal current (or provided) screen prefs into a Liberty-style key:
 * `monitron:1:[<screenId>]:<noise><cipher>:<hmac>`
 */
export function encodeScreenShare(
  screenId: string,
  prefs?: Record<string, unknown>,
): string {
  const payload = stripReservedPrefs(prefs ?? readScreenPrefsRaw(screenId));
  const sealed = libertyCore.message.encrypt({
    message: JSON.stringify(payload),
    key: SHARE_SECRET,
    noiseLength: NOISE_LENGTH,
    clanPoint: screenId,
  });
  return `${SHARE_MAGIC}:${SHARE_VERSION}:${sealed}`;
}

export function decodeScreenShare(
  key: string,
  expectScreenId?: string,
): ShareDecodeResult {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, error: "empty" };

  const head = `${SHARE_MAGIC}:${SHARE_VERSION}:`;
  if (!trimmed.startsWith(head)) return { ok: false, error: "format" };

  const libertyPart = trimmed.slice(head.length);
  const clanMatch = /^\[([^\]]+)\]:/.exec(libertyPart);
  if (!clanMatch) return { ok: false, error: "format" };

  const screenId = clanMatch[1]!;
  if (expectScreenId && screenId !== expectScreenId) {
    return { ok: false, error: "screen" };
  }

  try {
    const plain = libertyCore.message.decrypt({
      message: libertyPart,
      key: SHARE_SECRET,
      noiseLength: NOISE_LENGTH,
    });
    const parsed: unknown = JSON.parse(plain);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "decrypt" };
    }
    return {
      ok: true,
      screenId,
      prefs: stripReservedPrefs(parsed as Record<string, unknown>),
    };
  } catch {
    return { ok: false, error: "decrypt" };
  }
}

/** Apply a share key to this screen’s localStorage (keeps existing `_` chrome). */
export function applyScreenShare(
  screenId: string,
  key: string,
): ShareDecodeResult {
  const decoded = decodeScreenShare(key, screenId);
  if (!decoded.ok) return decoded;
  saveScreenPrefs(screenId, decoded.prefs);
  return decoded;
}
