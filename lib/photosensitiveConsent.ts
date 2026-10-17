/** First-visit hazard gate — shared by alert UI + tamper tripwire. */
export const PHOTOSENSITIVE_STORAGE_KEY = "monitron:photosensitive-alert:v4";

export const CONSENT_GATE_ATTR = "data-monitron-consent-gate";
export const CONSENT_GATE_ID = "photosensitive";
export const CONSENT_GATE_SELECTOR = `[${CONSENT_GATE_ATTR}="${CONSENT_GATE_ID}"]`;

const bootListeners = new Set<() => void>();

let bootChecked = false;
let bootAccepted = false;

export function readPhotosensitiveAccepted(): boolean {
  try {
    return window.localStorage.getItem(PHOTOSENSITIVE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePhotosensitiveAccepted(): void {
  try {
    window.localStorage.setItem(PHOTOSENSITIVE_STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Blue pill — stay in the Matrix: wipe hazard accept so the gate returns. */
export function clearPhotosensitiveAccepted(): void {
  try {
    window.localStorage.removeItem(PHOTOSENSITIVE_STORAGE_KEY);
  } catch {
    /* private mode */
  }
  bootAccepted = false;
}

/** True after PhotosensitiveAlert has read localStorage on the client. */
export function isPhotosensitiveBootChecked(): boolean {
  return bootChecked;
}

export function isPhotosensitiveBootAccepted(): boolean {
  return bootAccepted;
}

export function markPhotosensitiveBoot(accepted: boolean): void {
  bootChecked = true;
  bootAccepted = accepted;
  for (const listener of bootListeners) listener();
}

export function subscribePhotosensitiveBoot(listener: () => void): () => void {
  bootListeners.add(listener);
  return () => {
    bootListeners.delete(listener);
  };
}
