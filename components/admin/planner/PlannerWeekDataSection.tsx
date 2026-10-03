import { listWeekplannerPlanAllocations } from "@/lib/weekplanner/plan-service";
import { planOverrideKey } from "@/lib/weekplanner/plan-override-key";
import { getFacilitiesForTenantCached } from "@/lib/server/request-cache";
import { getWeekplannerWeekCached } from "@/lib/weekplanner/weekplanner-request-cache";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";
import { buildFacilityGroupsByAllocationGroupFromFacilities } from "@/lib/planning-hub/facility-groups";
import WeekPlannerWorkspace from "./WeekPlannerWorkspace";
import PlannerWeekContentReveal from "./PlannerWeekContentReveal";
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
  weekDaysKey: string;
  weekplannerPlanIdForWeek: string | null;
  standardWeekLoad: Promise<WeekplannerWeek>;
  dressingPresetsLoad: Promise<TenantDressingRoomOccupancyPresets> | null;
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
  weekDaysKey,
  weekplannerPlanIdForWeek,
  standardWeekLoad,
  dressingPresetsLoad,
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

  const week =
    weekplannerPlanIdForWeek === null
      ? await standardWeekLoad
      : await getWeekplannerWeekCached(
          tenantId,
          weekWindow.param,
          weekDaysKey,
          weekWindow.from.getTime(),
          weekWindow.to.getTime(),
          weekWindow.previousParam,
          weekWindow.nextParam,
          weekplannerPlanIdForWeek,
        );
  perfTimer?.mark("week-aggregation");

  const dressingRoomOccupancyPresets = dressingPresetsLoad
    ? await dressingPresetsLoad
    : undefined;
  perfTimer?.mark(dressingRoomOccupancyPresets ? "dressing-presets" : "dressing-presets-deferred");

  const facilities = needsEagerFacilityGroups
    ? await getFacilitiesForTenantCached(tenantId)
    : null;
  perfTimer?.mark(facilities ? "facilities-eager" : "facilities-deferred");

  const facilityGroupsByAllocationGroup =
    needsEagerFacilityGroups && facilities
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
    <PlannerWeekContentReveal>
      <WeekPlannerWorkspace
        week={week}
        locale={locale}
        timezone={timezone}
        plans={plans}
        activePlanId={activePlan?.id ?? null}
        overrideEditing={overrideEditing}
        canonicalEditing={canonicalEditing}
        urlState={{ ...urlState, week: weekWindow.param }}
        resourceTimelineCatalog={facilityGroupsByAllocationGroup ?? undefined}
        dressingRoomOccupancyPresets={dressingRoomOccupancyPresets}
      />
    </PlannerWeekContentReveal>
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
