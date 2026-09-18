import Link from "next/link";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import {
  buildMatchcenterViewModel,
  type MatchcenterActionFilter,
  type MatchcenterTab,
  type MatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import {
  buildMatchcenterHref,
  normalizeSpieleStatusMask,
  type MatchcenterTeamOption,
  type SpieleHomeAwayFilter,
  type SpieleListView,
  type SpieleStatusMaskKey,
} from "@/lib/matchcenter/navigation";
import {
  buildCancelledSpielplanungRows,
  countSpieleStatusBuckets,
  deriveSpieleCompetitionOptions,
  deriveSpieleVenueOptions,
  filterResultateBySearch,
  filterSpielplanungRowsByCompetition,
  filterSpielplanungRowsByHomeAway,
  filterSpielplanungRowsBySearch,
  filterSpielplanungRowsByStatusMask,
  filterSpielplanungRowsByVenue,
  groupResultateByDay,
  parseSpieleManagementSort,
  sortResultateMatches,
  sortSpielplanungRows,
} from "@/lib/matchcenter/management-view";
import { buildSpieleManagementWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { CenterPeriodNavigation } from "@/components/centers/CenterPeriodNavigation";
import MatchcenterReconciliationPanel from "./MatchcenterReconciliationPanel";
import SpieleManagementToolbar from "./SpieleManagementToolbar";
import SpieleManagementKpiCards from "./SpieleManagementKpiCards";
import SpieleManagementUpcomingList from "./SpieleManagementUpcomingList";
import SpieleManagementResultRow from "./SpieleManagementResultRow";
import SpieleManagementViewSwitcher from "./SpieleManagementViewSwitcher";
import SpieleManagementHeaderMenu from "./SpieleManagementHeaderMenu";
import SpieleManagementMonthCalendar, {
  collectMatchDayKeys,
} from "./SpieleManagementMonthCalendar";
import SpieleManagementSchnellfilter from "./SpieleManagementSchnellfilter";
import { cn } from "@/lib/cn";

export type MatchcenterMonthWindowLike = {
  param: string;
  label: string;
  previousParam: string;
  nextParam: string;
};

type Props = {
  matches: MatchcenterMatchSummary[];
  tab: MatchcenterTab;
  actionFilter: MatchcenterActionFilter;
  wochenplanFilter: MatchcenterWochenplanFilter;
  teamFilter: string | null;
  teamOptions: MatchcenterTeamOption[];
  monthWindow: MatchcenterMonthWindowLike;
  basePath?: string;
  timezone?: string;
  locale?: string;
  canManage?: boolean;
  currentMonthParam?: string;
  tenantLogoUrl?: string | null;
  searchQuery?: string;
  sortParam?: string | null;
  homeAwayFilter?: SpieleHomeAwayFilter;
  listView?: SpieleListView;
  competitionFilter?: string | null;
  venueFilter?: string | null;
  statusMask?: readonly SpieleStatusMaskKey[] | null;
};

type DomainTab = {
  key: string;
  label: string;
  href?: string;
  disabled?: boolean;
};

const DOMAIN_TABS: DomainTab[] = [
  { key: "spielplanung", label: "Spielplanung" },
  { key: "resultate", label: "Resultate" },
  { key: "statistiken", label: "Statistiken", disabled: true },
  { key: "kalender", label: "Kalender", disabled: true },
  { key: "ressourcen", label: "Ressourcen", disabled: true },
  { key: "archiv", label: "Archiv", disabled: true },
];

const RESULT_LIST_HEADER =
  "hidden md:grid md:grid-cols-[minmax(5.5rem,0.55fr)_minmax(0,1.85fr)_minmax(0,1fr)_minmax(5.75rem,0.85fr)_3rem] md:gap-x-4 border-b border-[var(--border)]/60 bg-[var(--surface-2)]/25 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";

function buildHref(
  basePath: string,
  params: {
    tab: MatchcenterTab;
    month: string;
    actionFilter: MatchcenterActionFilter;
    wochenplanFilter: MatchcenterWochenplanFilter;
    teamFilter: string | null;
    search?: string;
    sort?: string | null;
    homeAwayFilter?: SpieleHomeAwayFilter;
    listView?: SpieleListView;
    competitionFilter?: string | null;
    venueFilter?: string | null;
    statusMask?: readonly SpieleStatusMaskKey[];
  },
): string {
  return buildMatchcenterHref(basePath, params);
}

function toggleStatusMask(
  current: readonly SpieleStatusMaskKey[],
  key: SpieleStatusMaskKey,
): SpieleStatusMaskKey[] {
  const set = new Set(current);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  if (set.size === 0) return ["anstehend", "offen", "bereit"];
  return [...set];
}

export default function SpieleManagementWorkspace({
  matches,
  tab,
  actionFilter,
  wochenplanFilter,
  teamFilter,
  teamOptions,
  monthWindow,
  basePath = "/dashboard/matchcenter",
  timezone = "Europe/Zurich",
  locale = "de-CH",
  canManage = false,
  currentMonthParam,
  tenantLogoUrl = null,
  searchQuery = "",
  sortParam = null,
  homeAwayFilter = "ALLE",
  listView = "LISTE",
  competitionFilter = null,
  venueFilter = null,
  statusMask: statusMaskProp = null,
}: Props) {
  const statusMask = statusMaskProp ?? normalizeSpieleStatusMask(undefined, actionFilter);

  const viewModel = buildMatchcenterViewModel(matches, {
    actionFilter: "ALLE",
    wochenplanFilter,
    teamFilter,
  });

  const parsedSort = parseSpieleManagementSort(sortParam);
  const sort =
    sortParam != null
      ? parsedSort
      : tab === "RESULTATE"
        ? "KICKOFF_DESC"
        : "KICKOFF_ASC";

  const cancelledRows = buildCancelledSpielplanungRows(matches);
  const baseSpielplanung = [...viewModel.spielplanung];
  const withCancelled =
    statusMask.includes("abgesagt") && tab === "SPIELPLANUNG"
      ? sortSpielplanungRows([...baseSpielplanung, ...cancelledRows], sort)
      : sortSpielplanungRows(baseSpielplanung, sort);

  const spielplanungRows = sortSpielplanungRows(
    filterSpielplanungRowsByVenue(
      filterSpielplanungRowsByCompetition(
        filterSpielplanungRowsByHomeAway(
          filterSpielplanungRowsByStatusMask(
            filterSpielplanungRowsBySearch(withCancelled, searchQuery),
            statusMask,
          ),
          homeAwayFilter,
        ),
        competitionFilter,
      ),
      venueFilter,
    ),
    sort,
  );

  const resultateMatches = sortResultateMatches(
    filterResultateBySearch(viewModel.resultate, searchQuery),
    sort,
  );
  const resultateGroups = groupResultateByDay(resultateMatches, locale, timezone);

  const competitionOptions = deriveSpieleCompetitionOptions(viewModel.spielplanung);
  const venueOptions = deriveSpieleVenueOptions(viewModel.spielplanung);
  const statusCounts = countSpieleStatusBuckets(
    viewModel.spielplanung,
    cancelledRows.length,
  );

  const matchDayKeys = collectMatchDayKeys(
    [...viewModel.spielplanung, ...cancelledRows].map((row) => row.match.startAt),
    timezone,
  );

  const todayHref = currentMonthParam
    ? buildHref(basePath, {
        tab,
        month: currentMonthParam,
        actionFilter,
        wochenplanFilter,
        teamFilter,
        search: searchQuery,
        sort: sortParam,
        homeAwayFilter,
        listView,
        competitionFilter,
        venueFilter,
        statusMask,
      })
    : undefined;

  const wochenplanerHref = buildSpieleManagementWochenplanerHref({ timezone });
  const kalenderPlannerHref = buildSpieleManagementWochenplanerHref({
    timezone,
  });

  const navParams = {
    tab,
    month: monthWindow.param,
    actionFilter,
    wochenplanFilter,
    teamFilter,
    search: searchQuery,
    sort: sortParam,
    homeAwayFilter,
    listView,
    competitionFilter,
    venueFilter,
    statusMask,
  };

  const summaryMetrics =
    tab === "SPIELPLANUNG"
      ? [
          {
            key: "anstehend",
            label: "Anstehend",
            value: viewModel.kpis.anstehend,
            tone: "default" as const,
            "data-testid": "matchcenter-kpi-anstehend",
          },
          {
            key: "offen",
            label: "Offen",
            value: viewModel.kpis.offen,
            tone: "amber" as const,
            href: buildHref(basePath, {
              ...navParams,
              actionFilter: "OFFEN",
              statusMask: ["offen"],
            }),
            active: actionFilter === "OFFEN",
            "data-testid": "matchcenter-kpi-offen",
          },
          {
            key: "bereit",
            label: "Bereit",
            value: viewModel.kpis.bereit,
            tone: "emerald" as const,
            href: buildHref(basePath, {
              ...navParams,
              actionFilter: "ERLEDIGT",
              statusMask: ["bereit"],
            }),
            active: actionFilter === "ERLEDIGT",
            "data-testid": "matchcenter-kpi-bereit",
          },
          {
            key: "resultate",
            label: "Resultate",
            value: viewModel.kpis.resultate,
            tone: "muted" as const,
            href: buildHref(basePath, { ...navParams, tab: "RESULTATE" }),
            "data-testid": "matchcenter-kpi-resultate",
          },
        ]
      : [
          {
            key: "anstehend",
            label: "Anstehend",
            value: viewModel.kpis.anstehend,
            tone: "muted" as const,
            href: buildHref(basePath, { ...navParams, tab: "SPIELPLANUNG" }),
            "data-testid": "matchcenter-kpi-anstehend",
          },
          {
            key: "resultate",
            label: "Resultate",
            value: viewModel.kpis.resultate,
            tone: "default" as const,
            "data-testid": "matchcenter-kpi-resultate",
          },
        ];

  const filteredEmpty =
    (tab === "SPIELPLANUNG" && spielplanungRows.length === 0) ||
    (tab === "RESULTATE" && resultateMatches.length === 0);
  const hasSearch = Boolean(searchQuery.trim());

  const resetHref = buildHref(basePath, {
    tab,
    month: monthWindow.param,
    actionFilter: "ALLE",
    wochenplanFilter: "ALLE",
    teamFilter: null,
    search: "",
    sort: null,
    homeAwayFilter: "ALLE",
    listView: "LISTE",
    competitionFilter: null,
    venueFilter: null,
    statusMask: ["anstehend", "offen", "bereit"],
  });

  const listeHref = buildHref(basePath, { ...navParams, listView: "LISTE" });
  const kompaktHref = buildHref(basePath, { ...navParams, listView: "KOMPAKT" });
  const kalenderHref = buildHref(basePath, { ...navParams, listView: "KALENDER" });

  return (
    <div className="w-full space-y-4" data-testid="spiele-management-workspace">
      <header className="space-y-3 border-b border-[var(--border)] pb-4">
        <p className="text-xs text-[var(--muted)]">
          <span>Planung</span>
          <span className="mx-1.5 text-[var(--border-strong)]">›</span>
          <span className="text-[var(--text-2)]">Spiele</span>
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="text-[1.625rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
              Spiele
            </h1>
            <p className="text-sm text-[var(--text-2)]" data-testid="spiele-header-subtitle">
              Zentrale Spielplanung und operative Matchvorbereitung.
            </p>
          </div>
          <SpieleManagementHeaderMenu
            canManage={canManage}
            wochenplanerHref={wochenplanerHref}
          />
        </div>
      </header>

      <nav aria-label="Spiele-Bereiche" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[var(--border)]/70">
        {DOMAIN_TABS.map((item) => {
          const isResultate = item.key === "resultate";
          const isSpielplanung = item.key === "spielplanung";
          const isActive =
            (isSpielplanung && tab === "SPIELPLANUNG") ||
            (isResultate && tab === "RESULTATE");

          if (item.disabled) {
            return (
              <span
                key={item.key}
                className="cursor-not-allowed border-b-2 border-transparent pb-2.5 text-sm font-medium text-[var(--muted)]/60"
                aria-disabled="true"
                data-testid={`spiele-domain-tab-${item.key}`}
              >
                {item.label}
              </span>
            );
          }

          const href = buildHref(basePath, {
            ...navParams,
            tab: isResultate ? "RESULTATE" : "SPIELPLANUNG",
          });

          return (
            <Link
              key={item.key}
              href={href}
              data-testid={`matchcenter-tab-${item.key}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-[var(--sce-primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text-2)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <SpieleManagementKpiCards metrics={summaryMetrics} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CenterPeriodNavigation
              label={monthWindow.label}
              previousHref={buildHref(basePath, {
                ...navParams,
                month: monthWindow.previousParam,
              })}
              nextHref={buildHref(basePath, {
                ...navParams,
                month: monthWindow.nextParam,
              })}
              todayHref={todayHref}
              data-testid-label="matchcenter-month-label"
              data-testid-previous="matchcenter-month-previous"
              data-testid-next="matchcenter-month-next"
            />
            <SpieleManagementViewSwitcher
              listView={listView}
              listeHref={listeHref}
              kompaktHref={kompaktHref}
              kalenderHref={kalenderHref}
            />
          </div>

          <SpieleManagementToolbar
            teamOptions={teamOptions}
            teamFilter={teamFilter}
            basePath={basePath}
            tab={tab}
            month={monthWindow.param}
            actionFilter={actionFilter}
            wochenplanFilter={wochenplanFilter}
            searchValue={searchQuery}
            sortValue={sortParam ?? undefined}
            homeAwayFilter={homeAwayFilter}
            listView={listView}
            competitionFilter={competitionFilter}
            venueFilter={venueFilter}
            statusMask={statusMask}
            competitionOptions={competitionOptions}
            venueOptions={venueOptions}
          />

          <MatchcenterReconciliationPanel
            rows={viewModel.needsReconciliation}
            locale={locale}
            timezone={timezone}
          />

          {tab === "SPIELPLANUNG" && listView === "KALENDER" ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-8 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">Kalenderansicht</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Die Spielkalender-Ansicht im Wochenplaner bündelt Ressourcen und Termine.
              </p>
              <Link href={kalenderPlannerHref} className="fca-button-primary mt-4 inline-flex text-sm">
                Im Wochenplaner öffnen
              </Link>
            </div>
          ) : tab === "SPIELPLANUNG" ? (
            filteredEmpty ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-10 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">Keine Spiele gefunden</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {hasSearch
                    ? "Passe Suche oder Filter an."
                    : "Für den ausgewählten Monat gibt es keine anstehenden Spiele."}
                </p>
              </div>
            ) : (
              <SpieleManagementUpcomingList
                rows={spielplanungRows}
                locale={locale}
                timezone={timezone}
                tenantLogoUrl={tenantLogoUrl}
                canManage={canManage}
                compact={listView === "KOMPAKT"}
              />
            )
          ) : filteredEmpty ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">Keine Resultate vorhanden</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {hasSearch
                  ? "Passe Suche oder Filter an."
                  : "Für den ausgewählten Monat wurden noch keine Spiele abgeschlossen."}
              </p>
            </div>
          ) : (
            <div
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/70"
              data-testid="matchcenter-resultate-list"
            >
              <div className={RESULT_LIST_HEADER}>
                <span>Datum</span>
                <span>Spiel</span>
                <span>Ort</span>
                <span>Status</span>
                <span className="sr-only">Aktionen</span>
              </div>
              {resultateGroups.map((group) => (
                <div key={group.dayKey}>
                  <div className="border-b border-[var(--border)]/50 bg-[var(--surface-2)]/20 px-4 py-2">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      {group.label}
                    </p>
                  </div>
                  {group.rows.map((match) => (
                    <SpieleManagementResultRow
                      key={match.id}
                      match={match}
                      locale={locale}
                      timezone={timezone}
                      tenantLogoUrl={tenantLogoUrl}
                      canManage={canManage}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-3 xl:sticky xl:top-4 xl:self-start">
          <SpieleManagementMonthCalendar
            monthParam={monthWindow.param}
            timezone={timezone}
            matchDayKeys={matchDayKeys}
            previousMonthHref={buildHref(basePath, {
              ...navParams,
              month: monthWindow.previousParam,
            })}
            nextMonthHref={buildHref(basePath, {
              ...navParams,
              month: monthWindow.nextParam,
            })}
            dayHref={() => "#"}
          />
          <SpieleManagementSchnellfilter
            homeAwayFilter={homeAwayFilter}
            statusMask={statusMask}
            statusCounts={statusCounts}
            alleHref={buildHref(basePath, { ...navParams, homeAwayFilter: "ALLE" })}
            heimHref={buildHref(basePath, { ...navParams, homeAwayFilter: "HOME" })}
            auswaertsHref={buildHref(basePath, { ...navParams, homeAwayFilter: "AWAY" })}
            toggleStatusHref={(key) =>
              buildHref(basePath, {
                ...navParams,
                statusMask: toggleStatusMask(statusMask, key),
                actionFilter: "ALLE",
              })
            }
            resetHref={resetHref}
            teamOptionsCount={teamOptions.length}
            competitionOptionsCount={competitionOptions.length}
            venueOptionsCount={venueOptions.length}
          />
        </aside>
      </div>
    </div>
  );
}
