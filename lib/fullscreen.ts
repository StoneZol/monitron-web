/**
 * Page Fullscreen API — the only immersive mode a site can request.
 * Browser F11 chrome-fullscreen is NOT exposed to JS (cannot be invoked or
 * exited from a click). Don't hijack F11; leave it to the browser.
 */

type DocWithVendors = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type ElWithVendors = Element & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export function getFullscreenElement(): Element | null {
  const doc = document as DocWithVendors;
  return (
    document.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

export function isFullscreen(): boolean {
  return Boolean(getFullscreenElement());
}

async function requestFs(target: Element): Promise<void> {
  const el = target as ElWithVendors;
  // navigationUI: "hide" is the closest the API gets to F11 (hide browser chrome).
  const opts: FullscreenOptions = { navigationUI: "hide" };
  if (target.requestFullscreen) {
    await target.requestFullscreen(opts);
    return;
  }
  if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen(opts);
    return;
  }
  if (el.mozRequestFullScreen) {
    await el.mozRequestFullScreen();
    return;
  }
  if (el.msRequestFullscreen) {
    await el.msRequestFullscreen();
  }
}

async function exitFs(): Promise<void> {
  const doc = document as DocWithVendors;
  if (!getFullscreenElement()) return;
  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
    return;
  }
  if (doc.mozCancelFullScreen) {
    await doc.mozCancelFullScreen();
    return;
  }
  if (doc.msExitFullscreen) {
    await doc.msExitFullscreen();
  }
}

/** Toggle Page Fullscreen API (on-screen button). */
export async function toggleFullscreen(
  target: Element = document.documentElement,
): Promise<void> {
  try {
    if (getFullscreenElement()) {
      await exitFs();
      return;
    }
    await requestFs(target);
  } catch {
    // permissions / iframe — ignore
  }
}

/**
 * Ensure Esc always leaves Page Fullscreen even if something ate the default.
 * Does not preventDefault — browser may also handle it.
 */
export function bindFullscreenEscape(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    if (!getFullscreenElement()) return;
    void exitFs();
  };
  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}
