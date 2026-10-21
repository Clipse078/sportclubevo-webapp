import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PageHeader, PageShell } from "@/components/ui/page";
import ProgrammeViewSwitcher from "@/components/programme/ProgrammeViewSwitcher";
import ProgrammeListeView from "@/components/programme/ProgrammeListeView";
import ProgrammeCalendarView from "@/components/programme/ProgrammeCalendarView";
import ClubProgrammeFilterBar from "@/components/programme/ClubProgrammeFilterBar";
import { queryProgramme } from "@/lib/programme-engine/query-programme";
import {
  buildProgrammeHref,
  parseProgrammeUrlState,
  programmeFiltersFromUrlState,
} from "@/lib/programme-engine/programme-url";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { getOrgUnits } from "@/lib/org/queries";
import { prisma } from "@/lib/db/prisma";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = "/dashboard/programm";

export default async function ClubProgrammePage({ searchParams }: Props) {
  await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.WOCHENPLAN_MANAGE,
  ]);

  const session = await auth();
  if (!session?.user?.id) notFound();

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const tenantId = tenantContext.id;
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";
  const locale = tenantContext.locale ?? "de-CH";
  const now = new Date();
  const rawParams = (await searchParams) ?? {};
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

  const [result, orgUnits, teams] = await Promise.all([
    queryProgramme({
      tenantId,
      timeZone,
      now,
      userId: session.user.id,
      permissionKeys,
      tenantClubName: tenantContext.name,
      tenantLogoUrl,
      temporal: urlState.temporal,
      scope: { kind: "CLUB" },
      filters: programmeFiltersFromUrlState(urlState),
    }),
    getOrgUnits(tenantId),
    prisma.team.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, shortName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const teamLabels = Object.fromEntries(
    teams.map((t) => [t.id, t.shortName?.trim() || t.name]),
  );
  const orgUnitLabels = Object.fromEntries(orgUnits.map((o) => [o.id, o.name]));

  const fmtCfg = { locale, timezone: timeZone };
  const filtersActive =
    urlState.teamIds.length > 0 ||
    urlState.orgUnitIds.length > 0 ||
    urlState.activityKinds.length > 0;

  const previousMonthHref = buildProgrammeHref(BASE, urlState, {
    view: "kalender",
    month: monthWindow.previousParam,
  });
  const nextMonthHref = buildProgrammeHref(BASE, urlState, {
    view: "kalender",
    month: monthWindow.nextParam,
  });
  const todayHref = buildProgrammeHref(BASE, urlState, {
    view: "kalender",
    month: resolveMatchcenterMonthWindow({ now, timeZone }).param,
  });

  return (
    <PageShell>
      <PageHeader
        title="Vereinsprogramm"
        description="Chronologisches Club-Programm — Training, Spiele, Turniere und Veranstaltungen."
      />
      <div className="space-y-3" data-testid="club-programme-workspace">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ProgrammeViewSwitcher basePath={BASE} urlState={urlState} />
        </div>

        <ClubProgrammeFilterBar
          basePath={BASE}
          urlState={urlState}
          teamLabels={teamLabels}
          orgUnitLabels={orgUnitLabels}
        />

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
          <ProgrammeListeView
            items={result.items}
            fmtCfg={fmtCfg}
            timeZone={timeZone}
            filtersActive={filtersActive}
          />
        )}
      </div>
    </PageShell>
  );
}
