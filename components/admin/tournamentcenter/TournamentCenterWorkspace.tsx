"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Trophy } from "lucide-react";
import type { TournamentDto, TournamentStatus } from "@/lib/tournaments/types";
import {
  buildTournamentCenterHref,
  buildTournamentCenterResetHref,
  hasActiveTournamentWorkspaceFilters,
  type TournamentTeamOption,
} from "@/lib/tournaments/navigation";
import {
  buildTurniereManagementWochenplanerHref,
  deriveTurniereManagementPresentation,
} from "@/lib/tournaments/management-view";
import {
  type TournamentGroupMode,
  type TournamentListView,
  type TournamentSortMode,
  type TournamentTimeScope,
  type TournamentWorkspaceRow,
} from "@/lib/tournaments/workspace-view-model";
import { isTournamentInArchivList } from "@/lib/tournaments/operational-state";
import type { TournamentActionFilter } from "@/lib/tournaments/view-model";
import { formatMonthLabel, resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import TurniereManagementKpiCards from "./TurniereManagementKpiCards";
import TurniereManagementToolbar from "./TurniereManagementToolbar";
import TurniereManagementRow from "./TurniereManagementRow";
import TurniereManagementMonthCalendar from "./TurniereManagementMonthCalendar";
import TurniereManagementQuickAccess from "./TurniereManagementQuickAccess";
import TurniereManagementFilterRail from "./TurniereManagementFilterRail";
import TurniereManagementHeaderMenu, {
  TurniereManagementPageTitle,
} from "./TurniereManagementHeaderMenu";
import {
  TURNIERE_WORKSPACE_MAIN_RAIL_GRID,
  TURNIERE_WORKSPACE_RAIL_ASIDE,
  TURNIERE_WORKSPACE_RAIL_STACK,
} from "./turniere-management-layout";

export type TournamentCenterWorkspaceProps = {
  tournaments: TournamentDto[];
  scope: TournamentTimeScope;
  search: string;
  teamFilter: string | null;
  monthParam: string | null;
  statusFilter: TournamentStatus | null;
  actionFilter: TournamentActionFilter;
  group: TournamentGroupMode;
  sort: TournamentSortMode;
  categoryFilter: string | null;
  ageFilter: string | null;
  locationFilter: string | null;
  ownOnly: boolean;
  publicOnly: boolean;
  listView: TournamentListView;
  teamOptions: TournamentTeamOption[];
  tenantLogoUrl?: string | null;
  basePath?: string;
  timezone?: string;
  locale?: string;
  canCreate?: boolean;
};

type WorkspaceOverrides = Partial<{
  scope: TournamentTimeScope;
  search: string;
  teamFilter: string | null;
  month: string | null;
  statusFilter: TournamentStatus | null;
  actionFilter: TournamentActionFilter;
  group: TournamentGroupMode;
  sort: TournamentSortMode;
  categoryFilter: string | null;
  ageFilter: string | null;
  locationFilter: string | null;
  ownOnly: boolean;
  publicOnly: boolean;
  listView: TournamentListView;
}>;

function workspaceHref(basePath: string, state: TournamentCenterWorkspaceProps, overrides: WorkspaceOverrides = {}) {
  return buildTournamentCenterHref(basePath, {
    scope: overrides.scope ?? state.scope,
    search: overrides.search ?? state.search,
    teamFilter: overrides.teamFilter !== undefined ? overrides.teamFilter : state.teamFilter,
    month: overrides.month !== undefined ? overrides.month : state.monthParam,
    statusFilter: overrides.statusFilter !== undefined ? overrides.statusFilter : state.statusFilter,
    actionFilter: overrides.actionFilter ?? state.actionFilter,
    group: overrides.group ?? state.group,
    sort: overrides.sort ?? state.sort,
    categoryFilter: overrides.categoryFilter !== undefined ? overrides.categoryFilter : state.categoryFilter,
    ageFilter: overrides.ageFilter !== undefined ? overrides.ageFilter : state.ageFilter,
    locationFilter: overrides.locationFilter !== undefined ? overrides.locationFilter : state.locationFilter,
    ownOnly: overrides.ownOnly ?? state.ownOnly,
    publicOnly: overrides.publicOnly ?? state.publicOnly,
    listView: overrides.listView ?? state.listView,
  });
}

export default function TournamentCenterWorkspace(props: TournamentCenterWorkspaceProps) {
  const {
    tournaments,
    scope,
    search: initialSearch,
    teamFilter,
    monthParam,
    statusFilter,
    actionFilter,
    group,
    sort,
    categoryFilter,
    ageFilter,
    locationFilter,
    ownOnly,
    publicOnly,
    listView,
    tenantLogoUrl = null,
    basePath = "/dashboard/tournamentcenter",
    timezone = "Europe/Zurich",
    locale = "de-CH",
    canCreate = true,
  } = props;

  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchDraft(initialSearch);
  }, [initialSearch]);

  const workspaceState = useMemo(
    () => ({
      tournaments,
      scope,
      search: initialSearch,
      teamFilter,
      monthParam,
      statusFilter,
      actionFilter,
      group,
      sort,
      categoryFilter,
      ageFilter,
      locationFilter,
      ownOnly,
      publicOnly,
      listView,
      teamOptions: props.teamOptions,
      tenantLogoUrl,
      basePath,
      timezone,
      locale,
      canCreate,
    }),
    [
      tournaments,
      scope,
      initialSearch,
      teamFilter,
      monthParam,
      statusFilter,
      actionFilter,
      group,
      sort,
      categoryFilter,
      ageFilter,
      locationFilter,
      ownOnly,
      publicOnly,
      listView,
      props.teamOptions,
      tenantLogoUrl,
      basePath,
      timezone,
      locale,
      canCreate,
    ],
  );

  const buildHref = useCallback(
    (overrides: WorkspaceOverrides) => workspaceHref(basePath, workspaceState, overrides),
    [basePath, workspaceState],
  );

  const pushSearch = useCallback(
    (value: string) => {
      setSearchDraft(value);
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        router.push(buildHref({ search: value }));
      }, 300);
    },
    [router, buildHref],
  );

  const effectiveGroup = group === "DATE" ? "MONTH" : group;

  const { viewModel, kpis, filterOptions, calendarDayKeys } = useMemo(
    () =>
      deriveTurniereManagementPresentation(
        tournaments,
        {
          scope,
          search: initialSearch,
          teamFilter,
          monthParam,
          statusFilter,
          actionFilter,
          group: effectiveGroup,
          sort,
          categoryFilter,
          ageFilter,
          locationFilter,
          ownOnly,
          publicOnly,
          listView,
        },
        { timeZone: timezone, locale },
      ),
    [
      tournaments,
      scope,
      initialSearch,
      teamFilter,
      monthParam,
      statusFilter,
      actionFilter,
      effectiveGroup,
      sort,
      categoryFilter,
      ageFilter,
      locationFilter,
      ownOnly,
      publicOnly,
      listView,
      timezone,
      locale,
    ],
  );

  const calendarMonthWindow = monthParam
    ? resolveMatchcenterMonthWindow({ monthParam, timeZone: timezone })
    : resolveMatchcenterMonthWindow({ timeZone: timezone });

  const wochenplanerHref = buildTurniereManagementWochenplanerHref({ timezone });
  const createHref = "/dashboard/tournamentcenter/new";

  const filtersActive = hasActiveTournamentWorkspaceFilters({
    search: initialSearch,
    teamFilter,
    month: monthParam,
    statusFilter,
    actionFilter,
    categoryFilter,
    ageFilter,
    locationFilter,
    ownOnly,
    publicOnly,
  });

  const resetHref = buildTournamentCenterResetHref(basePath, scope, effectiveGroup);

  function rowVariant(row: TournamentWorkspaceRow): "past" | "upcoming" {
    if (scope === "PAST") return "past";
    if (scope === "UPCOMING") return "upcoming";
    return isTournamentInArchivList(row.tournament) ? "past" : "upcoming";
  }

  const compactRows = listView === "KOMPAKT";

  const domainTabs = [
    {
      key: "UPCOMING",
      label: `Anstehend (${kpis.upcoming})`,
      href: buildHref({ scope: "UPCOMING" }),
    },
    {
      key: "PAST",
      label: `Vergangen (${kpis.past})`,
      href: buildHref({ scope: "PAST" }),
    },
    {
      key: "ALL",
      label: `Alle (${kpis.total})`,
      href: buildHref({ scope: "ALL" }),
    },
  ] as const;

  return (
    <div className="w-full space-y-4" data-testid="turniere-management-workspace">
      <header className="space-y-3 border-b border-[var(--border)] pb-4">
        <p className="text-xs text-[var(--muted)]">
          <span>Planung</span>
          <span className="mx-1.5 text-[var(--border-strong)]">›</span>
          <span className="text-[var(--text-2)]">Turniere</span>
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <TurniereManagementPageTitle />
            <p className="text-sm text-[var(--text-2)]" data-testid="turniere-header-subtitle">
              Turniere planen, koordinieren und veröffentlichen.
            </p>
          </div>
          <TurniereManagementHeaderMenu
            canCreate={canCreate}
            createHref={createHref}
            wochenplanerHref={wochenplanerHref}
          />
        </div>
      </header>

      <nav
        aria-label="Turniere-Bereiche"
        className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[var(--border)]/70"
        data-testid="turniere-domain-tabs"
      >
        {domainTabs.map((tab) => {
          const isActive = tab.key === scope;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              data-testid={`turniere-tab-${tab.key.toLowerCase()}`}
              className={cn(
                "border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-[var(--sce-primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text-2)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <span
          className="cursor-not-allowed border-b-2 border-transparent pb-2.5 text-sm font-medium text-[var(--muted)]/60"
          aria-disabled="true"
          data-testid="turniere-tab-kalender-disabled"
        >
          Kalender
        </span>
        <span
          className="cursor-not-allowed border-b-2 border-transparent pb-2.5 text-sm font-medium text-[var(--muted)]/60"
          aria-disabled="true"
          data-testid="turniere-tab-statistiken-disabled"
        >
          Statistiken
        </span>
      </nav>

      <TurniereManagementKpiCards
        kpis={kpis}
        scope={scope}
        anstehendHref={buildHref({ scope: "UPCOMING" })}
        vergangenHref={buildHref({ scope: "PAST" })}
      />

      <div className={cn(TURNIERE_WORKSPACE_MAIN_RAIL_GRID)}>
        <div className="min-w-0 space-y-4">
          <TurniereManagementToolbar
            searchDraft={searchDraft}
            onSearchChange={pushSearch}
            categoryFilter={categoryFilter}
            ageFilter={ageFilter}
            statusFilter={statusFilter}
            locationFilter={locationFilter}
            categoryOptions={filterOptions.categories}
            ageOptions={filterOptions.ageClasses}
            locationOptions={filterOptions.locations}
            listView={listView}
            listeHref={buildHref({ listView: "LISTE" })}
            kompaktHref={buildHref({ listView: "KOMPAKT" })}
            kalenderHref={wochenplanerHref}
            buildCategoryHref={(value) => buildHref({ categoryFilter: value })}
            buildAgeHref={(value) => buildHref({ ageFilter: value })}
            buildStatusHref={(value) => buildHref({ statusFilter: value })}
            buildLocationHref={(value) => buildHref({ locationFilter: value })}
          />

          {viewModel.emptyKind === "no_data" ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <EmptyState
                icon={<Trophy className="h-8 w-8" />}
                heading="Noch keine Turniere"
                description="Erstellen Sie das erste Turnier für Ihren Verein."
                action={
                  canCreate ? (
                    <Link href={createHref} className="fca-button-primary">
                      <Plus className="h-4 w-4" />
                      Turnier erstellen
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : viewModel.emptyKind === "no_scope" ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <EmptyState
                icon={<Trophy className="h-8 w-8" />}
                heading={
                  scope === "UPCOMING"
                    ? "Keine anstehenden Turniere"
                    : scope === "PAST"
                      ? "Keine vergangenen Turniere"
                      : "Keine Turniere vorhanden"
                }
                description="Für diesen Zeitraum liegen keine Einträge vor."
                action={
                  scope === "UPCOMING" ? (
                    <Link href={buildHref({ scope: "PAST" })} className="fca-button-secondary text-sm">
                      Vergangene Turniere anzeigen
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : viewModel.emptyKind === "filtered" ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <EmptyState
                icon={<Trophy className="h-8 w-8" />}
                heading="Keine Turniere entsprechen den Filtern"
                description="Passen Sie Suche oder Filter an."
                action={
                  <Link href={resetHref} className="fca-button-secondary text-sm" data-testid="turniere-empty-reset">
                    Filter zurücksetzen
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-6" data-testid="turniere-list">
              {viewModel.groups.map((groupBlock) => (
                <section key={groupBlock.key} className="space-y-2">
                  {groupBlock.heading ? (
                    <h2
                      className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]"
                      data-testid={`turniere-month-${groupBlock.key}`}
                    >
                      {groupBlock.heading}
                    </h2>
                  ) : null}
                  <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    {groupBlock.rows.map((row) => (
                      <TurniereManagementRow
                        key={`${groupBlock.key}-${row.tournament.id}`}
                        tournament={row.tournament}
                        assessment={row.assessment}
                        locale={locale}
                        timezone={timezone}
                        tenantLogoUrl={tenantLogoUrl}
                        canManage={canCreate}
                        compact={compactRows}
                        variant={rowVariant(row)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside
          className={cn(TURNIERE_WORKSPACE_RAIL_ASIDE, TURNIERE_WORKSPACE_RAIL_STACK)}
          data-testid="turniere-management-rail"
        >
          <TurniereManagementMonthCalendar
            monthParam={calendarMonthWindow.param}
            timezone={timezone}
            tournamentDayKeys={calendarDayKeys}
            previousMonthHref={buildHref({ month: calendarMonthWindow.previousParam })}
            nextMonthHref={buildHref({ month: calendarMonthWindow.nextParam })}
          />
          <TurniereManagementQuickAccess canCreate={canCreate} createHref={createHref} />
          <TurniereManagementFilterRail
            resetHref={resetHref}
            categoryFilter={categoryFilter}
            ageFilter={ageFilter}
            statusFilter={statusFilter}
            locationFilter={locationFilter}
            ownOnly={ownOnly}
            publicOnly={publicOnly}
            categoryOptions={filterOptions.categories}
            ageOptions={filterOptions.ageClasses}
            locationOptions={filterOptions.locations}
            buildCategoryHref={(value) => buildHref({ categoryFilter: value })}
            buildAgeHref={(value) => buildHref({ ageFilter: value })}
            buildStatusHref={(value) => buildHref({ statusFilter: value })}
            buildLocationHref={(value) => buildHref({ locationFilter: value })}
            buildOwnOnlyHref={(enabled) => buildHref({ ownOnly: enabled })}
            buildPublicOnlyHref={(enabled) => buildHref({ publicOnly: enabled })}
          />
          <section
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 sm:col-span-2 min-[105rem]:col-span-1"
            data-testid="turniere-tip-card"
          >
            <div className="flex gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">Tipp</p>
                <p className="text-xs text-[var(--text-2)]">
                  Koordinieren Sie Turnier-Ressourcen und Garderoben im Wochenplaner — dort sehen Sie
                  Spielfeld- und Hallenbelegungen im Vereinskontext.
                </p>
                <Link
                  href={wochenplanerHref}
                  className="inline-block text-xs font-medium text-[var(--sce-primary)] hover:underline"
                  data-testid="turniere-tip-wochenplaner"
                >
                  Wochenplaner öffnen
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
