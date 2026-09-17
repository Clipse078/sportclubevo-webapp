import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { listWeekplannerPlanAllocations } from "@/lib/weekplanner/plan-service";
import { planOverrideKey } from "@/lib/weekplanner/plan-override-key";
import {
  getFacilitiesForTenantCached,
  getTenantDressingRoomOccupancyPresetsCached,
} from "@/lib/server/request-cache";
import { buildFacilityGroupsByAllocationGroupFromFacilities } from "@/lib/planning-hub/facility-groups";
import WeekPlannerWorkspace from "./WeekPlannerWorkspace";
import type { WeekplannerOverrideRow } from "./WeekplannerAllocationOverrideEditor";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { TrainingWeekWindow } from "@/lib/training/date-range";
import {
  createPlannerServerTimer,
  isPlannerPerfTimingEnabled,
  logPlannerServerTiming,
} from "@/lib/planning-hub/planner-server-timing";

export type PlannerWeekDataSectionProps = {
  tenantId: string;
  weekWindow: TrainingWeekWindow;
  locale: string;
  timezone: string;
  activePlan: WeekplannerPlanDto | null;
  canManagePlans: boolean;
  canManageTrainings: boolean;
  canManageEvents: boolean;
  urlState: PlanningHubUrlState;
  plans: WeekplannerPlanDto[];
  needsEagerFacilityGroups: boolean;
};

export default async function PlannerWeekDataSection({
  tenantId,
  weekWindow,
  locale,
  timezone,
  activePlan,
  canManagePlans,
  canManageTrainings,
  canManageEvents,
  urlState,
  plans,
  needsEagerFacilityGroups,
}: PlannerWeekDataSectionProps) {
  const perfTimer = isPlannerPerfTimingEnabled() ? createPlannerServerTimer() : null;

  const [week, dressingRoomOccupancyPresets, facilities] = await Promise.all([
    getWeekplannerWeek(
      tenantId,
      {
        from: weekWindow.from,
        to: weekWindow.to,
        days: weekWindow.days,
        param: weekWindow.param,
        previousParam: weekWindow.previousParam,
        nextParam: weekWindow.nextParam,
      },
      activePlan?.id,
    ),
    getTenantDressingRoomOccupancyPresetsCached(tenantId),
    getFacilitiesForTenantCached(tenantId),
  ]);
  perfTimer?.mark("week-aggregation-facilities");

  const facilityGroupsByAllocationGroup = needsEagerFacilityGroups
    ? buildFacilityGroupsByAllocationGroupFromFacilities(facilities)
    : null;
  perfTimer?.mark(
    facilityGroupsByAllocationGroup ? "facility-groups-eager" : "facility-groups-deferred",
  );

  const overrideEditing =
    canManagePlans && activePlan && facilityGroupsByAllocationGroup
      ? {
          planId: activePlan.id,
          planName: activePlan.name,
          overridesByKey: await buildOverridesByKey(tenantId, activePlan.id),
          facilityGroupsByAllocationGroup,
        }
      : undefined;

  const canonicalEditing = canManagePlans
    ? {
        canManageTrainings,
        canManageEvents,
        ...(facilityGroupsByAllocationGroup ? { facilityGroupsByAllocationGroup } : {}),
      }
    : undefined;

  if (perfTimer) {
    logPlannerServerTiming(perfTimer.finish());
  }

  return (
    <WeekPlannerWorkspace
      week={week}
      locale={locale}
      timezone={timezone}
      plans={plans}
      activePlanId={activePlan?.id ?? null}
      overrideEditing={overrideEditing}
      canonicalEditing={canonicalEditing}
      urlState={{ ...urlState, week: weekWindow.param }}
      dressingRoomOccupancyPresets={dressingRoomOccupancyPresets}
    />
  );
}

async function buildOverridesByKey(
  tenantId: string,
  planId: string,
): Promise<Record<string, WeekplannerOverrideRow[]>> {
  const allocations = await listWeekplannerPlanAllocations(tenantId, planId);
  const byKey: Record<string, WeekplannerOverrideRow[]> = {};

  for (const allocation of allocations) {
    const key = planOverrideKey(
      allocation.activityType,
      allocation.activityId,
      allocation.allocationGroup,
      allocation.participantId,
    );
    const list = byKey[key] ?? [];
    list.push({
      id: allocation.id,
      facilityResourceId: allocation.facilityResourceId,
      facilityResourceName: allocation.facilityResourceName,
      facilityResourceCode: allocation.facilityResourceCode,
      occupancyBeforeMinutes: allocation.occupancyBeforeMinutes,
      occupancyAfterMinutes: allocation.occupancyAfterMinutes,
    });
    byKey[key] = list;
  }

  return byKey;
}
