"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  applyListOperationalFilters,
  formatListOperationalDayHeading,
  listOperationalResourceLine,
  listOperationalResourceTitle,
  listOperationalRowStatus,
  listOperationalStatusLabel,
  listOperationalVisibleItemCount,
  planningHubFiltersActive,
} from "@/lib/planning-hub/list-operational";
import {
  weekplannerAccessibleName,
  weekplannerActivityTypeLabel,
  weekplannerTimeColumnLabel,
  weekplannerTimingDetail,
} from "@/lib/planning-hub/item-presenters";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";
import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import PlanningHubListeRowMenu from "./PlanningHubListeRowMenu";
import PlanningHubFilteredEmptyState from "./PlanningHubFilteredEmptyState";

type PlanningHubListeViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
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
  >;
};

function activityKindForItem(type: WeekplannerItem["type"]): SportingActivityKind {
  switch (type) {
    case "TRAINING":
      return "TRAINING";
    case "MATCH":
      return "MATCH";
    case "TOURNAMENT":
      return "TOURNAMENT";
    case "VERANSTALTUNG":
      return "EVENT";
    default:
      return "TRAINING";
  }
}

function statusBadgeClass(status: ReturnType<typeof listOperationalRowStatus>): string {
  switch (status) {
    case "conflict":
      return "border-amber-300/80 bg-amber-50 text-amber-900";
    case "incomplete":
      return "border-sky-300/70 bg-sky-50 text-sky-900";
    case "open":
      return "border-violet-300/70 bg-violet-50 text-violet-900";
    case "ready":
    default:
      return "border-emerald-300/70 bg-emerald-50 text-emerald-900";
  }
}

export default function PlanningHubListeView({
  week,
  urlState,
  locale,
  timezone,
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
              {day.items.map((item) => {
                const status = listOperationalRowStatus(item);
                const semantic = activityVisualStyle(item.type);
                const typeLabel = weekplannerActivityTypeLabel(item.type);
                const resourceLine = listOperationalResourceLine(item);
                const resourceTitle = listOperationalResourceTitle(item);

                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "group flex gap-2 rounded-lg border border-[var(--border)]/80 bg-[var(--surface)] p-2 shadow-sm transition",
                        "hover:border-[var(--border)] hover:bg-[var(--surface-2)]/40",
                        semantic.listLeftEdgeClass,
                        "border-l-[3px]",
                        status === "conflict" && "ring-1 ring-inset ring-amber-500/15",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onItemOpen(item)}
                        data-testid={`weekplanner-item-${item.type.toLowerCase()}`}
                        aria-label={weekplannerAccessibleName(item, locale, timezone)}
                        className={cn(
                          "min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2",
                        )}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-y-0.5">
                          <span
                            className="text-sm font-semibold tabular-nums text-[var(--foreground)]"
                            data-testid="planning-hub-liste-row-time"
                          >
                            {item.type === "VERANSTALTUNG" && item.allDay
                              ? weekplannerTimeColumnLabel(item, locale, timezone, day.dayKey)
                              : weekplannerTimingDetail(item, locale, timezone)}
                          </span>
                          <ActivityTypePill
                            activityKind={activityKindForItem(item.type)}
                            label={typeLabel}
                            className="!py-0"
                          />
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              statusBadgeClass(status),
                            )}
                            data-testid="planning-hub-liste-row-status"
                          >
                            {listOperationalStatusLabel(status)}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">
                          {schedulerDisplayIdentity(item)}
                        </p>

                        <p
                          className="mt-0.5 truncate text-xs text-[var(--text-2)]"
                          title={resourceTitle}
                          data-testid="planning-hub-liste-row-resources"
                        >
                          {resourceLine}
                        </p>
                      </button>

                      <PlanningHubListeRowMenu
                        item={item}
                        permissionContext={permissionContext}
                        canEditItem={canEditItem(item)}
                        onOpenItem={() => onItemOpen(item)}
                        onEditPlanning={() => onItemEditPlanning(item)}
                        onReviewConflict={() => onReviewConflictForItem(item)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
