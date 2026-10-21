"use client";

import { cn } from "@/lib/utils";
import { fieldBlock } from "./field";
import { FieldInfo } from "./FieldInfo";
import { Slider } from "./Slider";
import { Toggle } from "./Toggle";

export const TWINKLE_SPEED_RANGE = { min: 0, max: 4, step: 0.05 } as const;
export const TWINKLE_SL_RANGE = { min: 0, max: 100, step: 1 } as const;

export type TwinkleControlsProps = {
  /** Label + pref identity — must read as twinkle (e.g. "twinkle", "sky twinkle"). */
  title: string;
  checked: boolean;
  onCheckedChange?: (value: boolean) => void;
  /** Hide master toggle when mode is chosen elsewhere (e.g. color-mode select). */
  showToggle?: boolean;
  speed: number;
  onSpeedChange: (value: number) => void;
  s: number;
  onSChange: (value: number) => void;
  l: number;
  onLChange: (value: number) => void;
  info?: string;
  speedInfo?: string;
  sInfo?: string;
  lInfo?: string;
  className?: string;
};

/**
 * Master twinkle toggle + speed / S / L in a framed block.
 * Hue 0…360 is driven in the canvas; this only edits prefs.
 */
export function TwinkleControls({
  title,
  checked,
  onCheckedChange,
  showToggle = true,
  speed,
  onSpeedChange,
  s,
  onSChange,
  l,
  onLChange,
  info,
  speedInfo,
  sInfo,
  lInfo,
  className,
}: TwinkleControlsProps) {
  const knobsOpen = checked || !showToggle;

  return (
    <div
      className={cn(
        fieldBlock,
        "flex h-fit flex-col gap-1.5 border border-cyan/35 bg-cyan/3 p-1.5",
        knobsOpen && "border-cyan/55",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-cyan/20 px-0.5 pb-1">
        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-cyan/80">
          hsl · {title}
        </span>
        {info ? <FieldInfo text={info} /> : null}
      </div>
      {showToggle && onCheckedChange ? (
        <Toggle
          label={title}
          checked={checked}
          onChange={onCheckedChange}
          className="sm:max-w-none"
        />
      ) : null}
      {knobsOpen ? (
        <div
          className={cn(
            "flex w-full min-w-0 flex-col gap-1",
            showToggle && "border-t border-cyan/15 pt-1",
          )}
        >
          <Slider
            label="speed"
            value={speed}
            min={TWINKLE_SPEED_RANGE.min}
            max={TWINKLE_SPEED_RANGE.max}
            step={TWINKLE_SPEED_RANGE.step}
            onChange={onSpeedChange}
            format={(v) => `×${v.toFixed(2)}`}
            info={speedInfo}
            className="sm:max-w-none"
          />
          <Slider
            label="S"
            value={s}
            min={TWINKLE_SL_RANGE.min}
            max={TWINKLE_SL_RANGE.max}
            step={TWINKLE_SL_RANGE.step}
            onChange={onSChange}
            format={(v) => `${Math.round(v)}%`}
            info={sInfo}
            className="sm:max-w-none"
          />
          <Slider
            label="L"
            value={l}
            min={TWINKLE_SL_RANGE.min}
            max={TWINKLE_SL_RANGE.max}
            step={TWINKLE_SL_RANGE.step}
            onChange={onLChange}
            format={(v) => `${Math.round(v)}%`}
            info={lInfo}
            className="sm:max-w-none"
          />
        </div>
      ) : null}
    </div>
  );
}
