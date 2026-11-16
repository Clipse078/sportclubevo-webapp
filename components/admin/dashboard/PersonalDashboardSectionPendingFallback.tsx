"use client";

import { useEffect, useState } from "react";
import { PersonalDashboardCommandCenterLoadingSurface } from "./PersonalDashboardCommandCenterLoadingSurface";
import type { PersonalDashboardCommandCenterLoadingMode } from "./PersonalDashboardCommandCenterLoadingSurface";

const DEFAULT_SLOW_MS = 8_000;

export type PersonalDashboardSectionPendingFallbackProps = {
  mode: PersonalDashboardCommandCenterLoadingMode;
  slowAfterMs?: number;
};

/**
 * Suspense fallback with accessible pending + slow-response status (no artificial delay).
 */
export function PersonalDashboardSectionPendingFallback({
  mode,
  slowAfterMs = DEFAULT_SLOW_MS,
}: PersonalDashboardSectionPendingFallbackProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => window.clearTimeout(timer);
  }, [slowAfterMs]);

  return (
    <div data-testid={`personal-dashboard-section-pending-${mode}`}>
      <PersonalDashboardCommandCenterLoadingSurface mode={mode} />
      <p className="sr-only" role="status" aria-live="polite">
        {slow ? "Die Anfrage dauert länger als üblich." : "Abschnitt wird geladen."}
      </p>
      {slow ? (
        <p
          className="mt-2 text-xs text-[var(--muted)]"
          data-testid={`personal-dashboard-section-slow-${mode}`}
          role="status"
          aria-live="polite"
        >
          Die Anfrage dauert länger als üblich — Inhalt wird geladen.
        </p>
      ) : null}
    </div>
  );
}