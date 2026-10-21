/**
 * Session-only background video for Wet Glass (and similar).
 * - Max 1 file, weight-capped — not part of the image library / slideshow pool.
 * - Cleared on refresh / new tab.
 * - Tab Sync can push the Blob (same path as session stills) when peers need the same scene.
 */

export const SESSION_VIDEO_MAX = 1;
/** Soft cap — reject oversized picks before they blow the tab. */
export const SESSION_VIDEO_MAX_BYTES = 80 * 1024 * 1024;

export type SessionVideoEntry = {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
  objectUrl: string;
};

/** Structured-clone payload for BroadcastChannel Sync. */
export type SessionVideoSyncItem = {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
};

const CHANGE_EVENT = "monitron:session-video";

const listeners = new Set<() => void>();
let entry: SessionVideoEntry | null = null;

function emit() {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeSessionVideo(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionVideoEntry(id: string): SessionVideoEntry | null {
  return entry?.id === id ? entry : null;
}

export function getSessionVideo(): SessionVideoEntry | null {
  return entry;
}

export function sessionVideoCount(): number {
  return entry ? 1 : 0;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
}

function clearCurrent() {
  if (!entry) return;
  URL.revokeObjectURL(entry.objectUrl);
  entry = null;
}

/**
 * Replace the single session video slot.
 * Throws if not a video or over the byte cap.
 */
export async function setSessionVideoFromFile(
  file: File,
): Promise<SessionVideoEntry> {
  if (!isVideoFile(file)) {
    throw new Error("Expected a video file (mp4 / webm / …)");
  }
  if (file.size > SESSION_VIDEO_MAX_BYTES) {
    const mb = Math.round(SESSION_VIDEO_MAX_BYTES / (1024 * 1024));
    throw new Error(`Video too large (max ${mb} MB)`);
  }

  clearCurrent();
  const next: SessionVideoEntry = {
    id: newId(),
    name: file.name || "video",
    createdAt: Date.now(),
    blob: file,
    objectUrl: URL.createObjectURL(file),
  };
  entry = next;
  emit();
  return next;
}

export function removeSessionVideo(id?: string): void {
  if (!entry) return;
  if (id != null && entry.id !== id) return;
  clearCurrent();
  emit();
}

export function clearSessionVideo(): void {
  if (!entry) return;
  clearCurrent();
  emit();
}

/** Snapshot for Sync — preserves id so peer prefs.videoId still resolves. */
export function exportSessionVideoForSync(): SessionVideoSyncItem | null {
  if (!entry) return null;
  return {
    id: entry.id,
    name: entry.name,
    createdAt: entry.createdAt,
    blob: entry.blob,
  };
}

/**
 * Replace this tab's session video with a Sync payload (same id), or clear.
 */
export async function replaceSessionVideoFromSync(
  item: SessionVideoSyncItem | null | undefined,
): Promise<void> {
  if (!item?.blob || typeof item.id !== "string") {
    clearSessionVideo();
    return;
  }
  if (item.blob.size > SESSION_VIDEO_MAX_BYTES) {
    clearSessionVideo();
    return;
  }
  clearCurrent();
  entry = {
    id: item.id,
    name: item.name || "video",
    createdAt: Number(item.createdAt) || Date.now(),
    blob: item.blob,
    objectUrl: URL.createObjectURL(item.blob),
  };
  emit();
}
