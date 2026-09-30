"use client";

import { useState } from "react";

const useScreensOverlayHook = () => {
  const [hideHud, setHideHud] = useState(false);

  return {
    hideHud,
    hide: () => setHideHud(true),
    show: () => setHideHud(false),
  };
};

export default useScreensOverlayHook;
