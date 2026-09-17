"use client";

import { useMemo, useState } from "react";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
import type { WochenplanPlanDto } from "@/lib/wochenplan/plan-types";
import type { PlanningHubCreatePermissions } from "@/components/admin/planning-hub/PlanningHubCreateMenu";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerOverrideRow } from "./WeekplannerAllocationOverrideEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";
import WeekPlannerChrome from "./WeekPlannerChrome";
import WeekPlannerWorkspace from "./WeekPlannerWorkspace";

type OverrideEditingContext = {
  planId: string;
  planName: string;
  overridesByKey: Record<string, WeekplannerOverrideRow[]>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

type CanonicalEditingContext = {
  canManageTrainings: boolean;
  canManageEvents: boolean;
  facilityGroupsByAllocationGroup?: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

type WeekPlannerPageProps = {
  week: WeekplannerWeek;
  todayParam: string;
  locale?: string;
  timezone?: string;
  wochenplanPlans?: WochenplanPlanDto[];
  plans?: WeekplannerPlanDto[];
  viewedWochenplanPlanId?: string | null;
  selectedPlanParam?: string | null;
  materializedWeekplannerPlanId?: string | null;
  activePlanId?: string | null;
  canManagePlans?: boolean;
  overrideEditing?: OverrideEditingContext;
  canonicalEditing?: CanonicalEditingContext;
  urlState?: PlanningHubUrlState;
  facilityOptions?: { value: string; label: string }[];
  createPermissions?: PlanningHubCreatePermissions;
  dressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
};

function getMissingAllocations(item: WeekplannerItem): string[] {
  const missing: string[] = [];
  if (item.pitchAllocations.length === 0) missing.push("Spielfeld");
  if (item.type === "MATCH") {
    if (item.dressingRoomAllocations.length === 0) missing.push("Heimkabine");
    if (item.awayDressingRoomAllocations.length === 0) missing.push("Gastkabine");
  }
  return missing;
}

export default function WeekPlannerPage({
  week,
  todayParam,
  locale = "de-CH",
  timezone = "Europe/Zurich",
  wochenplanPlans = [],
  plans = [],
  viewedWochenplanPlanId = null,
  selectedPlanParam = null,
  materializedWeekplannerPlanId = null,
  activePlanId = null,
  canManagePlans = false,
  overrideEditing,
  canonicalEditing,
  urlState: urlStateProp,
  facilityOptions = [],
  createPermissions,
  dressingRoomOccupancyPresets,
}: WeekPlannerPageProps) {
  const urlState: PlanningHubUrlState = urlStateProp ?? {
    week: week.param,
    perspective: "kalender",
    activity: "alle",
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  };

  const filteredWeek = applyPlanningHubFilters(week, urlState);
  const isStandardplan = activePlanId === null;
  const incompleteCount = isStandardplan
    ? filteredWeek.days.reduce(
        (sum, day) =>
          sum + day.items.filter((item) => getMissingAllocations(item).length > 0).length,
        0,
      )
    : 0;

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const day of week.days) {
      for (const item of day.items) {
        if (item.type === "TRAINING") {
          map.set(item.teamSeasonId, item.teamNames[0] ?? item.title);
        } else if (item.teamNames[0]) {
          map.set(item.teamNames[0], item.teamNames[0]);
        }
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "de-CH"));
  }, [week]);

  const [selectedIncident, setSelectedIncident] = useState<PlanningConflictIncident | null>(null);
  const [conflictPicker, setConflictPicker] = useState<PlanningConflictIncident[] | null>(null);

  function handleReviewConflicts(incidents: PlanningConflictIncident[]) {
    if (incidents.length === 1) {
      setSelectedIncident(incidents[0]!);
      return;
    }
    setConflictPicker(incidents);
  }

  return (
    <div className="space-y-2" data-testid="planning-hub-workspace">
      <WeekPlannerChrome
        weekNav={{
          param: week.param,
          previousParam: week.previousParam,
          nextParam: week.nextParam,
          rangeLabel: week.rangeLabel,
        }}
        urlState={urlState}
        todayParam={todayParam}
        wochenplanPlans={wochenplanPlans}
        plans={plans}
        viewedWochenplanPlanId={viewedWochenplanPlanId}
        selectedPlanParam={selectedPlanParam}
        materializedWeekplannerPlanId={materializedWeekplannerPlanId}
        canManagePlans={canManagePlans}
        createPermissions={createPermissions}
        teamOptions={teamOptions}
        facilityOptions={facilityOptions}
        week={week}
        incompleteCount={incompleteCount}
        onReviewConflicts={handleReviewConflicts}
      />

      <WeekPlannerWorkspace
        week={week}
        locale={locale}
        timezone={timezone}
        plans={plans}
        activePlanId={activePlanId}
        overrideEditing={overrideEditing}
        canonicalEditing={canonicalEditing}
        urlState={urlState}
        dressingRoomOccupancyPresets={dressingRoomOccupancyPresets}
        selectedIncident={selectedIncident ?? null}
        conflictPicker={conflictPicker ?? null}
        onCloseIncident={() => setSelectedIncident(null)}
        onCloseConflictPicker={() => setConflictPicker(null)}
        onPickConflictIncident={(incident) => {
          setConflictPicker(null);
          setSelectedIncident(incident);
        }}
      />
    </div>
  );
}
