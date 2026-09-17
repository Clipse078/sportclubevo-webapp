"use client";

import { useEffect, useState, type ReactNode } from "react";

const SHOW_DELAY_MS = 120;

type DelayedPlannerFallbackProps = {
  children: ReactNode;
};

/**
 * Avoid skeleton flash on very fast Suspense resolutions (Part K).
 * Real streamed content always wins — no minimum display time.
 */
export default function DelayedPlannerFallback({ children }: DelayedPlannerFallbackProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) {
    return <div className="min-h-[420px]" data-testid="planning-hub-loading-delayed" aria-hidden />;
  }

  return children;
}
