"use client";

import { useEffect, useState } from "react";
import { PanelButton } from "@/components/ControlPanel/PanelButton";
import { isVisualPipSupported, toggleVisualPip } from "@/lib/visualPip";
import { cn } from "@/lib/utils";

type VisualPipButtonProps = {
  className?: string;
};

export function VisualPipButton({ className }: VisualPipButtonProps) {
  const [supported, setSupported] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isVisualPipSupported());
  }, []);

  if (!supported) return null;

  const onClick = async () => {
    const result = await toggleVisualPip();
    if (result === "error") {
      setFlash("fail");
      window.setTimeout(() => setFlash(null), 1200);
    }
  };

  return (
    <PanelButton
      onClick={() => void onClick()}
      className={cn("flex-1", className)}
      title="Picture-in-picture — float the visual in a mini window"
    >
      {flash ?? "pip"}
    </PanelButton>
  );
}
