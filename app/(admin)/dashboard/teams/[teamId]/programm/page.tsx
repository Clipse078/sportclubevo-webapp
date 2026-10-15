import { auth } from "@/auth";
import ProgrammeViewSwitcher from "@/components/programme/ProgrammeViewSwitcher";
import ProgrammeListeView from "@/components/programme/ProgrammeListeView";
import ProgrammeCalendarView from "@/components/programme/ProgrammeCalendarView";
import { requireTeamCockpitAccess } from "@/lib/teams/team-cockpit-layout";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { queryProgramme } from "@/lib/programme-engine/query-programme";
import {
  buildProgrammeHref,
  parseProgrammeUrlState,
  programmeFiltersFromUrlState,
} from "@/lib/programme-engine/programme-url";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = (teamId: string) => `/dashboard/teams/${teamId}/programm`;

export default async function TeamProgrammePage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const { tenantId, tenant, team } = await requireTeamCockpitAccess(teamId);

  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const teamSeasonId = team.currentTeamSeasonId;
  if (!teamSeasonId) {
    return (
      <p className="text-sm text-[var(--muted)]" data-testid="team-programme-no-season">
        Keine aktive Saison — Programm ist ohne Team-Saison nicht verfügbar.
      </p>
    );
  }

  const rawParams = (await searchParams) ?? {};
  const timeZone = tenant.timezone ?? "Europe/Zurich";
  const locale = tenant.locale ?? "de-CH";
  const now = new Date();
  const urlState = parseProgrammeUrlState(rawParams);

  const monthWindow = resolveMatchcenterMonthWindow({
    now,
    timeZone,
    monthParam: urlState.month,
  });

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    session.user.id,
    tenantId,
  );
  const permissionKeys = [...platform, ...tenantPerms];
  const tenantLogoUrl = await getTenantClubCrestUrlCached(tenantId);

  const result = await queryProgramme({
    tenantId,
    timeZone,
    now,
    userId: session.user.id,
    permissionKeys,
    tenantClubName: tenant.name,
    tenantLogoUrl,
    temporal: urlState.temporal,
    scope: {
      kind: "TEAM",
      teamId: team.id,
      teamSeasonId,
      orgUnitId: team.orgUnitId ?? null,
    },
    filters: programmeFiltersFromUrlState(urlState),
  });

  const fmtCfg = { locale, timezone: timeZone };
  const basePath = BASE(teamId);

  const previousMonthHref = buildProgrammeHref(basePath, urlState, {
    view: "kalender",
    month: monthWindow.previousParam,
  });
  const nextMonthHref = buildProgrammeHref(basePath, urlState, {
    view: "kalender",
    month: monthWindow.nextParam,
  });
  const todayHref = buildProgrammeHref(basePath, urlState, {
    view: "kalender",
    month: resolveMatchcenterMonthWindow({ now, timeZone }).param,
  });

  return (
    <div className="space-y-4" data-testid="team-programme-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProgrammeViewSwitcher basePath={basePath} urlState={urlState} />
      </div>

      {urlState.view === "kalender" ? (
        <ProgrammeCalendarView
          items={result.items}
          monthParam={monthWindow.param}
          timeZone={timeZone}
          fmtCfg={fmtCfg}
          previousMonthHref={previousMonthHref}
          nextMonthHref={nextMonthHref}
          todayHref={todayHref}
        />
      ) : (
        <ProgrammeListeView items={result.items} fmtCfg={fmtCfg} timeZone={timeZone} />
      )}
    </div>
  );
}
