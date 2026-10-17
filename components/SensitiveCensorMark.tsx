import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SensitiveCensorMarkProps = {
  hint?: string;
  className?: string;
};

function FrameFace({ hint }: { hint: string }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-2 border-2 border-danger/50" />
      <span className="relative z-1 font-mono text-lg font-semibold uppercase tracking-[0.38em] text-danger sm:text-xl">
        sensitive
      </span>
      <span className="relative z-1 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-danger/75 sm:text-[11px]">
        {hint}
      </span>
    </>
  );
}

function GlitchPlate({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-5 border-4 border-danger bg-black/75 px-8 py-8 shadow-[8px_8px_0_#5c0a12] sm:px-10 sm:py-9",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Blur-card censor plate — whole frame (borders + copy) glitches. */
export function SensitiveCensorMark({
  hint = "enable in header to open",
  className,
}: SensitiveCensorMarkProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "sensitive-frame-glitch relative mx-3 w-full max-w-[min(92%,20rem)]",
        className,
      )}
    >
      <GlitchPlate className="sensitive-frame-glitch__ghost sensitive-frame-glitch__ghost--magenta">
        <FrameFace hint={hint} />
      </GlitchPlate>
      <GlitchPlate className="sensitive-frame-glitch__ghost sensitive-frame-glitch__ghost--cyan">
        <FrameFace hint={hint} />
      </GlitchPlate>
      <GlitchPlate className="sensitive-frame-glitch__body">
        <FrameFace hint={hint} />
      </GlitchPlate>
    </div>
  );
}
