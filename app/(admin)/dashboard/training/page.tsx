import { notFound, redirect } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listTrainingSeries } from "@/lib/training/training-service";
import { buildTrainingSeriesCockpitViewModel } from "@/lib/training/series-cockpit-data";
import { getFacilitiesForTenantCached } from "@/lib/server/request-cache";
import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
} from "@/lib/planning-hub/admin-server-timing";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { listAllocationSummaryByTenant, listAllocationsGroupedBySeries } from "@/lib/training/training-allocation-service";
import { listSessionAllocationsForSessionIds } from "@/lib/training/session-allocation-service";
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
  type TrainingSeriesManagementFilters,
} from "@/lib/training/management-series-view";
import {
  buildTrainingSessionManagementRows,
  filterTrainingSessionManagementRows,
  paginateTrainingSessionManagementRows,
  resolveManagementSessionDateWindow,
  type TrainingSessionManagementStatusFilter,
} from "@/lib/training/management-session-view";
import { buildPitchNameBySeriesId, listTeamSeasonFilterOptions } from "@/lib/training/management-data";
import TrainingManagementWorkspace from "@/components/admin/training/TrainingManagementWorkspace";
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

function parseSessionStatusFilter(raw: string | undefined): TrainingSessionManagementStatusFilter {
  const value = raw?.trim().toUpperCase();
  if (value === "GEPLANT" || value === "AUSNAHME" || value === "ABGESAGT") return value;
  return "ALL";
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
        sessionSearch: params.sessionSearch,
        sessionTeam: params.sessionTeam,
        sessionStatus: params.sessionStatus,
        sessionsPage: params.sessionsPage,
      }),
    );
  }

  const showArchived = params.archived === "1";
  const sessionsPage = Number.parseInt(params.sessionsPage ?? "1", 10);

  const sessionWindow = resolveManagementSessionDateWindow({ now: new Date() });

  const [allSeries, sessionsInWindow, allocationSummaries, allocationsBySeries, teamOptions] =
    await Promise.all([
      listTrainingSeries(tenantContext.id, { includeArchived: true }),
      listTrainingSessions(tenantContext.id, {
        dateFrom: sessionWindow.dateFrom,
        dateTo: sessionWindow.dateTo,
      }),
      listAllocationSummaryByTenant(tenantContext.id),
      listAllocationsGroupedBySeries(tenantContext.id),
      listTeamSeasonFilterOptions(tenantContext.id),
    ]);
  perfTimer?.mark("training-core-queries");

  const displayedSeries = showArchived
    ? allSeries
    : allSeries.filter((series) => series.status !== "ARCHIVED");
  const archivedCount = allSeries.filter((series) => series.status === "ARCHIVED").length;

  const sessionIds = sessionsInWindow.map((item) => item.id);
  const sessionAllocationsBySessionId = await listSessionAllocationsForSessionIds(
    tenantContext.id,
    sessionIds,
  );
  perfTimer?.mark("training-session-allocations");

  const [cockpitRows] = await Promise.all([
    buildTrainingSeriesCockpitViewModel(tenantContext.id, displayedSeries, timezone),
    getFacilitiesForTenantCached(tenantContext.id),
  ]);
  perfTimer?.mark("training-series-loader");

  const teamDisplayNameByTeamSeasonId = new Map<string, string>();
  for (const row of cockpitRows) {
    if (!teamDisplayNameByTeamSeasonId.has(row.teamSeasonId)) {
      teamDisplayNameByTeamSeasonId.set(row.teamSeasonId, row.teamDisplayName);
    }
  }

  const seriesManagementRows = buildTrainingSeriesManagementRows({
    series: displayedSeries,
    teamDisplayNameByTeamSeasonId,
    allocationsBySeriesId: allocationsBySeries,
    cockpitRows,
  });

  const filteredSeriesRows = filterTrainingSeriesManagementRows(seriesManagementRows, {
    search: params.seriesSearch,
    teamSeasonId: params.seriesTeam,
    status: parseSeriesStatusFilter(params.seriesStatus, showArchived),
  });

  const pitchNameBySeriesId = buildPitchNameBySeriesId(allocationsBySeries);

  const sessionManagementRows = buildTrainingSessionManagementRows({
    sessions: sessionsInWindow,
    seriesAllocationSummaries: allocationSummaries,
    sessionAllocationSummaries: new Map(),
    sessionAllocationsBySessionId,
    pitchNameBySeriesId,
  });

  const filteredSessionRows = filterTrainingSessionManagementRows(sessionManagementRows, {
    search: params.sessionSearch,
    teamSeasonId: params.sessionTeam,
    status: parseSessionStatusFilter(params.sessionStatus),
  });

  const paginatedSessions = paginateTrainingSessionManagementRows(filteredSessionRows, sessionsPage);

  if (perfTimer) {
    logAdminServerTiming(perfTimer.finish());
  }

  const sessionWindowLabel = `${sessionWindow.dateFromKey} – ${sessionWindow.dateToKey}`;

  return (
    <div className="max-w-[1200px]">
      <TrainingManagementWorkspace
        canCreate={canCreate}
        canManage={canManage}
        canDelete={canDelete}
        isCoordinator={canManage}
        locale={locale}
        timezone={timezone}
        wochenplanerHref={buildTrainingResourcesWochenplanerHref({ timezone })}
        seriesRows={filteredSeriesRows}
        sessionRows={paginatedSessions.rows}
        sessionHasMore={paginatedSessions.hasMore}
        sessionsNextPage={paginatedSessions.nextPage}
        teamOptions={teamOptions}
        archivedCount={archivedCount}
        sessionWindowLabel={sessionWindowLabel}
        filters={{
          seriesSearch: params.seriesSearch,
          seriesTeam: params.seriesTeam,
          seriesStatus: params.seriesStatus,
          sessionSearch: params.sessionSearch,
          sessionTeam: params.sessionTeam,
          sessionStatus: params.sessionStatus,
          archived: showArchived,
          sessionsPage,
        }}
      />
    </div>
  );
}
