import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getTeamsListData } from "@/lib/teams/queries";
import { listTournaments } from "@/lib/tournaments/tournament-service";
import { normalizeTournamentActionFilter } from "@/lib/tournaments/view-model";
import {
  normalizeTournamentStatusFilter,
  normalizeTournamentTeamFilter,
  resolveTournamentTimeScopeFromParams,
  toTournamentTeamOptions,
} from "@/lib/tournaments/navigation";
import {
  normalizeTournamentGroupMode,
  normalizeTournamentSortMode,
} from "@/lib/tournaments/workspace-view-model";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
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
  }>;
};

export default async function TournamentCenterPage({ searchParams }: TournamentCenterPageProps) {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) {
    notFound();
  }

  const timezone = tenantContext.timezone ?? "Europe/Zurich";
  const locale = tenantContext.locale ?? "de-CH";
  const canCreate = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);

  const params = (await searchParams) ?? {};
  const scope = resolveTournamentTimeScopeFromParams(params);
  const actionFilter = normalizeTournamentActionFilter(params.filter);
  const group = normalizeTournamentGroupMode(params.group);
  const sort = normalizeTournamentSortMode(params.sort, scope);
  const search = params.q?.trim() ?? "";

  const [tournaments, tenantTeams] = await Promise.all([
    listTournaments(tenantContext.id),
    getTeamsListData(tenantContext.id),
  ]);

  const activeTeams = tenantTeams.filter((team) => team.isActive);
  const validTeamIds = new Set(activeTeams.map((team) => team.id));
  const teamFilter = normalizeTournamentTeamFilter(params.team, validTeamIds);
  const teamOptions = toTournamentTeamOptions(activeTeams);
  const statusFilter = normalizeTournamentStatusFilter(params.status);
  const monthParam = params.month?.trim() || null;

  return (
    <div className="max-w-[1400px] space-y-6">
      <AdminSectionHeader
        eyebrow="Planung"
        title="Turniere"
        description="Turniere planen, koordinieren und veröffentlichen."
        actions={
          canCreate ? (
            <Link href="/dashboard/tournamentcenter/new" className="fca-button-primary">
              <Plus className="h-4 w-4" />
              Turnier erstellen
            </Link>
          ) : undefined
        }
      />

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
        teamOptions={teamOptions}
        tenantLogoUrl={tenantContext.logoUrl}
        timezone={timezone}
        locale={locale}
        canCreate={canCreate}
      />
    </div>
  );
}
