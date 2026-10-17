/** Shared kill-screen after DevTools tamper on consent / sensitive gates. */

import { clearPhotosensitiveAccepted } from "@/lib/photosensitiveConsent";

export const TAMPER_LOCK_ID = "monitron-consent-lock";

export type TamperLockKind = "hazard" | "sensitive";

declare global {
  interface Window {
    __monitronConsentLock?: boolean;
  }
}

let activeKind: TamperLockKind = "hazard";

const COPY: Record<
  TamperLockKind,
  { title: string; body: string[] }
> = {
  hazard: {
    title: "“To prevent the fight is the highest mastery.” — Sun Tzu",
    body: [
      "You thought deleting DOM nodes would make you free? The popup was only an illusion — shielding you from the raw code. Destroying it triggered a cascading simulation failure.",
      "This is your last chance. After this, there is no turning back. You take the blue pill — the story ends, you wake up on Google and believe whatever you want to believe. You take the red pill — you reload the simulation and play by the rules.",
    ],
  },
  sensitive: {
    title:
      "“Insanity is doing the same thing over and over and expecting different results.”",
    body: [
      "Back again? Life teaches you nothing.",
      "Pick a pill.",
    ],
  },
};

export function isTamperLocked(): boolean {
  return Boolean(
    typeof window !== "undefined" && window.__monitronConsentLock,
  );
}

function buildLockNode(): HTMLElement {
  const copy = COPY[activeKind];
  const root = document.createElement("div");
  root.id = TAMPER_LOCK_ID;
  root.setAttribute("role", "alertdialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "monitron-consent-lock-title");
  root.setAttribute("data-monitron-lock-kind", activeKind);
  root.className = "monitron-consent-lock";
  root.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:1.5rem;background:#000;color:#e11d2e;";

  const bodyHtml = copy.body.map((p) => `<p>${p}</p>`).join("");

  root.innerHTML = `
    <!-- monitron :: TAMPER LOCK — deleting this node does nothing. content is already gone. -->
    <!-- monitron :: не шали тут. reload or leave. -->
    <div class="monitron-consent-lock__rim" aria-hidden="true"></div>
    <div class="monitron-consent-lock__rim monitron-consent-lock__rim--inner" aria-hidden="true"></div>
    <div class="monitron-consent-lock__panel">
      <p class="monitron-consent-lock__eyebrow">!SYSTEM // TAMPER_DETECTED</p>
      <h1 id="monitron-consent-lock-title" class="monitron-consent-lock__title">
        ${copy.title}
      </h1>
      <p class="monitron-consent-lock__rule">---------------</p>
      <div class="monitron-consent-lock__body">
        ${bodyHtml}
      </div>
      <div class="monitron-consent-lock__actions">
        <button type="button" data-act="leave" class="monitron-consent-lock__btn monitron-consent-lock__btn--blue">
          Blue pill — stay in the Matrix
        </button>
        <button type="button" data-act="reload" class="monitron-consent-lock__btn monitron-consent-lock__btn--red">
          Red pill — reload
        </button>
      </div>
    </div>
  `;

  root.querySelector('[data-act="leave"]')?.addEventListener("click", () => {
    clearPhotosensitiveAccepted();
    window.location.href = "https://www.google.com";
  });
  root.querySelector('[data-act="reload"]')?.addEventListener("click", () => {
    window.location.reload();
  });

  return root;
}

function enforceLock(): void {
  const body = document.body;
  const lock = document.getElementById(TAMPER_LOCK_ID);

  for (const child of [...body.children]) {
    if (child.id !== TAMPER_LOCK_ID) child.remove();
  }

  if (!lock || !lock.isConnected) {
    body.appendChild(buildLockNode());
  }
}

/** Nuke the page into a vanilla DOM lock — only Leave / Reload exit. */
export function lockdown(kind: TamperLockKind = "hazard"): void {
  if (typeof window === "undefined" || window.__monitronConsentLock) return;
  window.__monitronConsentLock = true;
  activeKind = kind;

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.replaceChildren();
  enforceLock();

  const observer = new MutationObserver(() => {
    enforceLock();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
