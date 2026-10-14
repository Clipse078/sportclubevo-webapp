import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  listMatchcenterMatches,
  type MatchcenterQueryDatabase,
} from "@/lib/matchcenter/query-service";
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
import MatchComposerCreateTrigger from "@/components/admin/matchcenter/MatchComposerCreateTrigger";
import { normalizeSpieleSearchQuery } from "@/lib/matchcenter/management-view";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { loadMatchComposerCreateSurfaceProps } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";

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
  const resolvedMonth = resolveMatchcenterMonthWindow({
    monthParam: params.month,
    timeZone: timezone,
  });

  // Current month param for the "Heute" navigation shortcut.
  // Computed separately from the selected month so navigating to a past/future
  // month still shows the correct "go back to today" target.
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

  // Month-scoped server-side query (MATCHCENTER-UX-01 §13): avoids loading
  // the full season — only the selected month's window is fetched, for
  // both Spielplanung and Resultate (they share one month filter).
  const matchOperationalPolicy = await getTenantMatchOperationalPolicyCached(tenantId);
  const [matches, tenantTeams, tenantClubCrestUrl] = await Promise.all([
    listMatchcenterMatches(matchcenterDatabase, {
      tenantId,
      from: resolvedMonth.from,
      to: resolvedMonth.to,
      matchOperationalPolicy,
    }),
    getTeamsListDataCached(tenantId),
    getTenantClubCrestUrlCached(tenantId),
  ]);
  perfTimer?.mark("match-loader-teams");
  const activeTeams = tenantTeams.filter((team) => team.isActive);
  const validTeamIds = new Set(activeTeams.map((team) => team.id));
  const teamFilter = normalizeMatchcenterTeamFilter(params.team, validTeamIds);
  const teamOptions = toMatchcenterTeamOptions(activeTeams);

  const monthWindow = {
    param: resolvedMonth.param,
    label: formatMonthLabel(resolvedMonth, locale, timezone),
    previousParam: resolvedMonth.previousParam,
    nextParam: resolvedMonth.nextParam,
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
  const matchComposerSurface =
    canManage && userId
      ? await loadMatchComposerCreateSurfaceProps({
          tenantId,
          userId,
          tenantClubName: tenantContext.name,
          tenantLogoUrl: tenantClubCrestUrl,
        })
      : null;

  const matchCreateTrigger =
    matchComposerSurface != null ? (
      <MatchComposerCreateTrigger
        activeSeasonId={matchComposerSurface.activeSeasonId}
        teamOptions={matchComposerSurface.teamOptions}
        pitchHallFacilityGroups={matchComposerSurface.pitchHallFacilityGroups}
        dressingRoomFacilityGroups={matchComposerSurface.dressingRoomFacilityGroups}
        effectiveGovernance={
          matchComposerSurface.effectiveGovernance ?? {
            activityType: "MATCH",
            personId: "anonymous",
            mayCreate: true,
            publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
            approvalStrategy: "ANY_ONE",
            validatorPersonIds: [],
          }
        }
        tenantClubName={matchComposerSurface.tenantClubName}
        tenantLogoUrl={matchComposerSurface.tenantLogoUrl}
      />
    ) : null;

  return (
    <ToastProvider>
      <div className="w-full">
        <SpieleManagementWorkspace
          matches={matches}
          tab={tab}
          actionFilter={actionFilter}
          wochenplanFilter={wochenplanFilter}
          teamFilter={teamFilter}
          teamOptions={teamOptions}
          monthWindow={monthWindow}
          timezone={timezone}
          locale={locale}
          canManage={canManage}
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
          matchCreateTrigger={matchCreateTrigger}
        />
      </div>
    </ToastProvider>
  );
}
