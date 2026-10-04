import {
  applyCanvasFilter,
  clearCanvasFilters,
  sceneCanvases,
} from "./canvasFilter";
import type { FxModeMod, FxModePaintContext } from "./types";

/**
 * Whole-frame hue tools on the scene canvas.
 * - intensity → base hue-rotate (0…360°)
 * - contrast → saturate (0.5…2) so the shift reads apart from twinkle
 * - speed → extra spin (°/s) — second clock vs scene twinkle, not just a phase offset
 */

type Runner = {
  root: HTMLElement;
  raf: number;
  running: boolean;
  startMs: number;
  intensity: number;
  contrast: number;
  speed: number;
};

const runners = new WeakMap<HTMLElement, Runner>();

function filterCss(contrast: number, deg: number): string {
  const sat = Math.min(2, Math.max(0.5, contrast));
  const parts = [`hue-rotate(${deg.toFixed(1)}deg)`];
  if (Math.abs(sat - 1) > 0.001) parts.push(`saturate(${sat.toFixed(3)})`);
  return parts.join(" ");
}

function paint(runner: Runner) {
  const base = Math.min(1, Math.max(0, runner.intensity)) * 360;
  const spin = Math.max(0, runner.speed) * 60; // speed 1 ≈ 60°/s ≈ 6s lap
  const t = (performance.now() - runner.startMs) * 0.001;
  let deg = base + t * spin;
  deg = ((deg % 360) + 360) % 360;
  // Re-resolve canvases each tick (PiP move / remount).
  if (sceneCanvases(runner.root).length === 0) return;
  applyCanvasFilter(runner.root, filterCss(runner.contrast, deg));
}

function stop(root: HTMLElement) {
  const runner = runners.get(root);
  if (!runner) return;
  runner.running = false;
  if (runner.raf) cancelAnimationFrame(runner.raf);
  runner.raf = 0;
  runners.delete(root);
}

function tick(runner: Runner) {
  if (!runner.running) return;
  paint(runner);
  // Spinning needs frames; static offset can sleep after one paint.
  if (runner.speed > 0.001) {
    runner.raf = requestAnimationFrame(() => tick(runner));
  } else {
    runner.raf = 0;
    runner.running = false;
  }
}

function applyHue(ctx: FxModePaintContext) {
  let runner = runners.get(ctx.root);
  if (!runner) {
    runner = {
      root: ctx.root,
      raf: 0,
      running: false,
      startMs: performance.now(),
      intensity: ctx.intensity,
      contrast: ctx.contrast,
      speed: ctx.speed,
    };
    runners.set(ctx.root, runner);
  } else {
    runner.intensity = ctx.intensity;
    runner.contrast = ctx.contrast;
    runner.speed = ctx.speed;
  }

  // Static: one shot. Spinning: keep a loop.
  if (ctx.speed > 0.001) {
    if (!runner.running) {
      runner.running = true;
      runner.startMs = performance.now();
      runner.raf = requestAnimationFrame(() => tick(runner!));
    }
  } else {
    if (runner.running) {
      runner.running = false;
      if (runner.raf) cancelAnimationFrame(runner.raf);
      runner.raf = 0;
    }
    const base = Math.min(1, Math.max(0, ctx.intensity)) * 360;
    applyCanvasFilter(ctx.root, filterCss(ctx.contrast, base));
  }
}

function clearHue(root: HTMLElement) {
  stop(root);
  clearCanvasFilters(root);
}

export const hueMod: FxModeMod = {
  id: "hue",
  label: "Hue",
  knobs: ["intensity", "contrast", "speed"],
  defaults: {
    intensity: 0,
    contrast: 1,
    speed: 0,
    particles: 1,
    blend: "normal",
  },
  apply: applyHue,
  clear: clearHue,
};
