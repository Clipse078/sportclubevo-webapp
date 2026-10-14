"use client";

import { useMemo } from "react";
import {
  applyListOperationalFilters,
  formatListOperationalDayHeading,
  listOperationalVisibleItemCount,
  planningHubFiltersActive,
} from "@/lib/planning-hub/list-operational";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import PlanningHubFilteredEmptyState from "./PlanningHubFilteredEmptyState";
import PlanningHubListeActivityRow from "./PlanningHubListeActivityRow";

type PlanningHubListeViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
  activeAlternativePlanName?: string | null;
  onItemOpen: (item: WeekplannerItem) => void;
  onItemEditPlanning: (item: WeekplannerItem) => void;
  onReviewConflictForItem: (item: WeekplannerItem) => void;
  canEditItem: (item: WeekplannerItem) => boolean;
  permissionContext: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  > & {
    canViewTrainings?: boolean;
    canViewEvents?: boolean;
  };
};

export default function PlanningHubListeView({
  week,
  urlState,
  locale,
  timezone,
  tenantClubName,
  tenantLogoUrl,
  activeAlternativePlanName = null,
  onItemOpen,
  onItemEditPlanning,
  onReviewConflictForItem,
  canEditItem,
  permissionContext,
}: PlanningHubListeViewProps) {
  const filtered = useMemo(
    () =>
      applyListOperationalFilters(week, {
        activity: urlState.activity,
        team: urlState.team,
        facility: urlState.facility,
        conflictsOnly: urlState.conflictsOnly,
        search: urlState.search,
      }),
    [week, urlState],
  );

  const visibleCount = listOperationalVisibleItemCount(filtered);
  const weekHasItems = week.days.some((day) => day.items.length > 0);
  const filtersActive = planningHubFiltersActive(urlState);
  const searchActive = urlState.search.trim().length > 0;
  const filterOrSearchActive = filtersActive || searchActive;

  if (!weekHasItems) {
    return (
      <p className="px-1 py-6 text-sm text-[var(--muted)]" data-testid="planning-hub-liste-empty-week">
        Keine Aktivitäten in diesem Zeitraum.
      </p>
    );
  }

  if (visibleCount === 0) {
    if (filterOrSearchActive) {
      return (
        <PlanningHubFilteredEmptyState
          urlState={urlState}
          data-testid="planning-hub-liste-empty-filtered"
        />
      );
    }
    return (
      <p className="px-1 py-6 text-sm text-[var(--muted)]" data-testid="planning-hub-liste-empty-filtered">
        Keine Aktivitäten in diesem Zeitraum.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="planning-hub-liste">
      {filtered.days.map((day) => {
        if (day.items.length === 0) return null;
        return (
          <section key={day.dayKey} aria-labelledby={`liste-day-${day.dayKey}`}>
            <h3
              id={`liste-day-${day.dayKey}`}
              className="sticky top-0 z-[1] mb-2 border-b border-[var(--border)]/60 bg-[var(--surface)]/95 px-1 py-1.5 text-[11px] font-bold tracking-wide text-[var(--text-2)] backdrop-blur-sm"
              data-testid={`planning-hub-liste-day-${day.dayKey}`}
            >
              {formatListOperationalDayHeading(day.dayKey, locale, timezone)}
            </h3>
            <ul className="space-y-1.5">
              {day.items.map((item) => (
                <PlanningHubListeActivityRow
                  key={item.id}
                  item={item}
                  dayKey={day.dayKey}
                  locale={locale}
                  timezone={timezone}
                  tenantClubName={tenantClubName}
                  tenantLogoUrl={tenantLogoUrl}
                  activeAlternativePlanName={activeAlternativePlanName}
                  onItemOpen={onItemOpen}
                  onItemEditPlanning={onItemEditPlanning}
                  onReviewConflictForItem={onReviewConflictForItem}
                  canEditItem={canEditItem(item)}
                  permissionContext={permissionContext}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
