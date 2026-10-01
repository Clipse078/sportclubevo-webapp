"use client";

import { useEffect } from "react";

const PREFIX = "sce-hotfix-login-01";

/**
 * Non-PII client timing marks for dashboard hydration diagnosis (preview/dev only).
 */
export function SceHotfixLogin01DashboardClientMarks() {
  useEffect(() => {
    if (typeof performance === "undefined") return;
    performance.mark(`${PREFIX}:client-hydration-start`);
    const id = requestAnimationFrame(() => {
      performance.mark(`${PREFIX}:client-first-paint`);
      performance.mark(`${PREFIX}:dashboard-interactive`);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}
