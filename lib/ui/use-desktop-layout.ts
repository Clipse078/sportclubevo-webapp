"use client";

import { useEffect, useState } from "react";

/** True when viewport is at least md (768px). */
export function useDesktopLayout(): boolean {
  const [desktop, setDesktop] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return desktop;
}
