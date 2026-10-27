"use client";

import { useEffect, useState } from "react";
import { PanelButton } from "@/components/ControlPanel/PanelButton";
import { isVisualPipSupported, toggleVisualPip } from "@/lib/visualPip";
import { cn } from "@/lib/utils";

type VisualPipButtonProps = {
  className?: string;
};

/** Windows-style overlapping-windows glyph for picture-in-picture. */
function PipIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden
    >
      <rect x="1.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="1.5" width="7" height="7" fill="var(--color-screen, #0a0a0a)" />
    </svg>
  );
}

export function VisualPipButton({ className }: VisualPipButtonProps) {
  const [supported, setSupported] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setSupported(isVisualPipSupported());
  }, []);

  if (!supported) return null;

  const onClick = async () => {
    const result = await toggleVisualPip();
    if (result === "error") {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
    }
  };

  return (
    <PanelButton
      onClick={() => void onClick()}
      className={cn("min-w-0 flex-1 px-1.5 py-2", className)}
      title="Picture-in-picture"
      aria-label="Picture-in-picture"
    >
      {flash ? (
        <span className="text-[9px] tracking-[0.14em]">!</span>
      ) : (
        <PipIcon />
      )}
    </PanelButton>
  );
}
