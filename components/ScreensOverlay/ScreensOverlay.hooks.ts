"use client";

import { useEffect, useState } from "react";

const IDLE_MS = 6000;

const useScreensOverlayHook = () => {
  const [hideHud, setHideHud] = useState(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;

    const armIdle = () => {
      clearTimeout(idleTimer);
      setHideHud((prev) => (prev ? false : prev));
      idleTimer = setTimeout(() => setHideHud(true), IDLE_MS);
    };

    const onMouseMove = () => {
      armIdle();
    };

    armIdle();
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return {
    hideHud,
  };
};

export default useScreensOverlayHook;
