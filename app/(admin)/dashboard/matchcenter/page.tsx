import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  listMatchcenterMatches,
  listMatchcenterMatchesPage,
  listMatchcenterScheduleAnchors,
  type MatchcenterQueryDatabase,
} from "@/lib/matchcenter/query-service";
import {
  deriveSpielplanMonthChipsFromAnchors,
  mergeMatchcenterMatchesById,
  normalizeSpielplanungListMonthFilter,
  resolveMatchcenterCalendarMonthParam,
  resolveMatchcenterSpielplanScheduleScope,
  resolveMatchcenterSpielplanungQueryWindow,
  toSpielplanungPaginationState,
  type MatchcenterSeasonScope,
} from "@/lib/matchcenter/spielplan-schedule-scope";
import {
  formatMonthLabel,
  MATCHCENTER_DEFAULT_TIMEZONE,
  resolveMatchcenterMonthWindow,
} from "@/lib/matchcenter/month-range";
import {
  normalizeMatchcenterActionFilter,
  normalizeMatchcenterTab,
  normalizeMatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import {
  normalizeMatchcenterTeamFilter,
  normalizeSpieleHomeAwayFilter,
  normalizeSpieleListView,
  normalizeSpieleStatusMask,
  toMatchcenterTeamOptions,
} from "@/lib/matchcenter/navigation";
import {
  getTeamsListDataCached,
  getTenantClubCrestUrlCached,
  getTenantMatchOperationalPolicyCached,
} from "@/lib/server/request-cache";
import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
} from "@/lib/planning-hub/admin-server-timing";
import SpieleManagementWorkspace from "@/components/admin/matchcenter/SpieleManagementWorkspace";
import SpieleManagementHeaderMenu from "@/components/admin/matchcenter/SpieleManagementHeaderMenu";
import { PlanningActivitiesPageFrame, SceWorkspaceChrome } from "@/components/admin/planning/PlanningActivitiesPageFrame";
import { buildSpieleManagementWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import SceActivityCreateMenu from "@/components/sce/activity-create/SceActivityCreateMenu";
import { normalizeSpieleSearchQuery } from "@/lib/matchcenter/management-view";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { buildSceActivityCreateMenuProps } from "@/lib/sce/activity-create/build-activity-create-menu-props.server";
import { resolveSceActivityCreatePermissionsFromFlags } from "@/lib/sce/activity-create/activity-create-permissions";
import { canManageOperationalResourceAssignments } from "@/lib/planning/planning-operational-allocation-authorization";
import { loadSpieleInlinePreparationFacilityGroups } from "@/lib/matchcenter/load-spiele-inline-preparation-facilities.server";

type MatchcenterPageProps = {
  searchParams?: Promise<{
    tab?: string;
    month?: string;
    filter?: string;
    wochenplan?: string;
    team?: string;
    q?: string;
    sort?: string;
    ha?: string;
    view?: string;
    competition?: string;
    venue?: string;
    status?: string;
    cal?: string;
    scopeFrom?: string;
    scopeTo?: string;
  }>;
};

export default async function MatchcenterPage({
  searchParams,
}: MatchcenterPageProps) {
  const perfTimer = isScePerfTimingEnabled()
    ? createAdminServerTimer("matchcenter")
    : null;

  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  perfTimer?.mark("auth-rbac");

  const tenantContext = await getActiveTenant();

  if (!tenantContext) {
    notFound();
  }
  perfTimer?.mark("tenant");

  const tenantId = tenantContext.id;
  const timezone = tenantContext.timezone ?? MATCHCENTER_DEFAULT_TIMEZONE;
  const locale = tenantContext.locale ?? "de-CH";

  const params = (await searchParams) ?? {};
  const tab = normalizeMatchcenterTab(params.tab);
  const actionFilter = normalizeMatchcenterActionFilter(params.filter);
  const wochenplanFilter = normalizeMatchcenterWochenplanFilter(params.wochenplan);
  const canManage = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);
  const canManageOperationalAllocations = canManageOperationalResourceAssignments(session);
  const canManageTrainings = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const spielplanungListMonthFilter = normalizeSpielplanungListMonthFilter(params.month);

  const resultateMonth = resolveMatchcenterMonthWindow({
    monthParam: params.month,
    timeZone: timezone,
  });

  const calendarMonthParam = resolveMatchcenterCalendarMonthParam({
    calendarMonthParam: params.cal,
    timeZone: timezone,
  });
  const calendarMonth = resolveMatchcenterMonthWindow({
    monthParam: calendarMonthParam,
    timeZone: timezone,
  });

  const currentMonthWindow = resolveMatchcenterMonthWindow({ timeZone: timezone });
  const currentMonthParam = currentMonthWindow.param;

  /*
   * Prisma's generic delegate return type cannot structurally satisfy the
   * deliberately narrow MatchcenterQueryDatabase test contract, although the
   * runtime query and included relations match it exactly.
   *
   * Keep the adaptation local to this server-page boundary rather than
   * weakening the tested query-service contract.
   */
  const matchcenterDatabase =
    prisma as unknown as MatchcenterQueryDatabase;

  const activeSeasonRow = await prisma.season.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });
  const activeSeason: MatchcenterSeasonScope | null = activeSeasonRow
    ? {
        id: activeSeasonRow.id,
        name: activeSeasonRow.name,
        startDate: activeSeasonRow.startDate,
        endDate: activeSeasonRow.endDate,
      }
    : null;

  const scheduleScope = resolveMatchcenterSpielplanScheduleScope({
    timeZone: timezone,
    season: activeSeason,
    scopeFromParam: params.scopeFrom,
    scopeToParam: params.scopeTo,
  });

  const spielplanungQuery = resolveMatchcenterSpielplanungQueryWindow({
    scope: scheduleScope,
    skip: 0,
  });

  const matchOperationalPolicy = await getTenantMatchOperationalPolicyCached(tenantId);
  const inlinePreparationFacilitiesPromise = canManageOperationalAllocations
    ? loadSpieleInlinePreparationFacilityGroups(tenantId)
  : null;

  const [
    spielplanPage,
    scheduleAnchors,
    resultateMonthMatches,
    tenantTeams,
    tenantClubCrestUrl,
    inlinePreparationFacilities,
  ] = await Promise.all([
      listMatchcenterMatchesPage(matchcenterDatabase, {
        tenantId,
        from: spielplanungQuery.from,
        to: spielplanungQuery.to,
        limit: spielplanungQuery.limit,
        skip: spielplanungQuery.skip,
        enforceMaxWindow: spielplanungQuery.enforceMaxWindow,
        matchOperationalPolicy,
      }),
      listMatchcenterScheduleAnchors(matchcenterDatabase, {
        tenantId,
        from: spielplanungQuery.from,
        to: spielplanungQuery.to,
        enforceMaxWindow: spielplanungQuery.enforceMaxWindow,
      }),
      listMatchcenterMatches(matchcenterDatabase, {
        tenantId,
        from: resultateMonth.from,
        to: resultateMonth.to,
        matchOperationalPolicy,
      }),
      getTeamsListDataCached(tenantId),
      getTenantClubCrestUrlCached(tenantId),
      inlinePreparationFacilitiesPromise ?? Promise.resolve(null),
    ]);

  const upcomingMatches = spielplanPage.items;
  const matches = mergeMatchcenterMatchesById(upcomingMatches, resultateMonthMatches);
  const spielplanMonthChipsFromScope = deriveSpielplanMonthChipsFromAnchors(
    scheduleAnchors,
    locale,
    timezone,
  );
  const spielplanungPagination = toSpielplanungPaginationState({
    total: spielplanPage.total,
    hasMore: spielplanPage.hasMore,
    loadedCount: upcomingMatches.length,
    limit: spielplanPage.limit,
  });

  perfTimer?.mark("match-loader-teams");
  const activeTeams = tenantTeams.filter((team) => team.isActive);
  const validTeamIds = new Set(activeTeams.map((team) => team.id));
  const teamFilter = normalizeMatchcenterTeamFilter(params.team, validTeamIds);
  const teamOptions = toMatchcenterTeamOptions(activeTeams);

  const calendarMonthWindow = {
    param: calendarMonth.param,
    label: formatMonthLabel(calendarMonth, locale, timezone),
    previousParam: calendarMonth.previousParam,
    nextParam: calendarMonth.nextParam,
  };

  if (perfTimer) {
    logAdminServerTiming(perfTimer.finish());
  }

  const searchQuery = normalizeSpieleSearchQuery(params.q);
  const homeAwayFilter = normalizeSpieleHomeAwayFilter(params.ha);
  const listView = normalizeSpieleListView(params.view);
  const competitionFilter = params.competition?.trim() || null;
  const venueFilter = params.venue?.trim() || null;
  const statusMask = normalizeSpieleStatusMask(params.status, actionFilter);

  const userId = session.user?.effectiveUserId ?? session.user?.id;
  let activityCreateTrigger = null;
  let activityCreateQuickAccessTrigger = null;
  if (canManage && userId) {
    const permissions = resolveSceActivityCreatePermissionsFromFlags({
      canManageTrainings,
      canManageEvents: canManage,
    });
    const menuProps = await buildSceActivityCreateMenuProps({
      tenantId,
      userId,
      timeZone: timezone,
      tenantClubName: tenantContext.name,
      tenantLogoUrl: tenantClubCrestUrl,
      permissions,
    });
    activityCreateTrigger = <SceActivityCreateMenu {...menuProps} />;
    activityCreateQuickAccessTrigger = (
      <SceActivityCreateMenu {...menuProps} presentation="quick-access" />
    );
  }

  const wochenplanerHref = buildSpieleManagementWochenplanerHref({ timezone });

  return (
    <ToastProvider>
      <PlanningActivitiesPageFrame
        breadcrumbLeaf="Spiele"
        title="Spiele"
        description="Zentrale Spielplanung und operative Matchvorbereitung."
        descriptionTestId="spiele-header-subtitle"
        primaryAction={
          <SpieleManagementHeaderMenu
            canManage={canManage}
            wochenplanerHref={wochenplanerHref}
            activityCreateTrigger={activityCreateTrigger}
          />
        }
      >
        <SpieleManagementWorkspace
          hidePageHeader
          matches={matches}
          tab={tab}
          actionFilter={actionFilter}
          wochenplanFilter={wochenplanFilter}
          teamFilter={teamFilter}
          teamOptions={teamOptions}
          calendarMonthWindow={calendarMonthWindow}
          resultateMonthParam={resultateMonth.param}
          spielplanungListMonthFilter={spielplanungListMonthFilter}
          spielplanMatches={upcomingMatches}
          resultateMonthMatches={resultateMonthMatches}
          spielplanungPagination={spielplanungPagination}
          spielplanMonthChipsFromScope={spielplanMonthChipsFromScope}
          scheduleScopeLabel={scheduleScope.label}
          scheduleScopeSource={scheduleScope.source}
          scopeFrom={params.scopeFrom ?? null}
          scopeTo={params.scopeTo ?? null}
          timezone={timezone}
          locale={locale}
          canManage={canManage}
          canManageOperationalAllocations={canManageOperationalAllocations}
          pitchHallFacilityGroups={inlinePreparationFacilities?.pitchHallFacilityGroups ?? []}
          dressingRoomFacilityGroups={inlinePreparationFacilities?.dressingRoomFacilityGroups ?? []}
          currentMonthParam={currentMonthParam}
          tenantLogoUrl={tenantClubCrestUrl}
          tenantClubName={tenantContext.name}
          searchQuery={searchQuery}
          sortParam={params.sort ?? null}
          homeAwayFilter={homeAwayFilter}
          listView={listView}
          competitionFilter={competitionFilter}
          venueFilter={venueFilter}
          statusMask={statusMask}
          activityCreateTrigger={activityCreateTrigger}
          activityCreateQuickAccessTrigger={activityCreateQuickAccessTrigger}
        />
      </PlanningActivitiesPageFrame>
    </ToastProvider>
  );
}
