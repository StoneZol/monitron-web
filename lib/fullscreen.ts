/** Toggle Fullscreen API (F11-like). Rejects silently if blocked / unsupported. */
export async function toggleFullscreen(
  target: Element = document.documentElement,
): Promise<void> {
  try {
    if (!document.fullscreenElement) {
      await target.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  } catch {
    // autoplay / permissions / iframe — ignore
  }
}
