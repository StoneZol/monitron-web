"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { AUDIO_BAND_COUNT, type VizBands } from "@/lib/audioBus";
import {
  advanceTwinkleHue,
  hueDegFromHex,
  resolveTwinkleColor,
} from "@/lib/twinkleHsl";
import { scaledPixelRatio } from "@/lib/renderScale";
import { VISUAL_PIP_CHANGE } from "@/lib/visualPip";
import type { SpectrumLive } from "./Spectrum.types";

/**
 * Visual AGC (RTA-style): each band keeps a slow peak ceiling; bar = raw / ceiling.
 * Quiet bands get higher coef, loud ones lower — peaks land near the same height.
 * Bus / other screens stay raw.
 */
const CEIL_DECAY_PER_SEC = 0.45;
const CEIL_FLOOR = 0.05;

type SpectrumCanvasProps = {
  liveRef: RefObject<SpectrumLive>;
  vizRef: RefObject<VizBands>;
};

function parseHex(hex: string): [number, number, number] {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n)) return [0, 240, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpByte(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

/**
 * DOM matches R3F PiP adopt: outer shell > measure > canvas.
 * Only the shell moves into Document PiP; Controls stay on the page.
 */
export default function SpectrumCanvas({
  liveRef,
  vizRef,
}: SpectrumCanvasProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef(new Float32Array(AUDIO_BAND_COUNT));
  const ceilRef = useRef(new Float32Array(AUDIO_BAND_COUNT));
  const phaseRef = useRef(0);
  const lastTRef = useRef(0);
  const lowTint = useRef(new THREE.Color());
  const highTint = useRef(new THREE.Color());

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let cssW = 0;
    let cssH = 0;
    let rafView: Window = window;

    const viewOf = () => canvas.ownerDocument.defaultView ?? window;

    const cancelRaf = () => {
      rafView.cancelAnimationFrame(raf);
      if (rafView !== window) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const measureHost = () => {
      const parent = shell.parentElement;
      const view = viewOf();
      const width =
        shell.clientWidth ||
        parent?.clientWidth ||
        view.innerWidth ||
        window.innerWidth;
      const height =
        shell.clientHeight ||
        parent?.clientHeight ||
        view.innerHeight ||
        window.innerHeight;
      return {
        width: Math.max(1, width),
        height: Math.max(1, height),
      };
    };

    const resize = () => {
      const { width, height } = measureHost();
      const dpr = scaledPixelRatio(2, "spectrum");
      const nextW = Math.floor(width * dpr);
      const nextH = Math.floor(height * dpr);
      if (
        Math.abs(width - cssW) < 0.5 &&
        Math.abs(height - cssH) < 0.5 &&
        canvas.width === nextW &&
        canvas.height === nextH
      ) {
        return;
      }
      cssW = width;
      cssH = height;
      canvas.width = nextW;
      canvas.height = nextH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#030405";
      ctx.fillRect(0, 0, cssW, cssH);
    };

    const drawBar = (
      x: number,
      barW: number,
      raw: number,
      peak: number,
      plotTop: number,
      plotH: number,
      r: number,
      g: number,
      b: number,
      live: boolean,
    ) => {
      const h = raw * plotH;
      const ph = peak * plotH;
      const y = plotTop + plotH - h;

      const grad = ctx.createLinearGradient(0, plotTop + plotH, 0, plotTop);
      grad.addColorStop(0, `rgba(${r},${g},${b},${live ? 0.35 : 0.08})`);
      grad.addColorStop(0.55, `rgba(${r},${g},${b},${live ? 0.85 : 0.18})`);
      grad.addColorStop(
        1,
        `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},${live ? 0.95 : 0.22})`,
      );
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, Math.max(0, h));

      if (ph > 1.5) {
        ctx.fillStyle = live
          ? "rgba(230, 235, 231, 0.92)"
          : "rgba(230, 235, 231, 0.18)";
        ctx.fillRect(x, plotTop + plotH - ph, barW, 2);
      }
    };

    const draw = (nowMs: number) => {
      resize();

      const t = nowMs / 1000;
      const dt =
        lastTRef.current > 0
          ? Math.min(0.05, Math.max(0, t - lastTRef.current))
          : 0;
      lastTRef.current = t;

      const live = liveRef.current;
      const viz = vizRef.current;
      const armed = Boolean(viz?.enabled);
      const bands = viz?.bands ?? [];
      const rms = armed ? Math.max(0, Math.min(1, viz.rms)) : 0;
      const peak = armed ? Math.max(0, Math.min(1, viz.peak)) : 0;
      const decay = live?.peakDecay ?? 0.92;
      const mirror = Boolean(live?.mirror);
      const showRail = live?.showRail !== false;

      let lr: number;
      let lg: number;
      let lb: number;
      let hr: number;
      let hg: number;
      let hb: number;

      if (live?.twinkle) {
        phaseRef.current = advanceTwinkleHue(
          phaseRef.current,
          dt,
          live.twinkleSpeed,
        );
        const hLow =
          (hueDegFromHex(live.colorLow) + phaseRef.current) % 360;
        const hHigh =
          (hueDegFromHex(live.colorHigh) + phaseRef.current) % 360;
        resolveTwinkleColor(
          hLow,
          live.twinkleS,
          live.twinkleL,
          lowTint.current,
        );
        resolveTwinkleColor(
          hHigh,
          live.twinkleS,
          live.twinkleL,
          highTint.current,
        );
        lr = Math.round(lowTint.current.r * 255);
        lg = Math.round(lowTint.current.g * 255);
        lb = Math.round(lowTint.current.b * 255);
        hr = Math.round(highTint.current.r * 255);
        hg = Math.round(highTint.current.g * 255);
        hb = Math.round(highTint.current.b * 255);
      } else {
        [lr, lg, lb] = parseHex(live?.colorLow ?? "#00f0ff");
        [hr, hg, hb] = parseHex(live?.colorHigh ?? "#c6ff4a");
      }

      ctx.fillStyle = "#030405";
      ctx.fillRect(0, 0, cssW, cssH);

      const vig = ctx.createRadialGradient(
        cssW * 0.5,
        cssH * 0.55,
        cssH * 0.15,
        cssW * 0.5,
        cssH * 0.5,
        cssH * 0.85,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, cssW, cssH);

      const padX = Math.max(16, cssW * 0.04);
      const padTop = Math.max(28, cssH * 0.08);
      const padBot = showRail
        ? Math.max(36, cssH * 0.1)
        : Math.max(24, cssH * 0.06);
      const plotW = cssW - padX * 2;
      const plotH = Math.max(1, cssH - padTop - padBot);
      const n = AUDIO_BAND_COUNT;
      const gap = Math.max(1, (plotW / n) * 0.12);
      const barW = Math.max(2, (plotW - gap * (n - 1)) / n);
      const peaks = peaksRef.current;
      const ceils = ceilRef.current;
      const ceilFall = Math.exp(-CEIL_DECAY_PER_SEC * dt);

      let sharedCeil = CEIL_FLOOR;
      for (let i = 0; i < n; i++) {
        const x = armed ? Math.max(0, Math.min(1, bands[i] ?? 0)) : 0;
        ceils[i] = Math.max(x, (ceils[i] ?? 0) * ceilFall);
        if ((ceils[i] ?? 0) > sharedCeil) sharedCeil = ceils[i]!;
      }
      sharedCeil = Math.max(sharedCeil, CEIL_FLOOR);

      for (let i = 0; i < n; i++) {
        const x = armed ? Math.max(0, Math.min(1, bands[i] ?? 0)) : 0;
        const personal = Math.max(ceils[i]!, CEIL_FLOOR);
        const coef = sharedCeil / personal;
        const raw = Math.min(1, x * coef);
        peaks[i] = Math.max(raw, (peaks[i] ?? 0) * decay);
        if ((peaks[i] ?? 0) < 0.015) peaks[i] = 0;

        const u = n <= 1 ? 0 : i / (n - 1);
        const r = lerpByte(lr, hr, u);
        const g = lerpByte(lg, hg, u);
        const b = lerpByte(lb, hb, u);

        if (mirror) {
          const half = plotW * 0.5;
          const innerGap = gap * 0.5;
          const slim = Math.max(1.5, (half - gap * (n - 1) - innerGap) / n);
          const xl = padX + half - innerGap - (i + 1) * (slim + gap) + gap;
          const xr = padX + half + innerGap + i * (slim + gap);
          drawBar(xl, slim, raw, peaks[i]!, padTop, plotH, r, g, b, armed);
          drawBar(xr, slim, raw, peaks[i]!, padTop, plotH, r, g, b, armed);
        } else {
          const bx = padX + i * (barW + gap);
          drawBar(bx, barW, raw, peaks[i]!, padTop, plotH, r, g, b, armed);
        }
      }

      if (showRail) {
        const railY = cssH - padBot * 0.45;
        const railH = 3;
        ctx.fillStyle = "rgba(106, 115, 112, 0.4)";
        ctx.fillRect(padX, railY, plotW, railH);
        ctx.fillStyle = "rgba(0, 240, 255, 0.9)";
        ctx.fillRect(padX, railY, plotW * rms, railH);
        ctx.fillStyle = "rgba(255, 90, 54, 0.95)";
        ctx.fillRect(padX + plotW * peak - 2, railY - 3, 4, railH + 6);
      }

      rafView = viewOf();
      raf = rafView.requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => resize());
    const syncObservers = () => {
      ro.disconnect();
      ro.observe(shell);
      const host = shell.parentElement;
      if (host) ro.observe(host);
      resize();
    };

    const onPipChange = () => {
      cancelRaf();
      syncObservers();
      rafView = viewOf();
      raf = rafView.requestAnimationFrame(draw);
    };

    syncObservers();
    rafView = viewOf();
    raf = rafView.requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener(VISUAL_PIP_CHANGE, onPipChange);

    return () => {
      cancelRaf();
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener(VISUAL_PIP_CHANGE, onPipChange);
    };
  }, [liveRef, vizRef]);

  return (
    <div
      ref={shellRef}
      className="absolute inset-0 h-full w-full overflow-hidden bg-black"
    >
      <div className="relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full bg-[#030405]"
          aria-hidden
        />
      </div>
    </div>
  );
}
