export const AUDIO_BUS_SOURCE = "monitron-extension" as const;
export const AUDIO_PAGE_SOURCE = "monitron-page" as const;

/** Chrome extension repo — shown when the plugin is offline */
export const PLUGIN_URL = "https://github.com/StoneZol/monitron-plugin";

export const AUDIO_FRAME_TYPE = "audio-frame" as const;
export const AUDIO_HELLO_TYPE = "hello" as const;
/** Page asks extension to start/stop feeding bands into the visualizer */
export const AUDIO_VIZ_TYPE = "visualizer-toggle" as const;
export const AUDIO_HELLO_REQUEST_TYPE = "hello-request" as const;

/**
 * Fixed log-spaced spectrum from the plugin.
 * Plugin packs FFT → these bins; screens derive meaning (EQ / onset) locally.
 */
export const AUDIO_BAND_COUNT = 32;
export const AUDIO_BAND_FMIN = 20;
export const AUDIO_BAND_FMAX = 16000;

/** Raw frame from the extension — no named EQ / beat logic */
export type AudioFrame = {
  source: typeof AUDIO_BUS_SOURCE;
  type: typeof AUDIO_FRAME_TYPE;
  /** ms since capture start */
  t: number;
  sampleRate: number;
  /** length AUDIO_BAND_COUNT, each 0..1 */
  bands: number[];
  /** Time-domain RMS 0..1 */
  rms: number;
  /** Time-domain peak 0..1 */
  peak: number;
};

export type AudioHello = {
  source: typeof AUDIO_BUS_SOURCE;
  type: typeof AUDIO_HELLO_TYPE;
};

export type AudioHelloRequest = {
  source: typeof AUDIO_PAGE_SOURCE;
  type: typeof AUDIO_HELLO_REQUEST_TYPE;
};

export type AudioVisualizerToggle = {
  source: typeof AUDIO_PAGE_SOURCE;
  type: typeof AUDIO_VIZ_TYPE;
  enabled: boolean;
};

/** What screens read each frame (raw bus mirror; meaning derived on the screen) */
export type VizBands = {
  enabled: boolean;
  /** Live spectrum (same layout as AudioFrame.bands) */
  bands: number[];
  rms: number;
  peak: number;
};

export function emptyVizBands(enabled = false): VizBands {
  return {
    enabled,
    bands: new Array(AUDIO_BAND_COUNT).fill(0),
    rms: 0,
    peak: 0,
  };
}

export function bandHzRange(
  index: number,
  count = AUDIO_BAND_COUNT,
  fmin = AUDIO_BAND_FMIN,
  fmax = AUDIO_BAND_FMAX,
): { lo: number; hi: number } {
  const i = Math.max(0, Math.min(count - 1, index));
  const logMin = Math.log(fmin);
  const logMax = Math.log(fmax);
  const lo = Math.exp(logMin + (i / count) * (logMax - logMin));
  const hi = Math.exp(logMin + ((i + 1) / count) * (logMax - logMin));
  return { lo, hi };
}

export function isAudioFrame(data: unknown): data is AudioFrame {
  if (!data || typeof data !== "object") return false;
  const frame = data as Record<string, unknown>;
  if (
    frame.source !== AUDIO_BUS_SOURCE ||
    frame.type !== AUDIO_FRAME_TYPE ||
    typeof frame.t !== "number" ||
    typeof frame.sampleRate !== "number" ||
    typeof frame.rms !== "number" ||
    typeof frame.peak !== "number" ||
    !Array.isArray(frame.bands)
  ) {
    return false;
  }
  const bands = frame.bands as unknown[];
  if (bands.length < 8) return false;
  for (let i = 0; i < bands.length; i++) {
    if (typeof bands[i] !== "number") return false;
  }
  return true;
}

export function isAudioHello(data: unknown): data is AudioHello {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return msg.source === AUDIO_BUS_SOURCE && msg.type === AUDIO_HELLO_TYPE;
}

/** Ask extension to start/stop streaming bands for the visualizer */
export function postVisualizerToggle(enabled: boolean) {
  const message: AudioVisualizerToggle = {
    source: AUDIO_PAGE_SOURCE,
    type: AUDIO_VIZ_TYPE,
    enabled,
  };
  window.postMessage(message, "*");
}

/** Page asks content script to (re)announce — hello often races React mount */
export function postHelloRequest() {
  const message: AudioHelloRequest = {
    source: AUDIO_PAGE_SOURCE,
    type: AUDIO_HELLO_REQUEST_TYPE,
  };
  window.postMessage(message, "*");
}

/**
 * Extension → page:
 *   { source: 'monitron-extension', type: 'hello' }
 *   { source: 'monitron-extension', type: 'audio-frame', t, sampleRate, bands[], rms, peak }
 * Page → extension:
 *   { source: 'monitron-page', type: 'hello-request' }
 *   { source: 'monitron-page', type: 'visualizer-toggle', enabled }
 */
export function subscribeAudioBus(handlers: {
  onHello?: () => void;
  onFrame?: (frame: AudioFrame) => void;
}): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window && event.source != null) return;
    if (isAudioHello(event.data)) {
      handlers.onHello?.();
      return;
    }
    if (isAudioFrame(event.data)) {
      handlers.onFrame?.(event.data);
    }
  };

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
