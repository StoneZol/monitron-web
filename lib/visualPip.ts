/**
 * Prototype: float the screen WebGL canvas in Picture-in-Picture.
 * Prefers Document PiP (move R3F Canvas shell); falls back to video PiP via captureStream.
 */

import { _roots } from "@react-three/fiber";

type DocumentPip = {
  requestWindow: (options?: {
    width?: number;
    height?: number;
    preferInitialWindowPlacement?: boolean;
  }) => Promise<Window>;
  window: Window | null;
};

function getDocumentPip(): DocumentPip | null {
  if (typeof window === "undefined") return null;
  const api = (
    window as Window & { documentPictureInPicture?: DocumentPip }
  ).documentPictureInPicture;
  return api ?? null;
}

export function isVisualPipSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (getDocumentPip()) return true;
  return (
    "pictureInPictureEnabled" in document &&
    Boolean(document.pictureInPictureEnabled)
  );
}

export const VISUAL_PIP_CHANGE = "monitron:visual-pip";

/** R3F Canvas outer shell we moved into the PiP window */
let movedRoot: HTMLElement | null = null;
let homeParent: Element | null = null;
let homeNextSibling: ChildNode | null = null;
let savedRootStyle: string | null = null;
let pipWindowRef: Window | null = null;
let videoFallback: HTMLVideoElement | null = null;
let pipResizeObs: ResizeObserver | null = null;
let homeResizeObs: ResizeObserver | null = null;

function emitPipChange() {
  window.dispatchEvent(new Event(VISUAL_PIP_CHANGE));
}

function canvasFromRoot(root: HTMLElement): HTMLCanvasElement | null {
  if (root.matches("canvas")) return root as HTMLCanvasElement;
  return root.querySelector("canvas");
}

/** Measure against the viewport host, not a collapsed content-sized child. */
function measureSize(root: HTMLElement): { width: number; height: number } {
  const parent = root.parentElement;
  const width =
    root.clientWidth ||
    parent?.clientWidth ||
    (root.ownerDocument.defaultView?.innerWidth ?? window.innerWidth);
  const height =
    root.clientHeight ||
    parent?.clientHeight ||
    (root.ownerDocument.defaultView?.innerHeight ?? window.innerHeight);
  return { width, height };
}

function syncR3fSize(root: HTMLElement) {
  const canvas = canvasFromRoot(root);
  if (!canvas) return;
  const fiber = _roots.get(canvas);
  if (!fiber) return;
  const { width, height } = measureSize(root);
  if (width < 1 || height < 1) return;
  fiber.store.getState().setSize(width, height);
}

function kickResize(root?: HTMLElement | null) {
  const target = root ?? movedRoot;
  if (target) syncR3fSize(target);
  window.dispatchEvent(new Event("resize"));
  pipWindowRef?.dispatchEvent(new Event("resize"));
}

function kickResizeAfterLayout(root: HTMLElement) {
  kickResize(root);
  requestAnimationFrame(() => {
    kickResize(root);
    requestAnimationFrame(() => kickResize(root));
  });
  window.setTimeout(() => kickResize(root), 50);
  window.setTimeout(() => kickResize(root), 200);
}

function findScreenCanvas(): HTMLCanvasElement | null {
  if (pipWindowRef && !pipWindowRef.closed) {
    const inPip = pipWindowRef.document.querySelector("canvas");
    if (inPip) return inPip;
  }
  return document.querySelector("canvas");
}

/**
 * R3F DOM: outer shell (className/position) > measure div > canvas.
 * Move the outer shell so home layout + useMeasure keep working.
 * Fx overlays mount inside this same shell so Document PiP takes them too.
 */
export function findMoveRoot(canvas: HTMLCanvasElement): HTMLElement {
  const measure = canvas.parentElement;
  const outer = measure?.parentElement;
  if (outer instanceof HTMLElement) return outer;
  if (measure instanceof HTMLElement) return measure;
  return canvas;
}

function stylePipBody(doc: Document) {
  doc.documentElement.style.cssText = "width:100%;height:100%;margin:0;";
  doc.body.style.cssText =
    "margin:0;width:100%;height:100%;background:#000;overflow:hidden;position:relative;";
}

function styleRootFill(root: HTMLElement) {
  root.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;overflow:hidden;";
}

function clearPipResizeObs() {
  pipResizeObs?.disconnect();
  pipResizeObs = null;
}

function clearHomeResizeObs() {
  homeResizeObs?.disconnect();
  homeResizeObs = null;
}

function watchHomeResize(root: HTMLElement) {
  clearHomeResizeObs();
  if (typeof ResizeObserver === "undefined") return;
  homeResizeObs = new ResizeObserver(() => kickResize(root));
  const host = root.parentElement ?? root;
  homeResizeObs.observe(host);
}

function restoreMovedRoot() {
  if (!movedRoot || !homeParent) return;
  const root = movedRoot;
  if (homeNextSibling && homeNextSibling.parentNode === homeParent) {
    homeParent.insertBefore(root, homeNextSibling);
  } else {
    homeParent.append(root);
  }

  // Restore React/R3F inline styles (never leave a content-sized shell)
  if (savedRootStyle != null) {
    root.setAttribute("style", savedRootStyle);
  } else {
    root.style.cssText =
      "position:relative;width:100%;height:100%;overflow:hidden;";
  }
  savedRootStyle = null;

  movedRoot = null;
  homeParent = null;
  homeNextSibling = null;
  pipWindowRef = null;

  kickResizeAfterLayout(root);
  watchHomeResize(root);
}

async function closeDocumentPip(): Promise<boolean> {
  const api = getDocumentPip();
  const win = pipWindowRef ?? api?.window ?? null;
  if (!win || win.closed) {
    pipWindowRef = null;
    return false;
  }
  win.close();
  return true;
}

async function enterDocumentPip(canvas: HTMLCanvasElement): Promise<boolean> {
  const api = getDocumentPip();
  if (!api) return false;

  if ((pipWindowRef && !pipWindowRef.closed) || api.window) {
    await closeDocumentPip();
    return true;
  }

  clearHomeResizeObs();

  const root = findMoveRoot(canvas);
  homeParent = root.parentElement;
  homeNextSibling = root.nextSibling;
  movedRoot = root;
  savedRootStyle = root.getAttribute("style");

  const pipWindow = await api.requestWindow({
    width: Math.min(640, Math.round(window.innerWidth * 0.45)),
    height: Math.min(360, Math.round(window.innerHeight * 0.45)),
    preferInitialWindowPlacement: true,
  });
  pipWindowRef = pipWindow;
  stylePipBody(pipWindow.document);
  styleRootFill(root);
  pipWindow.document.body.append(root);

  const onPipResize = () => {
    styleRootFill(root);
    kickResize(root);
  };

  clearPipResizeObs();
  if (typeof ResizeObserver !== "undefined") {
    pipResizeObs = new ResizeObserver(onPipResize);
    pipResizeObs.observe(pipWindow.document.documentElement);
  }
  pipWindow.addEventListener("resize", onPipResize);

  kickResizeAfterLayout(root);
  emitPipChange();

  const onLeave = () => {
    clearPipResizeObs();
    pipWindow.removeEventListener("resize", onPipResize);
    pipWindow.removeEventListener("pagehide", onLeave);
    restoreMovedRoot();
    emitPipChange();
  };
  pipWindow.addEventListener("pagehide", onLeave);
  return true;
}

async function enterVideoPip(canvas: HTMLCanvasElement): Promise<boolean> {
  if (!document.pictureInPictureEnabled) return false;

  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
    teardownVideoFallback();
    emitPipChange();
    return true;
  }

  const stream = canvas.captureStream(30);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-99px;top:-99px;";
  document.body.append(video);
  videoFallback = video;
  await video.play();
  await video.requestPictureInPicture();

  video.addEventListener(
    "leavepictureinpicture",
    () => {
      teardownVideoFallback();
      emitPipChange();
    },
    { once: true },
  );
  emitPipChange();
  return true;
}

function teardownVideoFallback() {
  if (!videoFallback) return;
  const stream = videoFallback.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  videoFallback.pause();
  videoFallback.removeAttribute("src");
  videoFallback.srcObject = null;
  videoFallback.remove();
  videoFallback = null;
}

/** Toggle visual into / out of Picture-in-Picture. Call from a user gesture. */
export async function toggleVisualPip(): Promise<"ok" | "unsupported" | "error"> {
  try {
    // Close first — mount may live in the PiP document, not opener.
    if (pipWindowRef && !pipWindowRef.closed) {
      await closeDocumentPip();
      return "ok";
    }
    const api = getDocumentPip();
    if (api?.window) {
      api.window.close();
      return "ok";
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      teardownVideoFallback();
      emitPipChange();
      return "ok";
    }

    const canvas = findScreenCanvas();
    if (!canvas) return "error";

    if (api) {
      await enterDocumentPip(canvas);
      return "ok";
    }
    const ok = await enterVideoPip(canvas);
    return ok ? "ok" : "unsupported";
  } catch (err) {
    console.error("[visualPip]", err);
    const canvas = findScreenCanvas();
    if (getDocumentPip() && canvas && !document.pictureInPictureElement) {
      try {
        restoreMovedRoot();
        const ok = await enterVideoPip(canvas);
        return ok ? "ok" : "error";
      } catch (err2) {
        console.error("[visualPip fallback]", err2);
        return "error";
      }
    }
    return "error";
  }
}

export function isVisualPipActive(): boolean {
  if (pipWindowRef && !pipWindowRef.closed) return true;
  const api = getDocumentPip();
  if (api?.window) return true;
  return Boolean(document.pictureInPictureElement);
}
