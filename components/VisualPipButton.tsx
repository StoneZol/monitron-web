"use client";

import { useEffect, useState } from "react";
import { PanelButton } from "@/components/ControlPanel/PanelButton";
import {
  PipEnterIcon,
  PipExitIcon,
} from "@/components/ControlPanel/chromeIcons";
import {
  isVisualPipActive,
  isVisualPipSupported,
  toggleVisualPip,
  VISUAL_PIP_CHANGE,
} from "@/lib/visualPip";
import { cn } from "@/lib/utils";

type VisualPipButtonProps = {
  className?: string;
};

export function VisualPipButton({ className }: VisualPipButtonProps) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setSupported(isVisualPipSupported());
    const sync = () => setActive(isVisualPipActive());
    sync();
    window.addEventListener(VISUAL_PIP_CHANGE, sync);
    return () => window.removeEventListener(VISUAL_PIP_CHANGE, sync);
  }, []);

  if (!supported) return null;

  const onClick = async () => {
    const result = await toggleVisualPip();
    setActive(isVisualPipActive());
    if (result === "error") {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
    }
  };

  return (
    <PanelButton
      onClick={() => void onClick()}
      className={cn(className)}
      title={active ? "Exit picture-in-picture" : "Picture-in-picture"}
      aria-label={active ? "Exit picture-in-picture" : "Picture-in-picture"}
      aria-pressed={active}
    >
      {flash ? (
        <span className="text-[9px] tracking-[0.14em]">!</span>
      ) : active ? (
        <PipExitIcon />
      ) : (
        <PipEnterIcon />
      )}
    </PanelButton>
  );
}
