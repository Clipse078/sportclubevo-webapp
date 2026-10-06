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
import PlanningHubListeToolbar from "@/components/admin/planning-hub/PlanningHubListeToolbar";
import {
  applyListOperationalFilters,
  listOperationalVisibleItemCount,
  listOperationalWeekHasAnyItems,
} from "@/lib/planning-hub/list-operational";
import PlanningHubPlannerViewOptions from "@/components/admin/planning-hub/PlanningHubPlannerViewOptions";
import {
  buildPlanningHubHref,
  isPlanningHubResourceTimelinePerspective,
  preserveCalendarZeitForHeute,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import PlanningHubResourceScopeControl from "@/components/admin/planning-hub/PlanningHubResourceScopeControl";
import { pickFacilityGroupsForCategory } from "@/lib/planning-hub/resource-timeline/adaptive-lanes";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
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
  resourceTimelineCatalog?: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
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
  resourceTimelineCatalog,
}: WeekPlannerChromeProps) {
  const resolvedUrlState = { ...urlState, week: weekNav.param };

  const listeFilteredWeek =
    week && urlState.perspective === "liste"
      ? applyListOperationalFilters(week, {
          activity: resolvedUrlState.activity,
          team: resolvedUrlState.team,
          facility: resolvedUrlState.facility,
          conflictsOnly: resolvedUrlState.conflictsOnly,
          search: resolvedUrlState.search,
        })
      : null;

  const resourceScopeFacilityGroups =
    urlState.perspective === "spielfeld"
      ? pickFacilityGroupsForCategory(resourceTimelineCatalog ?? { PITCH_HALL: [], DRESSING_ROOM: [] }, "pitch")
      : urlState.perspective === "garderobe"
        ? pickFacilityGroupsForCategory(resourceTimelineCatalog ?? { PITCH_HALL: [], DRESSING_ROOM: [] }, "dressing")
        : [];

  const todayHref = buildPlanningHubHref(resolvedUrlState, {
    week: todayParam,
    calendarZeit: preserveCalendarZeitForHeute(resolvedUrlState.calendarZeit),
  });

  return (
    <div className="w-full space-y-2" data-testid="weekplanner-management-chrome">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Wochenplaner"
        title="Wochenplaner"
        subtitle="Zentrale Wochenplanung und operative Übersicht über Trainings, Spiele, Turniere und Veranstaltungen."
        subtitleTestId="weekplanner-header-subtitle"
        actions={createPermissions ? <PlanningHubCreateMenu permissions={createPermissions} /> : null}
      />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
          <div className="flex min-w-0 shrink-0 items-center lg:justify-end">
            <PlanningHubConflictAttention
              week={week}
              incompleteCount={incompleteCount}
              onReviewConflicts={onReviewConflicts}
            />
          </div>
        ) : null}
      </div>

      <div
        className="flex flex-col gap-2 border-t border-[var(--border)]/70 pt-2"
        data-testid="planning-hub-toolbar"
      >
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
          <div
            className="inline-flex max-w-full shrink-0 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5 [scrollbar-width:thin]"
            role="group"
            aria-label="Ansicht"
            data-testid="planning-hub-perspective"
          >
            {(
              [
                ["kalender", "Kalender"],
                ["spielfeld", "Spielfeld"],
                ["garderobe", "Garderobe"],
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

          {isPlanningHubResourceTimelinePerspective(urlState.perspective) &&
          resourceScopeFacilityGroups.length > 0 ? (
            <div className="min-w-0 flex-1">
              <PlanningHubResourceScopeControl
                urlState={resolvedUrlState}
                facilityGroups={resourceScopeFacilityGroups}
                perspectiveLabel={
                  urlState.perspective === "garderobe" ? "Garderoben" : "Spielfelder"
                }
              />
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-col gap-2"
          data-testid="planning-hub-filter-panel"
        >
          {urlState.perspective === "liste" && week ? (
            <PlanningHubListeToolbar
              urlState={resolvedUrlState}
              visibleCount={listeFilteredWeek ? listOperationalVisibleItemCount(listeFilteredWeek) : 0}
              weekHasItems={listOperationalWeekHasAnyItems(week)}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <PlanningHubWeekFilters
              urlState={resolvedUrlState}
              teamOptions={teamOptions}
              facilityOptions={facilityOptions}
              inline
            />
            <PlanningHubPlannerViewOptions className="ml-auto sm:ml-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
