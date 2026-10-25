/**
 * Shared image library for all screens.
 * - Up to MEDIA_LIBRARY_MAX http(s) URLs (full image loaded live from URL).
 * - IndexedDB keeps only tiny preview blobs (PREVIEW_W×PREVIEW_H) for URL thumbs.
 * - Local file picks are SESSION-ONLY (memory) — gone after refresh / new tab.
 * - External URL bytes go through /api/media-proxy (CORS / hotlink 403 in prod).
 */

import { assertPublicHttpUrl, proxiedMediaUrl } from "@/lib/mediaProxy";

export const MEDIA_LIBRARY_MAX = 20;
export const SESSION_MEDIA_MAX = 20;
export const PREVIEW_W = 67;
export const PREVIEW_H = 37;

export type MediaLibraryEntry = {
  id: string;
  url: string;
  name: string;
  createdAt: number;
};

/** In-tab only — not written to disk (unless pushed via Sync). */
export type SessionMediaEntry = {
  id: string;
  name: string;
  createdAt: number;
  /** Original bytes — kept for cross-tab Sync */
  blob: Blob;
  /** Full image object URL for shaders */
  objectUrl: string;
  /** Tiny thumb object URL for the picker */
  previewUrl: string;
};

/** Structured-clone payload for BroadcastChannel Sync. */
export type SessionMediaSyncItem = {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
};

const DB_NAME = "monitron-media-library";
const DB_VERSION = 1;
const STORE = "previews";
const META_KEY = "monitron:media-library:v1";
const CHANGE_EVENT = "monitron:user-media";

/** Legacy keys from earlier single-slot / multi-blob experiments */
const LEGACY_KEYS = [
  "monitron:user-bg:meta:v1",
  "monitron:user-media:meta:v1",
  "monitron:user-media:last:v1",
] as const;

const listeners = new Set<() => void>();
const previewObjectUrls = new Map<string, string>();

let listCache: MediaLibraryEntry[] | null = null;
const EMPTY_LIST: MediaLibraryEntry[] = [];
let storageHooked = false;

function emit() {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function invalidateUserMediaCache(): void {
  listCache = null;
}

function wipeLegacy() {
  try {
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
  } catch {
    /* */
  }
}

function ensureStorageHook() {
  if (storageHooked || typeof window === "undefined") return;
  storageHooked = true;
  wipeLegacy();
  window.addEventListener("storage", (e) => {
    if (e.key !== META_KEY) return;
    listCache = null;
    for (const url of previewObjectUrls.values()) URL.revokeObjectURL(url);
    previewObjectUrls.clear();
    emit();
  });
}

export function subscribeUserMedia(listener: () => void): () => void {
  ensureStorageHook();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function readList(): MediaLibraryEntry[] {
  if (typeof window === "undefined") return EMPTY_LIST;
  ensureStorageHook();
  if (listCache) return listCache;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) {
      listCache = EMPTY_LIST;
      return listCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      listCache = EMPTY_LIST;
      return listCache;
    }
    listCache = parsed.filter(
      (e): e is MediaLibraryEntry =>
        Boolean(e) &&
        typeof e === "object" &&
        typeof (e as MediaLibraryEntry).id === "string" &&
        typeof (e as MediaLibraryEntry).url === "string",
    );
    return listCache;
  } catch {
    listCache = EMPTY_LIST;
    return listCache;
  }
}

function writeList(list: MediaLibraryEntry[]) {
  listCache = list;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
  emit();
}

export function listMediaLibrary(): MediaLibraryEntry[] {
  return readList();
}

export function getMediaLibraryEntry(id: string): MediaLibraryEntry | null {
  return readList().find((e) => e.id === id) ?? null;
}

export function mediaLibraryCount(): number {
  return readList().length;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
}

async function idbPutPreview(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
    });
  } finally {
    db.close();
  }
}

async function idbGetPreview(id: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("idb get failed"));
    });
  } finally {
    db.close();
  }
}

async function idbDeletePreview(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
    });
  } finally {
    db.close();
  }
}

function revokePreviewUrl(id: string) {
  const u = previewObjectUrls.get(id);
  if (u) {
    URL.revokeObjectURL(u);
    previewObjectUrls.delete(id);
  }
}

/** Tiny object URL for picker thumbs (not the full image). */
export async function getMediaPreviewObjectUrl(
  id: string,
): Promise<string | null> {
  const cached = previewObjectUrls.get(id);
  if (cached) return cached;
  try {
    const blob = await idbGetPreview(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    previewObjectUrls.set(id, url);
    return url;
  } catch {
    return null;
  }
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

/** Cover-fit into PREVIEW_W×PREVIEW_H webp/jpeg blob. */
export async function makePreviewBlob(
  source: Blob,
  signal?: AbortSignal,
): Promise<Blob> {
  throwIfAborted(signal);

  // Decode off the main thread when possible; cap decode size so phones
  // don't hitch on multi‑MB library URLs.
  const maxEdge = Math.max(PREVIEW_W, PREVIEW_H) * 4;
  let bitmap: ImageBitmap | null = null;
  if (typeof createImageBitmap === "function") {
    try {
      // One edge only — keeps aspect; caps decode cost on big library URLs
      bitmap = await createImageBitmap(source, {
        resizeWidth: maxEdge,
        resizeQuality: "low",
      });
    } catch {
      bitmap = null;
    }
  }
  throwIfAborted(signal);

  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_W;
  canvas.height = PREVIEW_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  if (bitmap) {
    const sw = bitmap.width;
    const sh = bitmap.height;
    const scale = Math.max(PREVIEW_W / sw, PREVIEW_H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(bitmap, (PREVIEW_W - dw) / 2, (PREVIEW_H - dh) / 2, dw, dh);
    bitmap.close();
  } else {
    const img = await loadImageFromBlob(source);
    throwIfAborted(signal);
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const scale = Math.max(PREVIEW_W / sw, PREVIEW_H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(img, (PREVIEW_W - dw) / 2, (PREVIEW_H - dh) / 2, dw, dh);
  }

  throwIfAborted(signal);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", 0.72);
  });
  if (blob) return blob;

  const jpeg = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72);
  });
  if (!jpeg) throw new Error("Preview encode failed");
  return jpeg;
}

const IMAGE_MIME = /^image\//;

export type AddMediaFromUrlOptions = {
  signal?: AbortSignal;
  /** 0…1 when Content-Length known; null = indeterminate */
  onProgress?: (ratio: number | null) => void;
};

async function readResponseBlob(
  res: Response,
  signal: AbortSignal | undefined,
  onProgress?: (ratio: number | null) => void,
): Promise<Blob> {
  const total = Number(res.headers.get("content-length")) || 0;
  const type = res.headers.get("content-type") || "";
  if (!res.body?.getReader) {
    onProgress?.(null);
    const blob = await res.blob();
    throwIfAborted(signal);
    onProgress?.(1);
    return blob;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  onProgress?.(total > 0 ? 0 : null);

  try {
    for (;;) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(total > 0 ? Math.min(1, received / total) : null);
    }
  } catch (e) {
    try {
      await reader.cancel();
    } catch {
      /* */
    }
    throw e;
  }

  onProgress?.(1);
  // BlobPart accepts BufferSource; spread typed arrays without copying twice
  return new Blob(chunks as BlobPart[], { type });
}

/**
 * Fetch URL → tiny preview in IDB + meta in localStorage.
 * Full image is never stored; screens load from `url` at draw time.
 */
export async function addMediaFromUrl(
  rawUrl: string,
  opts: AddMediaFromUrlOptions = {},
): Promise<MediaLibraryEntry> {
  const { signal, onProgress } = opts;
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Empty URL");
  throwIfAborted(signal);
  const parsed = assertPublicHttpUrl(trimmed);

  const list = readList();
  const existing = list.find((e) => e.url === parsed.toString());
  if (existing) {
    onProgress?.(1);
    return existing;
  }

  if (list.length >= MEDIA_LIBRARY_MAX) {
    throw new Error(`Library full (${MEDIA_LIBRARY_MAX} URLs max)`);
  }

  // Same-origin proxy — direct cors fetch 403s on many CDNs in production
  const res = await fetch(proxiedMediaUrl(parsed.toString()), { signal });
  throwIfAborted(signal);
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) detail = `: ${j.error}`;
    } catch {
      /* body may be binary on success paths only */
    }
    throw new Error(`Fetch failed (${res.status})${detail}`);
  }
  const full = await readResponseBlob(res, signal, onProgress);
  if (full.type && !IMAGE_MIME.test(full.type)) {
    throw new Error("URL did not return an image");
  }

  onProgress?.(null); // preview encode — indeterminate
  const preview = await makePreviewBlob(full, signal);
  throwIfAborted(signal);
  const id = newId();
  await idbPutPreview(id, preview);
  throwIfAborted(signal);

  const entry: MediaLibraryEntry = {
    id,
    url: parsed.toString(),
    name: parsed.pathname.split("/").filter(Boolean).pop() || "image",
    createdAt: Date.now(),
  };
  writeList([entry, ...list]);
  onProgress?.(1);
  return entry;
}

/** Draw-time URL for a library entry (proxied when remote). */
export function libraryImageSrc(entry: MediaLibraryEntry): string {
  return proxiedMediaUrl(entry.url);
}

export async function removeMediaLibraryEntry(id: string): Promise<void> {
  revokePreviewUrl(id);
  try {
    await idbDeletePreview(id);
  } catch {
    /* */
  }
  writeList(readList().filter((e) => e.id !== id));
}

export async function clearMediaLibrary(): Promise<void> {
  const list = readList();
  for (const e of list) revokePreviewUrl(e.id);
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("idb clear failed"));
      });
    } finally {
      db.close();
    }
  } catch {
    /* */
  }
  writeList([]);
}

// ── Session-only local files (RAM, shared across screens in this tab) ─

let sessionSnap: SessionMediaEntry[] = [];
const sessionById = new Map<string, SessionMediaEntry>();

function publishSession() {
  sessionSnap = [...sessionById.values()].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  emit();
}

export function listSessionMedia(): SessionMediaEntry[] {
  return sessionSnap;
}

export function getSessionMediaEntry(id: string): SessionMediaEntry | null {
  return sessionById.get(id) ?? null;
}

export function sessionMediaCount(): number {
  return sessionById.size;
}

function isImageFile(file: File): boolean {
  return (
    IMAGE_MIME.test(file.type) ||
    /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
  );
}

export async function addSessionMediaFromFile(
  file: File,
): Promise<SessionMediaEntry> {
  const [entry] = await addSessionMediaFromFiles([file]);
  if (!entry) throw new Error("Expected an image file");
  return entry;
}

/** Add up to remaining session slots. Non-images skipped. Throws if nothing added. */
export async function addSessionMediaFromFiles(
  files: Iterable<File>,
): Promise<SessionMediaEntry[]> {
  const room = SESSION_MEDIA_MAX - sessionById.size;
  if (room <= 0) {
    throw new Error(`Session full (${SESSION_MEDIA_MAX} files max)`);
  }

  const candidates: File[] = [];
  for (const file of files) {
    if (!isImageFile(file)) continue;
    candidates.push(file);
    if (candidates.length >= room) break;
  }
  if (candidates.length === 0) {
    throw new Error("Expected image file(s)");
  }

  const added: SessionMediaEntry[] = [];
  const base = Date.now();
  for (let i = 0; i < candidates.length; i++) {
    const file = candidates[i]!;
    const preview = await makePreviewBlob(file);
    const entry: SessionMediaEntry = {
      id: newId(),
      name: file.name || "image",
      createdAt: base + i,
      blob: file,
      objectUrl: URL.createObjectURL(file),
      previewUrl: URL.createObjectURL(preview),
    };
    sessionById.set(entry.id, entry);
    added.push(entry);
  }
  publishSession();
  return added;
}

export function removeSessionMedia(id: string): void {
  const e = sessionById.get(id);
  if (!e) return;
  URL.revokeObjectURL(e.objectUrl);
  URL.revokeObjectURL(e.previewUrl);
  sessionById.delete(id);
  publishSession();
}

export function clearSessionMedia(): void {
  for (const e of sessionById.values()) {
    URL.revokeObjectURL(e.objectUrl);
    URL.revokeObjectURL(e.previewUrl);
  }
  sessionById.clear();
  publishSession();
}

/** Snapshot for Sync — preserves ids so peer prefs.sessionId still resolve. */
export function exportSessionMediaForSync(): SessionMediaSyncItem[] {
  return sessionSnap.map((e) => ({
    id: e.id,
    name: e.name,
    createdAt: e.createdAt,
    blob: e.blob,
  }));
}

/**
 * Replace this tab's session pool with a Sync payload (same ids).
 * Call before applying prefs that reference sessionId.
 */
export async function replaceSessionMediaFromSync(
  items: SessionMediaSyncItem[],
): Promise<void> {
  clearSessionMedia();
  const capped = items.slice(0, SESSION_MEDIA_MAX);
  for (const item of capped) {
    if (!item?.blob || typeof item.id !== "string") continue;
    const preview = await makePreviewBlob(item.blob);
    const entry: SessionMediaEntry = {
      id: item.id,
      name: item.name || "image",
      createdAt: Number(item.createdAt) || Date.now(),
      blob: item.blob,
      objectUrl: URL.createObjectURL(item.blob),
      previewUrl: URL.createObjectURL(preview),
    };
    sessionById.set(entry.id, entry);
  }
  publishSession();
}
