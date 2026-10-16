import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PageHeader, PageShell } from "@/components/ui/page";
import ProgrammeViewSwitcher from "@/components/programme/ProgrammeViewSwitcher";
import PersonalProgrammeFilterBar from "@/components/admin/mein-programm/PersonalProgrammeFilterBar";
import PersonalProgrammeListeView from "@/components/admin/mein-programm/PersonalProgrammeListeView";
import PersonalKalenderWorkspace from "@/components/admin/kalender/PersonalKalenderWorkspace";
import SceActivityCreateMenu from "@/components/sce/activity-create/SceActivityCreateMenu";
import { buildSceActivityCreateMenuProps } from "@/lib/sce/activity-create/build-activity-create-menu-props.server";
import { resolveSceActivityCreatePermissionsFromFlags } from "@/lib/sce/activity-create/activity-create-permissions";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import { prisma } from "@/lib/db/prisma";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import { resolveMeinProgrammListeRange } from "@/lib/personal-agenda/programme-range";
import {
  buildMeinProgrammHref,
  parseMeinProgrammUrlState,
  type MeinProgrammUrlState,
} from "@/lib/personal-agenda/mein-programm-url";
import {
  filterPersonalProgrammeItems,
  filtersFromMeinProgrammUrlState,
  personalProgrammeFiltersActive,
} from "@/lib/personal-agenda/filter-personal-programme-items";
import { loadPersonalCalendarMonthBundle } from "@/lib/personal-agenda/load-personal-calendar-month-bundle";
import { buildCalendarTimeLabelById } from "@/lib/personal-agenda/build-calendar-time-labels";
import {
  filterNormalizedCalendarItemsForProgrammeFilters,
  recordFromFilteredCalendarItems,
} from "@/lib/personal-agenda/filter-normalized-calendar-items";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import type { PersonalKalenderUrlState } from "@/lib/personal-agenda/kalender-url";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MeinProgrammPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const params = (await searchParams) ?? {};
  const now = new Date();
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";
  const locale = tenantContext.locale ?? "de-CH";
  const urlState = parseMeinProgrammUrlState(params);

  const { platform, tenant } = await getRequestEffectivePermissions(
    session.user.id,
    tenantContext.id,
  );
  const permissionKeys = [...platform, ...tenant];

  const filters = filtersFromMeinProgrammUrlState(urlState);
  const filtersActive = personalProgrammeFiltersActive(filters);

  const listeRange = resolveMeinProgrammListeRange({ timeZone, now });

  const programmeLoaded = await loadPersonalProgramme({
    tenantId: tenantContext.id,
    userId: session.user.id,
    timeZone,
    now,
    from: listeRange.rangeStart,
    to: listeRange.rangeEnd,
    permissionKeys,
  });

  const filteredItems = filterPersonalProgrammeItems(programmeLoaded.items, filters);
  const fmtCfg = { locale, timezone: timeZone };

  const teams =
    programmeLoaded.teamIds.length > 0
      ? await prisma.team.findMany({
          where: { tenantId: tenantContext.id, id: { in: programmeLoaded.teamIds } },
          select: { id: true, name: true, shortName: true },
          orderBy: { name: "asc" },
        })
      : [];

  const teamLabels = Object.fromEntries(
    teams.map((t) => [t.id, t.shortName?.trim() || t.name]),
  );

  const monthWindow = resolveMatchcenterMonthWindow({
    now,
    timeZone,
    monthParam: urlState.month,
  });
  const calendarMonthParam = monthWindow.param;

  let calendarSection: ReactNode = null;
  if (urlState.view === "kalender") {
    const monthBundle = await loadPersonalCalendarMonthBundle({
      tenantId: tenantContext.id,
      userId: session.user.id,
      timeZone,
      now,
      monthParam: calendarMonthParam,
      quelle: urlState.quelle,
      permissionKeys,
    });

    const filteredCalendarItems = filterNormalizedCalendarItemsForProgrammeFilters(
      monthBundle.items,
      filters,
      timeZone,
    );
    const itemsByDayKey = recordFromFilteredCalendarItems(filteredCalendarItems, timeZone);
    const calendarTimeLabels = buildCalendarTimeLabelById(filteredCalendarItems, fmtCfg);

    const kalenderUrlState: PersonalKalenderUrlState = {
      month: calendarMonthParam,
      quelle: urlState.quelle,
    };

    const buildNavigationHref = (
      patch: Partial<PersonalKalenderUrlState>,
      current: PersonalKalenderUrlState,
    ) =>
      buildMeinProgrammHref(urlState, {
        view: "kalender",
        month: patch.month ?? current.month,
        quelle: patch.quelle ?? current.quelle,
      });

    const todayHref = buildMeinProgrammHref(urlState, {
      view: "kalender",
      month: resolveMatchcenterMonthWindow({ now, timeZone }).param,
    });

    calendarSection = (
      <PersonalKalenderWorkspace
        itemsByDayKey={itemsByDayKey}
        timeLabelById={calendarTimeLabels}
        timeZone={timeZone}
        urlState={kalenderUrlState}
        supported={monthBundle.supported}
        todayHref={todayHref}
        tenantDisplayNames={[tenantContext.name].filter(Boolean)}
        buildNavigationHref={buildNavigationHref}
      />
    );
  }

  const userId = session.user.effectiveUserId ?? session.user.id;
  const canManageTrainings = permissionKeys.includes(PERMISSIONS.TRAININGS_MANAGE);
  const canManageEvents = permissionKeys.includes(PERMISSIONS.EVENTS_MANAGE);
  const canCreate =
    canManageTrainings ||
    canManageEvents ||
    permissionKeys.includes(PERMISSIONS.WOCHENPLAN_MANAGE);

  let createMenu: ReactNode = null;
  if (canCreate && userId) {
    const tenantLogoUrl = await getTenantClubCrestUrlCached(tenantContext.id);
    const permissions = resolveSceActivityCreatePermissionsFromFlags({
      canManageTrainings,
      canManageEvents,
    });
    const menuProps = await buildSceActivityCreateMenuProps({
      tenantId: tenantContext.id,
      userId,
      timeZone,
      tenantClubName: tenantContext.name,
      tenantLogoUrl,
      permissions,
    });
    createMenu = <SceActivityCreateMenu {...menuProps} />;
  }

  const programmeUrlStateForSwitcher: MeinProgrammUrlState = urlState;

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Mein Programm"
          description="Deine relevanten Trainings, Spiele, Turniere und Veranstaltungen — chronologisch oder im Kalender."
          className="mb-0"
        />
        {createMenu}
      </div>

      <div className="space-y-4" data-testid="mein-programm-workspace">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProgrammeViewSwitcher
            basePath="/dashboard/mein-programm"
            urlState={programmeUrlStateForSwitcher}
          />
        </div>

        <PersonalProgrammeFilterBar urlState={urlState} teamLabels={teamLabels} />

        {urlState.view === "kalender" ? (
          calendarSection
        ) : (
          <PersonalProgrammeListeView
            items={filteredItems}
            timeZone={timeZone}
            locale={locale}
            supported={programmeLoaded.supported}
            filtersActive={filtersActive}
            fmtCfg={fmtCfg}
          />
        )}
      </div>
    </PageShell>
  );
}
