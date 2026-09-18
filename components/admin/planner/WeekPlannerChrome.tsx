"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
import type { WochenplanPlanDto } from "@/lib/wochenplan/plan-types";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import PlanningWeekNavigation from "@/components/admin/planning/PlanningWeekNavigation";
import PlanningHubCreateMenu, {
  type PlanningHubCreatePermissions,
} from "@/components/admin/planning-hub/PlanningHubCreateMenu";
import PlanningHubConflictAttention from "@/components/admin/planning-hub/PlanningHubConflictAttention";
import PlanningHubWeekFilters from "@/components/admin/planning-hub/PlanningHubWeekFilters";
import {
  buildPlanningHubHref,
  preserveCalendarZeitForHeute,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import { WeekplannerPlanBar } from "./WeekplannerPlanBar";

export type WeekPlannerWeekNav = {
  param: string;
  previousParam: string;
  nextParam: string;
  rangeLabel: string;
};

export type WeekPlannerChromeProps = {
  weekNav: WeekPlannerWeekNav;
  urlState: PlanningHubUrlState;
  todayParam: string;
  wochenplanPlans?: WochenplanPlanDto[];
  plans?: WeekplannerPlanDto[];
  viewedWochenplanPlanId?: string | null;
  selectedPlanParam?: string | null;
  materializedWeekplannerPlanId?: string | null;
  canManagePlans?: boolean;
  createPermissions?: PlanningHubCreatePermissions;
  teamOptions?: { value: string; label: string }[];
  facilityOptions?: { value: string; label: string }[];
  week?: WeekplannerWeek;
  incompleteCount?: number;
  onReviewConflicts?: (incidents: PlanningConflictIncident[]) => void;
};

function weekHref(param: string, urlState: PlanningHubUrlState): string {
  return buildPlanningHubHref({ ...urlState, week: param });
}

export default function WeekPlannerChrome({
  weekNav,
  urlState,
  todayParam,
  wochenplanPlans = [],
  plans = [],
  viewedWochenplanPlanId = null,
  selectedPlanParam = null,
  materializedWeekplannerPlanId = null,
  canManagePlans = false,
  createPermissions,
  teamOptions = [],
  facilityOptions = [],
  week,
  incompleteCount = 0,
  onReviewConflicts,
}: WeekPlannerChromeProps) {
  const resolvedUrlState = { ...urlState, week: weekNav.param };

  const todayHref = buildPlanningHubHref(resolvedUrlState, {
    week: todayParam,
    calendarZeit: preserveCalendarZeitForHeute(resolvedUrlState.calendarZeit),
  });

  return (
    <div className="w-full space-y-4" data-testid="weekplanner-management-chrome">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Wochenplaner"
        title="Wochenplaner"
        subtitle="Zentrale Wochenplanung und operative Übersicht über Trainings, Spiele, Turniere und Veranstaltungen."
        subtitleTestId="weekplanner-header-subtitle"
        actions={createPermissions ? <PlanningHubCreateMenu permissions={createPermissions} /> : null}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <PlanningWeekNavigation
            rangeLabel={weekNav.rangeLabel}
            previousWeekHref={weekHref(weekNav.previousParam, resolvedUrlState)}
            nextWeekHref={weekHref(weekNav.nextParam, resolvedUrlState)}
            todayHref={todayHref}
          />

          <WeekplannerPlanBar
            weekParam={weekNav.param}
            wochenplanPlans={wochenplanPlans}
            weekplannerPlans={plans}
            selectedPlanParam={selectedPlanParam ?? viewedWochenplanPlanId}
            materializedWeekplannerPlanId={materializedWeekplannerPlanId}
            canManage={canManagePlans}
            compact
          />
        </div>

        {week && onReviewConflicts ? (
          <div className="flex min-w-0 items-start lg:max-w-sm lg:justify-end">
            <PlanningHubConflictAttention
              week={week}
              incompleteCount={incompleteCount}
              onReviewConflicts={onReviewConflicts}
            />
          </div>
        ) : null}
      </div>

      <div
        className="flex flex-col gap-3 border-t border-[var(--border)]/70 pt-3 sm:flex-row sm:flex-wrap sm:items-center"
        data-testid="planning-hub-toolbar"
      >
        <div
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
          role="group"
          aria-label="Ansicht"
          data-testid="planning-hub-perspective"
        >
          {(
            [
              ["kalender", "Kalender"],
              ["ressourcen", "Ressourcen"],
              ["liste", "Liste"],
            ] as const
          ).map(([perspective, label]) => {
            const active = urlState.perspective === perspective;
            return (
              <Link
                key={perspective}
                href={buildPlanningHubHref(resolvedUrlState, { perspective })}
                data-testid={`planning-hub-perspective-${perspective}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                  active
                    ? "bg-[var(--sce-primary)] text-white shadow-sm"
                    : "text-[var(--text-2)] hover:text-[var(--foreground)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {urlState.perspective === "ressourcen" && (
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <Link
              href={buildPlanningHubHref(resolvedUrlState, { resourceCategory: "pitch" })}
              data-testid="planning-hub-resource-pitch"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                urlState.resourceCategory === "pitch"
                  ? "bg-[var(--sce-primary)] text-white shadow-sm"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              Spielfeld / Halle
            </Link>
            <Link
              href={buildPlanningHubHref(resolvedUrlState, { resourceCategory: "dressing" })}
              data-testid="planning-hub-resource-dressing"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                urlState.resourceCategory === "dressing"
                  ? "bg-[var(--sce-primary)] text-white shadow-sm"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              Garderobe
            </Link>
          </div>
        )}

        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 sm:ml-auto sm:min-w-[min(100%,20rem)]"
          data-testid="planning-hub-filter-panel"
        >
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Filter
          </p>
          <PlanningHubWeekFilters
            urlState={resolvedUrlState}
            teamOptions={teamOptions}
            facilityOptions={facilityOptions}
            inline
          />
        </div>
      </div>
    </div>
  );
}
