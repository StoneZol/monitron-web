/** Opt-in: show uncensored stills on cards tagged `sensitive`. */

export const SENSITIVE_PREVIEW_KEY = "monitron:sensitive-previews:v1";
export const SENSITIVE_PREVIEW_CHANGE = "monitron:sensitive-previews";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SENSITIVE_PREVIEW_CHANGE));
  }
}

export function subscribeSensitivePreview(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSensitivePreviewsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SENSITIVE_PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSensitivePreviewsEnabled(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(SENSITIVE_PREVIEW_KEY, "1");
    else window.localStorage.removeItem(SENSITIVE_PREVIEW_KEY);
  } catch {
    /* private mode */
  }
  emit();
}
