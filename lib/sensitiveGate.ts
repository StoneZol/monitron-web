/** Sensitive channel hard-gate + toggle confirm — watched by SensitiveTripwire. */

export const SENSITIVE_GATE_ATTR = "data-monitron-sensitive-gate";
export const SENSITIVE_GATE_ID = "channel";
export const SENSITIVE_GATE_SELECTOR = `[${SENSITIVE_GATE_ATTR}="${SENSITIVE_GATE_ID}"]`;

/** HazardAlert `consentGate` id for the toggle’s final warning. */
export const SENSITIVE_CONFIRM_GATE_ID = "sensitive-confirm";
export const SENSITIVE_CONFIRM_SELECTOR = `[data-monitron-consent-gate="${SENSITIVE_CONFIRM_GATE_ID}"]`;

const confirmListeners = new Set<() => void>();

/**
 * True while the toggle confirm is supposed to be on screen.
 * Cleared only by intentional Keep locked / unlock / dismiss — not by F12 yeet.
 */
let confirmArmed = false;

function emitConfirm() {
  for (const listener of confirmListeners) listener();
}

export function armSensitiveConfirm(): void {
  confirmArmed = true;
  emitConfirm();
}

export function disarmSensitiveConfirm(): void {
  confirmArmed = false;
  emitConfirm();
}

export function isSensitiveConfirmArmed(): boolean {
  return confirmArmed;
}

export function subscribeSensitiveConfirm(listener: () => void): () => void {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
}
