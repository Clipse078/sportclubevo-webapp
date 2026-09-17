"use client";

import type { ReactNode } from "react";

type DelayedPlannerFallbackProps = {
  children: ReactNode;
};

/**
 * @deprecated PLANNING-HUB-03D1 — do not gate Suspense fallbacks behind client timers.
 * Timers do not run during the RSC streaming wait, which left the planner region blank.
 * Use {@link PlanningHubLoadingShell} directly; motion uses CSS animation-delay instead.
 */
export default function DelayedPlannerFallback({ children }: DelayedPlannerFallbackProps) {
  return children;
}
