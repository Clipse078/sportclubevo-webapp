"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  buildPlanningHubHref,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";

type ResourceOption = { value: string; label: string };

type PlanningHubResourceScopeControlProps = {
  urlState: PlanningHubUrlState;
  resourceOptions: ResourceOption[];
  perspectiveLabel: "Spielfelder" | "Garderoben";
};

export default function PlanningHubResourceScopeControl({
  urlState,
  resourceOptions,
  perspectiveLabel,
}: PlanningHubResourceScopeControlProps) {
  const activeIds = urlState.resourceFilterIds;
  const allActive = !activeIds?.length;

  return (
    <div
      className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center"
      data-testid="planning-hub-resource-scope"
    >
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {perspectiveLabel}
      </span>
      <div className="inline-flex max-w-full flex-wrap gap-1">
        <Link
          href={buildPlanningHubHref(urlState, { resourceFilterIds: null })}
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-semibold",
            allActive
              ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
              : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
          )}
          data-testid="planning-hub-resource-scope-all"
        >
          Alle
        </Link>
        {resourceOptions.slice(0, 24).map((opt) => {
          const selected = activeIds?.length === 1 && activeIds[0] === opt.value;
          return (
            <Link
              key={opt.value}
              href={buildPlanningHubHref(urlState, { resourceFilterIds: [opt.value] })}
              className={cn(
                "max-w-[9rem] truncate rounded-md border px-2 py-1 text-xs font-semibold",
                selected
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
              )}
              title={opt.label}
              data-testid={`planning-hub-resource-scope-${opt.value}`}
            >
              {opt.label}
            </Link>
          );
        })}
        {resourceOptions.length > 24 ? (
          <span className="self-center px-1 text-[10px] text-[var(--muted)]">
            +{resourceOptions.length - 24} weitere (Suche folgt in 08-06)
          </span>
        ) : null}
      </div>
    </div>
  );
}
