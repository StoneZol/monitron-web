"use client";

import {
  ControlSection,
  Select,
  Slider,
} from "@/components/ControlPanel";
import { useScreensOverlay } from "@/components/ScreensOverlay/ScreensOverlay.context";
import { getFxModeMod } from "./overlaysMods";
import type { FxModeKnob } from "./overlaysMods/types";
import { useFxOverlay } from "./FxOverlay.store";
import {
  FX_BLEND_OPTIONS,
  FX_MODE_OPTIONS,
  FX_RANGES,
} from "./FxOverlay.types";

const INFO = {
  section:
    "Film stack over any screen. Pick a look; knobs follow the mode. Blend wash is optional.",
  mode: "Base look. B&W = grayscale. Cartoony = jonnycat aberration / bloom / grain pass.",
  intensity: {
    bw: "B&W amount: 0 = full color, 1 = full grayscale.",
    cartoony: "Dry / wet mix for the Cartoony pass (0 = raw scene, 1 = full filter).",
    default: "Overlay strength for the active look.",
  },
  contrast: "Contrast boost on the scene (1 = unchanged).",
  speed: "Grain / filter clock speed (1 ≈ Shadertoy iTime).",
  particles:
    "Film-grain density & strength (0 = clean, 1 = stock, 2 = heavy speckle).",
  blend:
    "Optional add-on mix-blend for a black wash. normal = no wash. At wash=1 the frame goes black — that’s expected for a full black layer.",
  wash: "Black wash opacity when blend ≠ normal. Keep this modest; 1 = solid black.",
} as const;

function intensityInfo(mode: string): string {
  if (mode === "bw") return INFO.intensity.bw;
  if (mode === "cartoony") return INFO.intensity.cartoony;
  return INFO.intensity.default;
}

/**
 * Shared panel block — mounts just above VisualizerSection on every screen.
 */
export function FxOverlaySection() {
  const overlay = useScreensOverlay();
  const screenId = overlay?.screenId;
  const fx = useFxOverlay(screenId ?? "__none__");

  if (!screenId) return null;

  const mod = getFxModeMod(fx.mode);
  const knobs = new Set<FxModeKnob>(mod?.knobs ?? []);

  return (
    <ControlSection label="fx overlay" info={INFO.section} defaultOpen={false}>
      <Select
        label="Overlay"
        value={fx.mode}
        options={FX_MODE_OPTIONS}
        onChange={fx.setMode}
        info={
          mod?.source
            ? `${INFO.mode} Source: ${mod.source.title} — ${mod.source.author} (${mod.source.href}).`
            : INFO.mode
        }
      />
      {fx.mode !== "off" ? (
        <>
          {mod?.source ? (
            <a
              href={mod.source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-cyan/70 transition-colors hover:text-signal"
              title={mod.source.title}
            >
              original — {mod.source.author}
              <span className="ml-1 text-muted/60">↗</span>
            </a>
          ) : null}
          {knobs.has("intensity") ? (
            <Slider
              label="Intensity"
              value={fx.intensity}
              min={FX_RANGES.intensity.min}
              max={FX_RANGES.intensity.max}
              step={FX_RANGES.intensity.step}
              onChange={fx.setIntensity}
              format={(v) => v.toFixed(2)}
              info={intensityInfo(fx.mode)}
            />
          ) : null}
          {knobs.has("contrast") ? (
            <Slider
              label="Contrast"
              value={fx.contrast}
              min={FX_RANGES.contrast.min}
              max={FX_RANGES.contrast.max}
              step={FX_RANGES.contrast.step}
              onChange={fx.setContrast}
              format={(v) => `×${v.toFixed(2)}`}
              info={INFO.contrast}
            />
          ) : null}
          {knobs.has("speed") ? (
            <Slider
              label="Speed"
              value={fx.speed}
              min={FX_RANGES.speed.min}
              max={FX_RANGES.speed.max}
              step={FX_RANGES.speed.step}
              onChange={fx.setSpeed}
              format={(v) => `×${v.toFixed(2)}`}
              info={INFO.speed}
            />
          ) : null}
          {knobs.has("particles") ? (
            <Slider
              label="Particles"
              value={fx.particles}
              min={FX_RANGES.particles.min}
              max={FX_RANGES.particles.max}
              step={FX_RANGES.particles.step}
              onChange={fx.setParticles}
              format={(v) => `×${v.toFixed(2)}`}
              info={INFO.particles}
            />
          ) : null}
          <Select
            label="Blend (add-on)"
            value={fx.blend}
            options={FX_BLEND_OPTIONS}
            onChange={fx.setBlend}
            info={INFO.blend}
          />
          {fx.blend !== "normal" ? (
            <Slider
              label="Wash"
              value={fx.wash}
              min={FX_RANGES.wash.min}
              max={FX_RANGES.wash.max}
              step={FX_RANGES.wash.step}
              onChange={fx.setWash}
              format={(v) => v.toFixed(2)}
              info={INFO.wash}
            />
          ) : null}
        </>
      ) : null}
    </ControlSection>
  );
}
