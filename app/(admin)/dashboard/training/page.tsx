import { notFound, redirect } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listTrainingSeries } from "@/lib/training/training-service";
import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
} from "@/lib/planning-hub/admin-server-timing";
import { TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";
import { buildWochenplanerResourcesHrefFromLegacyTrainingParams } from "@/lib/planning-hub/training-planungsraster-redirect";
import { buildTrainingResourcesWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";
import {
  buildNormalizedTrainingManagementHref,
  isLegacyTrainingCalendarUrl,
} from "@/lib/training/legacy-training-url";
import {
  buildTrainingSeriesManagementRows,
  filterTrainingSeriesManagementRows,
  paginateTrainingSeriesManagementRows,
  parseTrainingSeriesManagementSort,
  sortTrainingSeriesManagementRows,
  type TrainingSeriesManagementFilters,
} from "@/lib/training/management-series-view";
import { attachTrainingManagementActivityPresentations } from "@/lib/sporting-activity-presentation/management-adapters";
import {
  listTeamSeasonDisplayNamesForManagement,
  listTeamSeasonFilterOptions,
} from "@/lib/training/management-data";
import { listAllocationsGroupedBySeries } from "@/lib/training/training-allocation-service";
import TrainingManagementWorkspace from "@/components/admin/training/TrainingManagementWorkspace";
import TrainingComposerCreateTrigger from "@/components/admin/training/TrainingComposerCreateTrigger";
import { buildTrainingFilterHrefMaps } from "@/lib/training/management-navigation";
import { findTeamSeasonsForTenant } from "@/lib/training/queries";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { prisma } from "@/lib/db/prisma";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { loadTrainingEffectiveGovernanceForSession } from "@/lib/training/composer/load-effective-governance-server";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";

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
  seriesSearch?: string;
  seriesTeam?: string;
  seriesStatus?: string;
  seriesSort?: string;
  page?: string;
  sessionSearch?: string;
  sessionTeam?: string;
  sessionStatus?: string;
  sessionsPage?: string;
};

type Props = {
  searchParams?: Promise<TrainingPageSearchParams>;
};

function parseSeriesStatusFilter(raw: string | undefined, showArchived: boolean): TrainingSeriesManagementFilters["status"] {
  const value = raw?.trim().toUpperCase();
  if (value === "ALL") return "ALL";
  if (value === "ACTIVE") return "ACTIVE";
  if (value === "INACTIVE") return "INACTIVE";
  if (value === "ARCHIVED") return "ARCHIVED";
  return showArchived ? "ALL" : "ACTIVE_ONLY";
}

export default async function TrainingCenterPage({ searchParams }: Props) {
  const perfTimer = isScePerfTimingEnabled() ? createAdminServerTimer("training") : null;

  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.TRAININGS_DELETE,
  ]);
  perfTimer?.mark("auth-rbac");

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();
  perfTimer?.mark("tenant");

  const canManage = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canCreate = canManage || hasPermission(session, PERMISSIONS.TRAININGS_VIEW);
  const canDelete = hasPermission(session, PERMISSIONS.TRAININGS_DELETE);
  const params: TrainingPageSearchParams = searchParams ? await searchParams : {};
  const timezone = tenantContext.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const locale = tenantContext.locale ?? "de-CH";

  if (params.tab === "planungsraster") {
    redirect(
      buildWochenplanerResourcesHrefFromLegacyTrainingParams({
        day: params.day,
        week: params.week,
        facility: params.facility,
        team: params.team,
        conflicts: params.conflicts,
        category: params.category,
        timezone,
      }),
    );
  }

  if (isLegacyTrainingCalendarUrl(params)) {
    redirect(
      buildNormalizedTrainingManagementHref({
        archived: params.archived,
        seriesSearch: params.seriesSearch,
        seriesTeam: params.seriesTeam,
        seriesStatus: params.seriesStatus,
      }),
    );
  }

  const showArchived = params.archived === "1";

  const [allSeries, allocationsBySeries, teamOptions] = await Promise.all([
    listTrainingSeries(tenantContext.id, { includeArchived: true }),
    listAllocationsGroupedBySeries(tenantContext.id),
    listTeamSeasonFilterOptions(tenantContext.id),
  ]);
  perfTimer?.mark("training-core-queries");

  const displayedSeries = showArchived
    ? allSeries
    : allSeries.filter((series) => series.status !== "ARCHIVED");
  const archivedCount = allSeries.filter((series) => series.status === "ARCHIVED").length;
  const activeCount = allSeries.filter((series) => series.status === "ACTIVE").length;
  const inactiveCount = allSeries.filter((series) => series.status === "INACTIVE").length;
  const trainingKpis = {
    active: activeCount,
    inactive: inactiveCount,
    archived: archivedCount,
    total: allSeries.length,
  };

  const teamSeasonIds = [...new Set(displayedSeries.map((series) => series.teamSeasonId))];
  const teamDisplayNameByTeamSeasonId = await listTeamSeasonDisplayNamesForManagement(
    tenantContext.id,
    teamSeasonIds,
  );
  perfTimer?.mark("training-team-labels");

  const teamLabelByTeamSeasonId = new Map(teamOptions.map((team) => [team.id, team.label]));

  const seriesManagementRows = attachTrainingManagementActivityPresentations(
    buildTrainingSeriesManagementRows({
      series: displayedSeries,
      tenantName: tenantContext.name,
      teamDisplayNameByTeamSeasonId,
      teamLabelByTeamSeasonId,
      allocationsBySeriesId: allocationsBySeries,
    }),
    tenantContext.name,
  );

  const filteredSeriesRows = filterTrainingSeriesManagementRows(seriesManagementRows, {
    search: params.seriesSearch,
    teamSeasonId: params.seriesTeam,
    status: parseSeriesStatusFilter(params.seriesStatus, showArchived),
  });

  const sort = parseTrainingSeriesManagementSort(params.seriesSort);
  const sortedSeriesRows = sortTrainingSeriesManagementRows(filteredSeriesRows, sort);
  const pageNumber = Number.parseInt(params.page ?? "1", 10);
  const pagination = paginateTrainingSeriesManagementRows(sortedSeriesRows, pageNumber);

  if (perfTimer) {
    logAdminServerTiming(perfTimer.finish());
  }

  const filterBase = {
    archived: showArchived,
    seriesSearch: params.seriesSearch,
    seriesTeam: params.seriesTeam,
    seriesStatus: params.seriesStatus,
    seriesSort: params.seriesSort,
  };
  const { teamHrefByValue, statusHrefByValue, resetFiltersHref } = buildTrainingFilterHrefMaps(
    "/dashboard/training",
    filterBase,
    teamOptions.map((team) => team.id),
  );

  const userId = session.user?.effectiveUserId ?? session.user?.id;
  let createTrigger = undefined;
  if (canCreate && userId) {
    const policy = createPlanningAuthorizationPolicy(prisma);
    const [teamSeasons, facilities, writableTeamIds, operationalDurationPolicy, effectiveGovernance] =
      await Promise.all([
        findTeamSeasonsForTenant(tenantContext.id),
        getFacilitiesForTenant(tenantContext.id),
        policy.getWritableTeamIds({ userId, tenantId: tenantContext.id }, "training"),
        getTenantOperationalDurationPolicy(tenantContext.id),
        loadTrainingEffectiveGovernanceForSession({ tenantId: tenantContext.id }),
      ]);

    function facilityGroupsForTypes(types: readonly string[]): FacilityGroup[] {
      return facilities
        .filter((f) => f.status !== "ARCHIVED")
        .map((f) => ({
          facilityId: f.id,
          facilityName: f.name,
          facilityType: f.type as string,
          resources: f.resources
            .filter((r) => r.status !== "ARCHIVED" && types.includes(r.type))
            .map((r) => ({
              id: r.id,
              name: r.name,
              code: r.code,
              type: r.type,
              facilityId: f.id,
              facilityName: f.name,
              facilityType: f.type as string,
            })),
        }))
        .filter((fg) => fg.resources.length > 0);
    }

    const writableTeamIdSet = new Set(writableTeamIds);
    const filteredTeamSeasons =
      writableTeamIds.length > 0
        ? teamSeasons.filter((ts) => writableTeamIdSet.has(ts.teamId))
        : teamSeasons;

    createTrigger = (
      <TrainingComposerCreateTrigger
        teamSeasons={filteredTeamSeasons.map((ts) => ({
          id: ts.id,
          teamId: ts.teamId,
          teamName: ts.teamName,
          seasonName: ts.seasonName,
          category: ts.category,
          genderGroup: ts.genderGroup,
        }))}
        pitchHallFacilityGroups={facilityGroupsForTypes(["FULL_PITCH", "HALF_PITCH"])}
        dressingRoomFacilityGroups={facilityGroupsForTypes(["DRESSING_ROOM"])}
        timeZone={timezone}
        defaultTrainingDurationMinutes={operationalDurationPolicy.TRAINING.durationMinutes}
        effectiveGovernance={
          effectiveGovernance ?? {
            activityType: "TRAINING",
            personId: "anonymous",
            mayCreate: true,
            publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
            approvalStrategy: "ANY_ONE",
            validatorPersonIds: [],
          }
        }
      />
    );
  }

  return (
    <div className="w-full">
      <TrainingManagementWorkspace
        createTrigger={createTrigger}
        canCreate={canCreate}
        canManage={canManage}
        canDelete={canDelete}
        isCoordinator={canManage}
        locale={locale}
        timezone={timezone}
        wochenplanerHref={buildTrainingResourcesWochenplanerHref({ timezone })}
        seriesRows={pagination.rows}
        teamOptions={teamOptions}
        pagination={{
          page: pagination.page,
          pageCount: pagination.pageCount,
          rangeStart: pagination.rangeStart,
          rangeEnd: pagination.rangeEnd,
          totalCount: pagination.totalCount,
        }}
        sort={sort}
        kpis={trainingKpis}
        archivedCount={archivedCount}
        teamHrefByValue={teamHrefByValue}
        statusHrefByValue={statusHrefByValue}
        resetFiltersHref={resetFiltersHref}
        filters={{
          seriesSearch: params.seriesSearch,
          seriesTeam: params.seriesTeam,
          seriesStatus: params.seriesStatus,
          archived: showArchived,
        }}
      />
    </div>
  );
}
