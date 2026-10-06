"use client";

import Link from "next/link";
import { buildPlanningHubHref } from "@/lib/planning-hub/planner-url";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

type PlanningHubFilteredEmptyStateProps = {
  urlState: PlanningHubUrlState;
  "data-testid"?: string;
};

export default function PlanningHubFilteredEmptyState({
  urlState,
  "data-testid": testId = "planning-hub-filtered-empty",
}: PlanningHubFilteredEmptyStateProps) {
  const resetHref = buildPlanningHubHref(urlState, {
    activity: "alle",
    team: null,
    facility: null,
    conflictsOnly: false,
    search: "",
  });

  return (
    <div className="space-y-3 px-1 py-6" data-testid={testId}>
      <h3 className="text-sm font-semibold text-[var(--text)]">Keine passenden Einträge</h3>
      <p className="text-sm text-[var(--muted)]">
        Für die aktuellen Filter wurden keine Aktivitäten gefunden.
      </p>
      <Link
        href={resetHref}
        className="inline-flex rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-2)] transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        data-testid="planning-hub-filtered-empty-reset"
      >
        Filter zurücksetzen
      </Link>
    </div>
  );
}
