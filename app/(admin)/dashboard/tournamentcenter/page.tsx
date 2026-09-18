import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getTeamsListDataCached } from "@/lib/server/request-cache";
import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
} from "@/lib/planning-hub/admin-server-timing";
import { listTournaments } from "@/lib/tournaments/tournament-service";
import { normalizeTournamentActionFilter } from "@/lib/tournaments/view-model";
import {
  normalizeTournamentAgeFilter,
  normalizeTournamentCategoryFilter,
  normalizeTournamentLocationFilter,
  normalizeTournamentOwnOnlyFilter,
  normalizeTournamentPublicOnlyFilter,
  normalizeTournamentStatusFilter,
  normalizeTournamentTeamFilter,
  normalizeTournamentListView,
  resolveTournamentTimeScopeFromParams,
  toTournamentTeamOptions,
} from "@/lib/tournaments/navigation";
import {
  normalizeTournamentGroupMode,
  normalizeTournamentSortMode,
} from "@/lib/tournaments/workspace-view-model";
import TournamentCenterWorkspace from "@/components/admin/tournamentcenter/TournamentCenterWorkspace";

type TournamentCenterPageProps = {
  searchParams?: Promise<{
    scope?: string;
    tab?: string;
    q?: string;
    team?: string;
    month?: string;
    status?: string;
    filter?: string;
    group?: string;
    sort?: string;
    category?: string;
    age?: string;
    location?: string;
    ownership?: string;
    visibility?: string;
    view?: string;
  }>;
};

export default async function TournamentCenterPage({ searchParams }: TournamentCenterPageProps) {
  const perfTimer = isScePerfTimingEnabled()
    ? createAdminServerTimer("tournamentcenter")
    : null;

  const session = await requireAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  perfTimer?.mark("auth-rbac");

  const tenantContext = await getActiveTenant();
  if (!tenantContext) {
    notFound();
  }
  perfTimer?.mark("tenant");

  const timezone = tenantContext.timezone ?? "Europe/Zurich";
  const locale = tenantContext.locale ?? "de-CH";
  const canCreate = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);

  const params = (await searchParams) ?? {};
  const scope = resolveTournamentTimeScopeFromParams(params);
  const actionFilter = normalizeTournamentActionFilter(params.filter);
  const group = normalizeTournamentGroupMode(params.group);
  const sort = normalizeTournamentSortMode(params.sort, scope);
  const search = params.q?.trim() ?? "";
  const listView = normalizeTournamentListView(params.view);

  const [tournaments, tenantTeams] = await Promise.all([
    listTournaments(tenantContext.id),
    getTeamsListDataCached(tenantContext.id),
  ]);
  perfTimer?.mark("tournament-loader-teams");

  const activeTeams = tenantTeams.filter((team) => team.isActive);
  const validTeamIds = new Set(activeTeams.map((team) => team.id));
  const teamFilter = normalizeTournamentTeamFilter(params.team, validTeamIds);
  const teamOptions = toTournamentTeamOptions(activeTeams);
  const statusFilter = normalizeTournamentStatusFilter(params.status);
  const monthParam = params.month?.trim() || null;
  const categoryFilter = normalizeTournamentCategoryFilter(params.category);
  const ageFilter = normalizeTournamentAgeFilter(params.age);
  const locationFilter = normalizeTournamentLocationFilter(params.location);
  const ownOnly = normalizeTournamentOwnOnlyFilter(params.ownership);
  const publicOnly = normalizeTournamentPublicOnlyFilter(params.visibility);

  if (perfTimer) {
    logAdminServerTiming(perfTimer.finish());
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <TournamentCenterWorkspace
        tournaments={tournaments}
        scope={scope}
        search={search}
        teamFilter={teamFilter}
        monthParam={monthParam}
        statusFilter={statusFilter}
        actionFilter={actionFilter}
        group={group}
        sort={sort}
        categoryFilter={categoryFilter}
        ageFilter={ageFilter}
        locationFilter={locationFilter}
        ownOnly={ownOnly}
        publicOnly={publicOnly}
        listView={listView}
        teamOptions={teamOptions}
        tenantLogoUrl={tenantContext.logoUrl}
        timezone={timezone}
        locale={locale}
        canCreate={canCreate}
      />
    </div>
  );
}
