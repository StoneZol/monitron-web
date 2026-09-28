/** Generic JSON localStorage helpers — any key, any shape. */

export function loadLocal<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return structuredCloneSafe(defaults);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return structuredCloneSafe(defaults);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return structuredCloneSafe(defaults);
    }
    if (
      defaults &&
      typeof defaults === "object" &&
      !Array.isArray(defaults)
    ) {
      return { ...(defaults as object), ...(parsed as object) } as T;
    }
    return parsed as T;
  } catch {
    return structuredCloneSafe(defaults);
  }
}

export function saveLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — ignore
  }
}

function structuredCloneSafe<T>(value: T): T {
  if (value && typeof value === "object") {
    return { ...(value as object) } as T;
  }
  return value;
}
