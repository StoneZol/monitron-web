import { findFxHost } from "../FxOverlay.host";
import type { FxModeMod, FxModePaintContext } from "./types";

/**
 * Overlay-only grain + vignette as a DOM layer inside the R3F shell.
 * SVG/CSS survives Document PiP adopt (no WebGL context to lose).
 *
 * Fixed noise fields drift + flicker — no per-tick reseed.
 * Knobs: intensity, particles.
 */

type GrainLayer = {
  el: HTMLDivElement;
  turbulence: SVGFETurbulenceElement;
  baseOpacity: number;
  anims: Animation[];
};

type Runner = {
  host: HTMLElement;
  root: HTMLElement;
  layers: GrainLayer[];
  vig: HTMLDivElement;
  baseIntensity: number;
};

const runners = new WeakMap<HTMLElement, Runner>();

function ensureHostPosition(host: HTMLElement) {
  const view = host.ownerDocument.defaultView;
  const pos = (view ?? window).getComputedStyle(host).position;
  if (pos === "static") host.style.position = "relative";
}

function cancelAnims(runner: Runner) {
  for (const layer of runner.layers) {
    for (const a of layer.anims) a.cancel();
    layer.anims = [];
  }
}

function makeFilter(
  doc: Document,
  uid: string,
  seed: number,
  freq: number,
  octaves: number,
): { svg: SVGSVGElement; turbulence: SVGFETurbulenceElement } {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = doc.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;width:0;height:0;";

  const filter = doc.createElementNS(svgNS, "filter");
  filter.setAttribute("id", uid);
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("width", "100%");
  filter.setAttribute("height", "100%");

  const turbulence = doc.createElementNS(svgNS, "feTurbulence");
  turbulence.setAttribute("type", "fractalNoise");
  turbulence.setAttribute("baseFrequency", String(freq));
  turbulence.setAttribute("numOctaves", String(octaves));
  turbulence.setAttribute("seed", String(seed));
  turbulence.setAttribute("stitchTiles", "stitch");

  const color = doc.createElementNS(svgNS, "feColorMatrix");
  color.setAttribute("type", "matrix");
  color.setAttribute(
    "values",
    [
      "0.33 0.33 0.33 0 0",
      "0.33 0.33 0.33 0 0",
      "0.33 0.33 0.33 0 0",
      "0 0 0 0.75 0",
    ].join(" "),
  );

  filter.appendChild(turbulence);
  filter.appendChild(color);
  svg.appendChild(filter);
  return { svg, turbulence };
}

function startLayerLife(
  el: HTMLDivElement,
  drift: {
    toX: string;
    toY: string;
    durationMs: number;
    direction?: PlaybackDirection;
  },
  flicker: { min: number; max: number; durationMs: number },
): Animation[] {
  if (typeof el.animate !== "function") return [];

  const driftAnim = el.animate(
    [
      { transform: "translate3d(0%, 0%, 0)" },
      { transform: `translate3d(${drift.toX}, ${drift.toY}, 0)` },
    ],
    {
      duration: drift.durationMs,
      iterations: Infinity,
      easing: "linear",
      direction: drift.direction ?? "alternate",
    },
  );

  // Opacity on a child wrapper would be cleaner; flicker the layer itself.
  const flickerAnim = el.animate(
    [
      { opacity: String(flicker.min) },
      { opacity: String(flicker.max) },
      { opacity: String(flicker.min * 0.92 + flicker.max * 0.08) },
      { opacity: String(flicker.max) },
      { opacity: String(flicker.min) },
    ],
    {
      duration: flicker.durationMs,
      iterations: Infinity,
      easing: "ease-in-out",
    },
  );

  return [driftAnim, flickerAnim];
}

function paint(runner: Runner, intensity: number, particles: number) {
  const i = Math.min(1, Math.max(0, intensity));
  const p = Math.min(2, Math.max(0, particles));
  runner.baseIntensity = i;

  // Coarse plate
  const coarse = runner.layers[0];
  if (coarse) {
    const freq = 0.35 + p * 0.25;
    coarse.turbulence.setAttribute("baseFrequency", `${freq}`);
    coarse.turbulence.setAttribute("numOctaves", p > 1.2 ? "3" : "2");
    coarse.baseOpacity = Math.min(0.7, 0.2 + 0.28 * p) * i;
  }

  // Fine speckles
  const fine = runner.layers[1];
  if (fine) {
    const freq = 0.9 + p * 0.55;
    fine.turbulence.setAttribute("baseFrequency", `${freq}`);
    fine.turbulence.setAttribute("numOctaves", "2");
    fine.baseOpacity = Math.min(0.65, 0.14 + 0.3 * p) * i;
  }

  // Restart flicker with updated opacity band (drift keeps running).
  for (const layer of runner.layers) {
    const drift = layer.anims[0] ?? null;
    for (let n = 1; n < layer.anims.length; n++) layer.anims[n]?.cancel();

    const base = layer.baseOpacity;
    if (typeof layer.el.animate === "function" && base > 0.001) {
      const flickerAnim = layer.el.animate(
        [
          { opacity: String(base * 0.72) },
          { opacity: String(base * 1.05) },
          { opacity: String(base * 0.85) },
          { opacity: String(base) },
          { opacity: String(base * 0.72) },
        ],
        {
          duration: layer === fine ? 180 : 320,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
      layer.anims = drift ? [drift, flickerAnim] : [flickerAnim];
    } else {
      layer.el.style.opacity = String(base);
      layer.anims = drift ? [drift] : [];
    }
  }

  runner.vig.style.opacity = String(0.35 * i);
}

function mount(host: HTMLElement): Runner {
  const doc = host.ownerDocument;
  ensureHostPosition(host);

  const id = Math.random().toString(36).slice(2, 9);
  const wrap = doc.createElement("div");
  wrap.dataset.fxPass = "grain";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:hidden;";

  const layers: GrainLayer[] = [];

  const specs: Array<{
    seed: number;
    freq: number;
    octaves: number;
    blend: string;
    drift: {
      toX: string;
      toY: string;
      durationMs: number;
      direction?: PlaybackDirection;
    };
    baseOpacity: number;
    flickerMs: number;
  }> = [
    {
      // Slow coarse plate — diagonal crawl
      seed: 7,
      freq: 0.45,
      octaves: 2,
      blend: "overlay",
      drift: { toX: "-22%", toY: "-10%", durationMs: 9000 },
      baseOpacity: 0.4,
      flickerMs: 320,
    },
    {
      // Faster fine grain — counter axis
      seed: 19,
      freq: 1.15,
      octaves: 2,
      blend: "soft-light",
      drift: {
        toX: "18%",
        toY: "-14%",
        durationMs: 5500,
        direction: "alternate",
      },
      baseOpacity: 0.32,
      flickerMs: 180,
    },
  ];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!;
    const uid = `fx-grain-${id}-${i}`;
    const { svg, turbulence } = makeFilter(
      doc,
      uid,
      spec.seed,
      spec.freq,
      spec.octaves,
    );

    const el = doc.createElement("div");
    el.style.cssText = [
      "position:absolute",
      "left:-45%",
      "top:-45%",
      "width:190%",
      "height:190%",
      `filter:url(#${uid})`,
      `mix-blend-mode:${spec.blend}`,
      "background:#808080",
      `opacity:${spec.baseOpacity}`,
      "will-change:transform,opacity",
    ].join(";");

    wrap.appendChild(svg);
    wrap.appendChild(el);

    const anims = startLayerLife(
      el,
      spec.drift,
      {
        min: spec.baseOpacity * 0.72,
        max: spec.baseOpacity * 1.05,
        durationMs: spec.flickerMs,
      },
    );

    layers.push({
      el,
      turbulence,
      baseOpacity: spec.baseOpacity,
      anims,
    });
  }

  const vig = doc.createElement("div");
  vig.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "opacity:0.28",
    "background:radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)",
  ].join(";");
  wrap.appendChild(vig);
  host.appendChild(wrap);

  return { host, root: wrap, layers, vig, baseIntensity: 1 };
}

function applyGrain(ctx: FxModePaintContext) {
  const host = findFxHost(ctx.root);
  if (!host) return;

  let runner = runners.get(ctx.root);
  const wrongHost = runner != null && runner.host !== host;
  const wrongDoc =
    runner != null && runner.root.ownerDocument !== host.ownerDocument;
  const detached = runner != null && !runner.root.isConnected;

  if (runner && (wrongHost || wrongDoc || detached)) {
    cancelAnims(runner);
    runner.root.remove();
    runners.delete(ctx.root);
    runner = undefined;
  }

  if (!runner) {
    runner = mount(host);
    runners.set(ctx.root, runner);
  } else if (runner.root.parentElement !== host) {
    host.appendChild(runner.root);
    runner.host = host;
    cancelAnims(runner);
    // Restart life after Document PiP adopt.
    const coarse = runner.layers[0];
    const fine = runner.layers[1];
    if (coarse) {
      coarse.anims = startLayerLife(
        coarse.el,
        { toX: "-22%", toY: "-10%", durationMs: 9000 },
        {
          min: coarse.baseOpacity * 0.72,
          max: coarse.baseOpacity * 1.05,
          durationMs: 320,
        },
      );
    }
    if (fine) {
      fine.anims = startLayerLife(
        fine.el,
        { toX: "18%", toY: "-14%", durationMs: 5500 },
        {
          min: fine.baseOpacity * 0.72,
          max: fine.baseOpacity * 1.05,
          durationMs: 180,
        },
      );
    }
  }

  paint(runner, ctx.intensity, ctx.particles);
}

function clearGrain(root: HTMLElement) {
  const runner = runners.get(root);
  if (!runner) return;
  cancelAnims(runner);
  runner.root.remove();
  runners.delete(root);
}

export const grainMod: FxModeMod = {
  id: "grain",
  label: "Grain",
  knobs: ["intensity", "particles"],
  defaults: {
    intensity: 1,
    contrast: 1,
    speed: 0.05,
    particles: 1,
    blend: "normal",
  },
  apply: applyGrain,
  clear: clearGrain,
};
