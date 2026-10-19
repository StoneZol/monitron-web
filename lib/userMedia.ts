/**
 * Single-slot user background — one blob in IndexedDB, tiny meta in localStorage.
 * Does not grow a library (prefs stay lean). File paths cannot be restored;
 * stock ids (/placeholders) are the durable restore button.
 */

export type UserMediaSource = "file" | "url";

export type UserBackgroundMeta = {
  name: string;
  mime: string;
  size: number;
  updatedAt: number;
  source: UserMediaSource;
  /** Original remote URL when source === "url" (re-fetchable hint only). */
  url?: string;
};

/** Fixed IndexedDB key — always at most one custom image. */
export const USER_BG_SLOT = "custom";

const DB_NAME = "monitron-user-media";
const DB_VERSION = 1;
const STORE = "blobs";
const META_KEY = "monitron:user-bg:meta:v1";
/** Legacy multi-library keys — wiped on first touch. */
const LEGACY_META_KEY = "monitron:user-media:meta:v1";
const LEGACY_LAST_KEY = "monitron:user-media:last:v1";
const CHANGE_EVENT = "monitron:user-media";

const listeners = new Set<() => void>();
let objectUrl: string | null = null;
let metaCache: UserBackgroundMeta | null | undefined;
let storageHooked = false;

function emit() {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function invalidateUserMediaCache(): void {
  metaCache = undefined;
}

function ensureStorageHook() {
  if (storageHooked || typeof window === "undefined") return;
  storageHooked = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== META_KEY) return;
    metaCache = undefined;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
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

function wipeLegacyLibraryKeys() {
  try {
    window.localStorage.removeItem(LEGACY_META_KEY);
    window.localStorage.removeItem(LEGACY_LAST_KEY);
  } catch {
    /* */
  }
}

function readMeta(): UserBackgroundMeta | null {
  if (typeof window === "undefined") return null;
  ensureStorageHook();
  wipeLegacyLibraryKeys();
  if (metaCache !== undefined) return metaCache;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) {
      metaCache = null;
      return null;
    }
    const parsed = JSON.parse(raw) as UserBackgroundMeta;
    if (!parsed || typeof parsed.name !== "string") {
      metaCache = null;
      return null;
    }
    metaCache = parsed;
    return metaCache;
  } catch {
    metaCache = null;
    return null;
  }
}

function writeMeta(meta: UserBackgroundMeta | null) {
  metaCache = meta;
  try {
    if (meta) window.localStorage.setItem(META_KEY, JSON.stringify(meta));
    else window.localStorage.removeItem(META_KEY);
  } catch {
    /* quota */
  }
  emit();
}

export function getUserBackgroundMeta(): UserBackgroundMeta | null {
  return readMeta();
}

export function hasUserBackground(): boolean {
  return readMeta() != null;
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

async function idbPut(blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      // Replace single slot; clear any leftover legacy ids
      tx.objectStore(STORE).clear();
      tx.objectStore(STORE).put(blob, USER_BG_SLOT);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
    });
  } finally {
    db.close();
  }
}

async function idbGet(): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(USER_BG_SLOT);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("idb get failed"));
    });
  } finally {
    db.close();
  }
}

async function idbClear(): Promise<void> {
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
}

function revokeObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

export async function getUserBackgroundObjectUrl(): Promise<string | null> {
  if (!readMeta()) return null;
  if (objectUrl) return objectUrl;
  try {
    const blob = await idbGet();
    if (!blob) return null;
    objectUrl = URL.createObjectURL(blob);
    return objectUrl;
  } catch {
    return null;
  }
}

const IMAGE_MIME = /^image\//i;

async function commitUserBackground(
  blob: Blob,
  meta: Omit<UserBackgroundMeta, "updatedAt" | "size" | "mime"> & {
    mime?: string;
  },
): Promise<UserBackgroundMeta> {
  revokeObjectUrl();
  await idbPut(blob);
  const entry: UserBackgroundMeta = {
    name: meta.name,
    mime: meta.mime || blob.type || "application/octet-stream",
    size: blob.size,
    updatedAt: Date.now(),
    source: meta.source,
    url: meta.url,
  };
  writeMeta(entry);
  return entry;
}

export async function setUserBackgroundFromFile(
  file: File,
): Promise<UserBackgroundMeta> {
  if (
    !IMAGE_MIME.test(file.type) &&
    !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
  ) {
    throw new Error("Expected an image file");
  }
  return commitUserBackground(file, {
    name: file.name || "image",
    mime: file.type,
    source: "file",
  });
}

export async function setUserBackgroundFromUrl(
  rawUrl: string,
): Promise<UserBackgroundMeta> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Empty URL");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs");
  }
  const res = await fetch(url.toString(), { mode: "cors" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const blob = await res.blob();
  if (!IMAGE_MIME.test(blob.type) && blob.type !== "") {
    throw new Error("URL did not return an image");
  }
  const name =
    url.pathname.split("/").filter(Boolean).pop() || "remote-image";
  return commitUserBackground(blob, {
    name,
    mime: blob.type || "image/jpeg",
    source: "url",
    url: url.toString(),
  });
}

export async function clearUserBackground(): Promise<void> {
  revokeObjectUrl();
  try {
    await idbClear();
  } catch {
    /* */
  }
  writeMeta(null);
}
