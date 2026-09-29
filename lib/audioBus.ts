export const AUDIO_BUS_SOURCE = "monitron-extension" as const;
export const AUDIO_PAGE_SOURCE = "monitron-page" as const;

export const AUDIO_FRAME_TYPE = "audio-frame" as const;
export const AUDIO_HELLO_TYPE = "hello" as const;
/** Page asks extension to start/stop feeding bands into the visualizer */
export const AUDIO_VIZ_TYPE = "visualizer-toggle" as const;
/** @deprecated legacy alias — still accepted by the plugin */
export const AUDIO_EQ_TYPE_LEGACY = "eq-toggle" as const;
export const AUDIO_HELLO_REQUEST_TYPE = "hello-request" as const;

/** Normalized 0..1 bands from the extension analyser */
export type AudioFrame = {
  source: typeof AUDIO_BUS_SOURCE;
  type: typeof AUDIO_FRAME_TYPE;
  t: number;
  bass: number;
  mid: number;
  high: number;
  beat: number;
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
  type: typeof AUDIO_VIZ_TYPE | typeof AUDIO_EQ_TYPE_LEGACY;
  enabled: boolean;
};

export type VizBands = {
  enabled: boolean;
  bass: number;
  mid: number;
  high: number;
  beat: number;
  /** Approx tempo from beat onsets (BPM). 0 = not locked yet */
  bpm: number;
};

export const EMPTY_VIZ_BANDS: VizBands = {
  enabled: false,
  bass: 0,
  mid: 0,
  high: 0,
  beat: 0,
  bpm: 0,
};

export function isAudioFrame(data: unknown): data is AudioFrame {
  if (!data || typeof data !== "object") return false;
  const frame = data as Record<string, unknown>;
  return (
    frame.source === AUDIO_BUS_SOURCE &&
    frame.type === AUDIO_FRAME_TYPE &&
    typeof frame.bass === "number" &&
    typeof frame.mid === "number" &&
    typeof frame.high === "number" &&
    typeof frame.beat === "number"
  );
}

export function isAudioHello(data: unknown): data is AudioHello {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return msg.source === AUDIO_BUS_SOURCE && msg.type === AUDIO_HELLO_TYPE;
}

export function isHelloRequest(data: unknown): data is AudioHelloRequest {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.source === AUDIO_PAGE_SOURCE && msg.type === AUDIO_HELLO_REQUEST_TYPE
  );
}

export function isVisualizerToggle(
  data: unknown,
): data is AudioVisualizerToggle {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.source === AUDIO_PAGE_SOURCE &&
    (msg.type === AUDIO_VIZ_TYPE || msg.type === AUDIO_EQ_TYPE_LEGACY) &&
    typeof msg.enabled === "boolean"
  );
}

/** Ask extension to start/stop streaming bands for the visualizer */
export function postVisualizerToggle(enabled: boolean) {
  const message: AudioVisualizerToggle = {
    source: AUDIO_PAGE_SOURCE,
    type: AUDIO_VIZ_TYPE,
    enabled,
  };
  // "*" so content script always receives it (origin matching can be flaky)
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
 *   { source: 'monitron-extension', type: 'audio-frame', bass, mid, high, beat, t }
 * Page → extension:
 *   { source: 'monitron-page', type: 'hello-request' }
 *   { source: 'monitron-page', type: 'visualizer-toggle', enabled }
 */
export function subscribeAudioBus(handlers: {
  onHello?: () => void;
  onFrame?: (frame: AudioFrame) => void;
}): () => void {
  const onMessage = (event: MessageEvent) => {
    // Same-window bus (content script postMessage). Ignore other frames/windows.
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
