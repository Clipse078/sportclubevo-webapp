import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listTrainingSeries } from "@/lib/training/training-service";
import { buildTrainingSeriesCockpitViewModel } from "@/lib/training/series-cockpit-data";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { listAllocationSummaryByTenant } from "@/lib/training/training-allocation-service";
import { listSessionAllocationSummaryByTenant } from "@/lib/training/session-allocation-service";
import {
  resolveTrainingDayWindow,
  resolveTrainingMonthWindow,
  resolveTrainingWeekWindow,
  listTrainingSessionDateBounds,
  formatTrainingDayLabel,
  formatTrainingMonthLabel,
  formatTrainingWeekLabel,
  normalizeTrainingCenterView,
  TRAINING_DEFAULT_TIMEZONE,
} from "@/lib/training/date-range";
import { buildTrainingCenterViewModel, normalizeTrainingActionFilter } from "@/lib/training/view-model";
import TrainingCenterShell from "@/components/admin/training/TrainingCenterShell";
import TrainingCenterOverview from "@/components/admin/training/TrainingCenterOverview";
import ResourcePlanningGridClient from "@/components/admin/training/planning-grid/ResourcePlanningGridClient";
import TrainingSeriesListView from "@/components/admin/training/TrainingSeriesListView";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { fetchPlanningGridData, normalizePlanningGridFilters } from "@/lib/training/planning-grid/data-service";
import type { PlanningResourceCategoryKey } from "@/lib/training/planning-grid/types";

type TrainingPageSearchParams = {
  tab?: string;
  archived?: string;
  view?: string;
  month?: string;
  week?: string;
  day?: string;
  filter?: string;
  category?: string;
  facility?: string;
  team?: string;
  conflicts?: string;
  unallocated?: string;
  daypart?: string;
};

type Props = {
  searchParams?: Promise<TrainingPageSearchParams>;
};

export default async function TrainingCenterPage({ searchParams }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.TRAININGS_DELETE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManage = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canCreate = canManage || hasPermission(session, PERMISSIONS.TRAININGS_VIEW);
  const canDelete = hasPermission(session, PERMISSIONS.TRAININGS_DELETE);
  const params: TrainingPageSearchParams = searchParams ? await searchParams : {};
  const tab =
    params.tab === "serien" ? "serien" : params.tab === "planungsraster" ? "planungsraster" : "kalender";
  const timezone = tenantContext.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const locale = tenantContext.locale ?? "de-CH";

  if (tab === "planungsraster") {
    const planningData = await fetchPlanningGridData({
      tenantId: tenantContext.id,
      timezone,
      dateParam: params.day,
      category: (params.category?.toUpperCase() as PlanningResourceCategoryKey | undefined) ?? null,
      filters: normalizePlanningGridFilters({
        facilityId: params.facility ?? null,
        teamSeasonId: params.team ?? null,
        conflictsOnly: params.conflicts === "1",
        unallocatedOnly: params.unallocated === "1",
      }),
    });

    return (
      <TrainingCenterShell
        activeTab="planungsraster"
        workspaceWidth="planning"
        canCreateSeries={canManage}
      >
        <ToastProvider>
          <ResourcePlanningGridClient
            viewModel={planningData.viewModel}
            dayLabel={formatTrainingDayLabel(planningData.viewModel.date, locale, timezone)}
            dayParam={planningData.dayWindow.param}
            previousDayParam={planningData.dayWindow.previousParam}
            nextDayParam={planningData.dayWindow.nextParam}
            canManage={canManage}
            locale={locale}
            timezone={timezone}
            daypartParam={params.daypart ?? null}
          />
        </ToastProvider>
      </TrainingCenterShell>
    );
  }

  if (tab === "serien") {
    const showArchived = params.archived === "1";
    const allSeries = await listTrainingSeries(tenantContext.id, { includeArchived: true });
    const displayedSeries = showArchived ? allSeries : allSeries.filter((series) => series.status !== "ARCHIVED");
    const archivedCount = allSeries.filter((series) => series.status === "ARCHIVED").length;

    const [cockpitRows, facilities] = await Promise.all([
      buildTrainingSeriesCockpitViewModel(tenantContext.id, displayedSeries, timezone),
      getFacilitiesForTenant(tenantContext.id),
    ]);

    function facilityGroupsForTypes(types: readonly string[]): FacilityGroup[] {
      return facilities
        .filter((facility) => facility.status !== "ARCHIVED")
        .map((facility) => ({
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.type as string,
          resources: facility.resources
            .filter((resource) => resource.status !== "ARCHIVED" && types.includes(resource.type))
            .map((resource) => ({
              id: resource.id,
              name: resource.name,
              code: resource.code,
              type: resource.type,
              facilityId: facility.id,
              facilityName: facility.name,
              facilityType: facility.type as string,
            })),
        }))
        .filter((group) => group.resources.length > 0);
    }

    const pitchFacilityGroups = facilityGroupsForTypes(["FULL_PITCH", "HALF_PITCH"]);
    const dressingRoomFacilityGroups = facilityGroupsForTypes(["DRESSING_ROOM"]);

    return (
      <TrainingCenterShell activeTab="serien" canCreateSeries={canCreate}>
        <TrainingSeriesListView
          cockpitRows={cockpitRows}
          showArchived={showArchived}
          archivedCount={archivedCount}
          canManage={canManage}
          isCoordinator={canManage}
          canDelete={canDelete}
          pitchFacilityGroups={pitchFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        />
      </TrainingCenterShell>
    );
  }

  const view = normalizeTrainingCenterView(params.view);
  const actionFilter = normalizeTrainingActionFilter(params.filter);

  const now = new Date();
  const monthWindow = resolveTrainingMonthWindow({
    monthParam: params.month,
    now,
    timeZone: timezone,
  });
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: params.week,
    now,
    timeZone: timezone,
  });
  const dayWindow = resolveTrainingDayWindow({
    dayParam: params.day,
    now,
    timeZone: timezone,
  });

  const sessionDateBounds = listTrainingSessionDateBounds(view, {
    month: monthWindow,
    week: weekWindow,
    day: dayWindow,
  });

  const [sessions, allocationSummaries, sessionAllocationOverrides] = await Promise.all([
    listTrainingSessions(tenantContext.id, sessionDateBounds),
    listAllocationSummaryByTenant(tenantContext.id),
    listSessionAllocationSummaryByTenant(tenantContext.id),
  ]);

  const viewModel = buildTrainingCenterViewModel(sessions, allocationSummaries, {
    actionFilter,
    sessionAllocationOverrides,
  });

  return (
    <TrainingCenterShell activeTab="kalender" canCreateSeries={canManage}>
      <TrainingCenterOverview
        view={view}
        actionFilter={actionFilter}
        viewModel={viewModel}
        monthWindow={{
          param: monthWindow.param,
          label: formatTrainingMonthLabel(monthWindow, locale, timezone),
          previousParam: monthWindow.previousParam,
          nextParam: monthWindow.nextParam,
          weeks: monthWindow.weeks,
        }}
        weekWindow={{
          param: weekWindow.param,
          label: formatTrainingWeekLabel(weekWindow, locale, timezone),
          previousParam: weekWindow.previousParam,
          nextParam: weekWindow.nextParam,
          days: weekWindow.days,
        }}
        dayWindow={{
          param: dayWindow.param,
          label: formatTrainingDayLabel(dayWindow.date, locale, timezone),
          previousParam: dayWindow.previousParam,
          nextParam: dayWindow.nextParam,
          date: dayWindow.date,
        }}
        canManage={canManage}
        timezone={timezone}
        locale={locale}
      />
    </TrainingCenterShell>
  );
}
