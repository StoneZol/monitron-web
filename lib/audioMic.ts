import { packAnalyserSpectrum, type PackedSpectrum } from "./audioPack";

export type MicFrame = PackedSpectrum & {
  /** ms since mic capture start */
  t: number;
};

type MicCaptureHandlers = {
  onFrame: (frame: MicFrame) => void;
  onError?: (message: string) => void;
};

/** Default / max for ControlPanel noise-gate slider (RMS 0..1).
 * Mic RMS often sits tiny (~0.01–0.05 even when “loud”) — keep the
 * usable range tight so 0.03 doesn’t eat the whole signal.
 */
export const MIC_GATE_DEFAULT = 0.008;
export const MIC_GATE_MAX = 0.05;

/** Clamp live slider / prefs into the mic-gate window */
export function clampMicGate(value: number): number {
  if (!Number.isFinite(value)) return MIC_GATE_DEFAULT;
  return Math.min(MIC_GATE_MAX, Math.max(0, value));
}

/** Migrate stored prefs (old 0..0.3 scale / aggressive default) */
export function normalizeMicGate(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MIC_GATE_DEFAULT;
  }
  // Old default was 0.05 with max 0.3 — too hot for real mic RMS
  if (value > MIC_GATE_MAX || Math.abs(value - 0.05) < 1e-6) {
    return MIC_GATE_DEFAULT;
  }
  return clampMicGate(value);
}

/**
 * Soft RMS gate — kills idle room hiss below threshold, fades in above it.
 * threshold 0 = pass-through.
 */
export function gateMicFrame(
  bands: number[],
  rms: number,
  peak: number,
  threshold: number,
): { bands: number[]; rms: number; peak: number } {
  const thr = Math.max(0, Math.min(0.5, threshold));
  if (thr <= 0.001) {
    return { bands, rms, peak };
  }

  const closed = thr;
  // Narrow knee — open quickly once past the hiss floor
  const openAt = Math.min(1, thr + Math.max(0.008, thr * 0.5));
  let open = 0;
  if (rms <= closed) open = 0;
  else if (rms >= openAt) open = 1;
  else open = (rms - closed) / (openAt - closed);

  if (open <= 0) {
    return {
      bands: new Array<number>(bands.length).fill(0),
      rms: 0,
      peak: 0,
    };
  }
  if (open >= 0.999) {
    return { bands, rms, peak };
  }

  return {
    bands: bands.map((b) => b * open),
    rms: rms * open,
    peak: peak * open,
  };
}

/**
 * Browser mic → same packed spectrum as the plugin bus.
 * Mic quality will be lower (room noise / AGC); screens don't care about the source.
 */
export class MicCapture {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array<ArrayBuffer> | null = null;
  private time: Uint8Array<ArrayBuffer> | null = null;
  private raf = 0;
  private t0 = 0;
  private running = false;
  private handlers: MicCaptureHandlers | null = null;

  get active() {
    return this.running;
  }

  async start(handlers: MicCaptureHandlers) {
    await this.stop();
    this.handlers = handlers;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      const ctx = new AudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -25;
      source.connect(analyser);
      // Do not connect to destination — avoid mic monitor feedback

      this.stream = stream;
      this.ctx = ctx;
      this.analyser = analyser;
      this.freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      this.time = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      this.t0 = performance.now();
      this.running = true;

      stream.getAudioTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          void this.stop();
          this.handlers?.onError?.("mic ended");
        });
      });

      const tick = () => {
        if (
          !this.running ||
          !this.analyser ||
          !this.ctx ||
          !this.freq ||
          !this.time
        ) {
          return;
        }
        const packed = packAnalyserSpectrum(
          this.analyser,
          this.ctx.sampleRate,
          this.freq,
          this.time,
        );
        this.handlers?.onFrame({
          ...packed,
          t: performance.now() - this.t0,
        });
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    } catch (err) {
      await this.stop();
      const message =
        err instanceof Error ? err.message : "mic permission denied";
      handlers.onError?.(message);
      throw err;
    }
  }

  async stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    this.freq = null;
    this.time = null;
    if (this.ctx) {
      await this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
