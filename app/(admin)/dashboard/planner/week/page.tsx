import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";
import { listWeekplannerPlans } from "@/lib/weekplanner/plan-service";
import { listWochenplanPlans } from "@/lib/wochenplan/plan-service";
import { materializeLinkedWeekplannerPlan } from "@/lib/wochenplan/plan-materialization";
import { formatWeekRangeLabel } from "@/lib/weekplanner/date";
import PlannerWeekStreamingRoot from "@/components/admin/planner/PlannerWeekChromeBridge";
import PlannerWeekDataSection from "@/components/admin/planner/PlannerWeekDataSection";
import PlanningHubLoadingShell from "@/components/admin/planning-hub/loading/PlanningHubLoadingShell";
import { parsePlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import {
  createPlannerServerTimer,
  isPlannerPerfTimingEnabled,
  logPlannerServerTiming,
} from "@/lib/planning-hub/planner-server-timing";
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
  const rangeLabel = formatWeekRangeLabel(weekWindow.days);

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
    <PlannerWeekStreamingRoot
      weekNav={{
        param: weekWindow.param,
        previousParam: weekWindow.previousParam,
        nextParam: weekWindow.nextParam,
        rangeLabel,
      }}
      urlState={resolvedUrlState}
      todayParam={todayParam}
      wochenplanPlans={wochenplanPlans}
      plans={plans}
      viewedWochenplanPlanId={viewedWochenplanPlanId}
      selectedPlanParam={requestedPlanId ?? defaultWochenplanPlan?.id ?? null}
      materializedWeekplannerPlanId={activePlan?.id ?? null}
      canManagePlans={canManagePlans}
      createPermissions={{
        training: canCreateTraining,
        match: canManageEvents,
        tournament: canManageEvents,
        veranstaltung: canManageEvents,
      }}
    >
      <Suspense
        fallback={
          <PlanningHubLoadingShell />
        }
      >
        <PlannerWeekDataSection
          tenantId={tenantContext.id}
          weekWindow={weekWindow}
          locale={tenantContext.locale ?? "de-CH"}
          timezone={timezone}
          activePlan={activePlan}
          canManagePlans={canManagePlans}
          canManageTrainings={canManageTrainings}
          canManageEvents={canManageEvents}
          urlState={resolvedUrlState}
          plans={plans}
          needsEagerFacilityGroups={needsEagerFacilityGroups}
        />
      </Suspense>
    </PlannerWeekStreamingRoot>
  );
}
