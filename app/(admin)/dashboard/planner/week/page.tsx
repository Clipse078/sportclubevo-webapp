import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { planOverrideKey } from "@/lib/weekplanner/plan-override-key";
import { listWeekplannerPlans, listWeekplannerPlanAllocations } from "@/lib/weekplanner/plan-service";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { materializeLinkedWeekplannerPlan } from "@/lib/wochenplan/plan-materialization";
import {
  getFacilitiesForTenantCached,
  getTenantDressingRoomOccupancyPresetsCached,
} from "@/lib/server/request-cache";
import { buildFacilityGroupsByAllocationGroupFromFacilities } from "@/lib/planning-hub/facility-groups";
import WeekPlannerPage from "@/components/admin/planner/WeekPlannerPage";
import { parsePlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import {
  createPlannerServerTimer,
  isPlannerPerfTimingEnabled,
  logPlannerServerTiming,
} from "@/lib/planning-hub/planner-server-timing";
import type { WeekplannerOverrideRow } from "@/components/admin/planner/WeekplannerAllocationOverrideEditor";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";

type PlannerWeekPageProps = {
  searchParams?: Promise<{
    week?: string;
    plan?: string;
    ansicht?: string;
    typ?: string;
    team?: string;
    facility?: string;
    konflikte?: string;
    ressource?: string;
    day?: string;
    zeit?: string;
  }>;
};

/**
 * WEEKPLANNER-01A — canonical Weekplanner foundation.
 *
 * Reuses the existing /dashboard/planner/week route (the only pre-existing
 * Weekplanner surface) rather than introducing a duplicate — evolved from a
 * season-scoped generic-Event listing into a read-only aggregation of the
 * three canonical planning inputs (TrainingSession, HOME Event(MATCH),
 * HOME Event(TOURNAMENT)). See lib/weekplanner/queries.ts.
 *
 * Permission: reuses the exact permission set already gating the "Planung"
 * sidebar section (TrainingCenter + TournamentCenter + Veranstaltungen) —
 * Weekplanner has no permission contract of its own to invent, and its
 * three inputs are already governed by these VIEW permissions.
 *
 * WEEKPLANNER-01B — Multiple Planning Variants.
 *
 * Resolves the optional `?plan=<id>` query param against this tenant's
 * active WeekplannerPlans for the resolved week. An unknown/foreign/
 * different-week planId is silently treated as "no plan selected" (the
 * Standardplan) rather than a hard error — e.g. navigating to a week that
 * doesn't have the previously selected plan.
 *
 * WOCHENPLAN-2.0-01F — Plan materialization.
 *
 * When `?plan=` matches a non-default WochenplanPlan, the server
 * idempotently materializes (or reuses) the linked WeekplannerPlan for
 * (tenantId, weekId, wochenplanPlanId) before loading effective week state.
 */
export default async function PlannerWeekPageRoute({
  searchParams,
}: PlannerWeekPageProps) {
  const perfTimer = isPlannerPerfTimingEnabled() ? createPlannerServerTimer() : null;

  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);

  perfTimer?.mark("auth-rbac");

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();
  perfTimer?.mark("tenant");

  const canManageTrainings = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canManageEvents = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);
  const canCreateTraining =
    canManageTrainings || hasPermission(session, PERMISSIONS.TRAININGS_VIEW);
  const canManagePlans = canManageTrainings || canManageEvents;

  const timezone = tenantContext.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const params = (await searchParams) ?? {};
  const urlState = parsePlanningHubUrlState(params);

  const now = new Date();
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: urlState.week ?? params.week,
    now,
    timeZone: timezone,
  });
  const todayParam = resolveTrainingWeekWindow({ now, timeZone: timezone }).param;

  const [wochenplanPlans, weekplannerPlans] = await Promise.all([
    listWochenplanPlans(tenantContext.id),
    listWeekplannerPlans(tenantContext.id, weekWindow.param),
  ]);
  perfTimer?.mark("plans");

  const defaultWochenplanPlan =
    wochenplanPlans.find((plan) => plan.isDefault) ?? wochenplanPlans[0] ?? null;
  const requestedPlanId = (urlState.plan ?? params.plan)?.trim();

  let viewedWochenplanPlanId = defaultWochenplanPlan?.id ?? null;
  let materializedWeekplannerPlan: WeekplannerPlanDto | null = null;

  if (requestedPlanId) {
    const wochenplanMatch = wochenplanPlans.find((plan) => plan.id === requestedPlanId);
    if (wochenplanMatch) {
      viewedWochenplanPlanId = wochenplanMatch.id;
      if (!wochenplanMatch.isDefault) {
        const materialized = await materializeLinkedWeekplannerPlan(
          tenantContext.id,
          weekWindow.param,
          wochenplanMatch.id,
          { createdByUserId: session.user?.id ?? null },
        );
        materializedWeekplannerPlan = materialized.weekplannerPlan;
      }
    } else {
      const legacyPlan = weekplannerPlans.find((plan) => plan.id === requestedPlanId) ?? null;
      if (legacyPlan) {
        materializedWeekplannerPlan = legacyPlan;
        viewedWochenplanPlanId =
          legacyPlan.wochenplanPlanId ?? defaultWochenplanPlan?.id ?? null;
      }
    }
  }

  const plans =
    materializedWeekplannerPlan &&
    !weekplannerPlans.some((plan) => plan.id === materializedWeekplannerPlan!.id)
      ? [...weekplannerPlans, materializedWeekplannerPlan]
      : weekplannerPlans;

  const activePlan = materializedWeekplannerPlan;

  perfTimer?.mark("plan-resolution");

  const needsEagerFacilityGroups =
    canManagePlans &&
    (urlState.perspective === "ressourcen" || Boolean(activePlan));

  const [week, dressingRoomOccupancyPresets, facilities] = await Promise.all([
    getWeekplannerWeek(
      tenantContext.id,
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
    getTenantDressingRoomOccupancyPresetsCached(tenantContext.id),
    getFacilitiesForTenantCached(tenantContext.id),
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
          overridesByKey: await buildOverridesByKey(tenantContext.id, activePlan.id),
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

  const facilityOptions = facilities.map((facility) => ({
    value: facility.id,
    label: facility.name,
  }));

  const resolvedUrlState = {
    ...urlState,
    week: weekWindow.param,
    plan: requestedPlanId ?? urlState.plan,
    day: urlState.day,
  };

  if (perfTimer) {
    logPlannerServerTiming(perfTimer.finish());
  }

  return (
    <WeekPlannerPage
      week={week}
      todayParam={todayParam}
      locale={tenantContext.locale ?? "de-CH"}
      timezone={timezone}
      wochenplanPlans={wochenplanPlans}
      plans={plans}
      viewedWochenplanPlanId={viewedWochenplanPlanId}
      selectedPlanParam={requestedPlanId ?? defaultWochenplanPlan?.id ?? null}
      materializedWeekplannerPlanId={activePlan?.id ?? null}
      activePlanId={activePlan?.id ?? null}
      canManagePlans={canManagePlans}
      overrideEditing={overrideEditing}
      canonicalEditing={canonicalEditing}
      urlState={resolvedUrlState}
      facilityOptions={facilityOptions}
      createPermissions={{
        training: canCreateTraining,
        match: canManageEvents,
        tournament: canManageEvents,
        veranstaltung: canManageEvents,
      }}
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

