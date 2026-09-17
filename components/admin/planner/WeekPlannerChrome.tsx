"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
import type { WochenplanPlanDto } from "@/lib/wochenplan/plan-types";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
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

  return (
    <div className="space-y-1 border-b border-[var(--border)] pb-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">Wochenplaner</h1>
        {createPermissions ? <PlanningHubCreateMenu permissions={createPermissions} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-0.5">
          <Link
            href={weekHref(weekNav.previousParam, resolvedUrlState)}
            aria-label="Vorherige Woche"
            data-testid="weekplanner-previous-week"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
          <p className="text-sm font-semibold text-[var(--foreground)]" data-testid="weekplanner-range-label">
            {weekNav.rangeLabel}
          </p>
          <Link
            href={weekHref(weekNav.nextParam, resolvedUrlState)}
            aria-label="Nächste Woche"
            data-testid="weekplanner-next-week"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={buildPlanningHubHref(resolvedUrlState, {
              week: todayParam,
              calendarZeit: preserveCalendarZeitForHeute(resolvedUrlState.calendarZeit),
            })}
            data-testid="weekplanner-today"
            className="inline-flex h-7 items-center rounded-md border border-[var(--border)] px-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            Heute
          </Link>
        </div>

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

      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--border)]/50 pt-1"
        data-testid="planning-hub-toolbar"
      >
        <div
          className="flex items-center gap-px rounded-md border border-[var(--border)]/80 p-px"
          data-testid="planning-hub-perspective"
        >
          {(
            [
              ["kalender", "Kalender"],
              ["ressourcen", "Ressourcen"],
              ["liste", "Liste"],
            ] as const
          ).map(([perspective, label]) => (
            <Link
              key={perspective}
              href={buildPlanningHubHref(resolvedUrlState, { perspective })}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                urlState.perspective === perspective
                  ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {urlState.perspective === "ressourcen" && (
          <div className="flex gap-0.5">
            <Link
              href={buildPlanningHubHref(resolvedUrlState, { resourceCategory: "pitch" })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                urlState.resourceCategory === "pitch"
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)]",
              )}
            >
              Spielfeld / Halle
            </Link>
            <Link
              href={buildPlanningHubHref(resolvedUrlState, { resourceCategory: "dressing" })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                urlState.resourceCategory === "dressing"
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)]",
              )}
            >
              Garderobe
            </Link>
          </div>
        )}

        <div className="hidden h-4 w-px bg-[var(--border)] sm:block" aria-hidden />

        <PlanningHubWeekFilters
          urlState={resolvedUrlState}
          teamOptions={teamOptions}
          facilityOptions={facilityOptions}
          inline
        />

        {week && onReviewConflicts ? (
          <div className="ml-auto flex min-w-0 items-center">
            <PlanningHubConflictAttention
              week={week}
              incompleteCount={incompleteCount}
              onReviewConflicts={onReviewConflicts}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
