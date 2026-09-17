import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Suspense } from "react";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import {
  buildMatchcenterViewModel,
  type MatchcenterActionFilter,
  type MatchcenterTab,
  type MatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import {
  buildMatchcenterHref,
  type MatchcenterTeamOption,
} from "@/lib/matchcenter/navigation";
import {
  filterResultateBySearch,
  filterSpielplanungRowsBySearch,
  groupResultateByDay,
  parseSpieleManagementSort,
  sortResultateMatches,
  sortSpielplanungRows,
} from "@/lib/matchcenter/management-view";
import { buildSpieleManagementWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { CenterPeriodNavigation } from "@/components/centers/CenterPeriodNavigation";
import MatchcenterReconciliationPanel from "./MatchcenterReconciliationPanel";
import SpieleManagementToolbar from "./SpieleManagementToolbar";
import SpieleManagementSortControl from "./SpieleManagementSortControl";
import SpieleManagementStatusStrip from "./SpieleManagementStatusStrip";
import SpieleManagementUpcomingList from "./SpieleManagementUpcomingList";
import SpieleManagementResultRow from "./SpieleManagementResultRow";
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
};

const TABS: { key: MatchcenterTab; label: string }[] = [
  { key: "SPIELPLANUNG", label: "Anstehend" },
  { key: "RESULTATE", label: "Resultate" },
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
  },
): string {
  return buildMatchcenterHref(basePath, params);
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
}: Props) {
  const viewModel = buildMatchcenterViewModel(matches, {
    actionFilter,
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

  const spielplanungRows = sortSpielplanungRows(
    filterSpielplanungRowsBySearch(viewModel.spielplanung, searchQuery),
    sort,
  );
  const resultateMatches = sortResultateMatches(
    filterResultateBySearch(viewModel.resultate, searchQuery),
    sort,
  );
  const resultateGroups = groupResultateByDay(resultateMatches, locale, timezone);

  const todayHref = currentMonthParam
    ? buildHref(basePath, {
        tab,
        month: currentMonthParam,
        actionFilter,
        wochenplanFilter,
        teamFilter,
        search: searchQuery,
        sort: sortParam,
      })
    : undefined;

  const wochenplanerHref = buildSpieleManagementWochenplanerHref({ timezone });

  const navParams = {
    tab,
    month: monthWindow.param,
    actionFilter,
    wochenplanFilter,
    teamFilter,
    search: searchQuery,
    sort: sortParam,
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
            href: buildHref(basePath, { ...navParams, actionFilter: "OFFEN" }),
            active: actionFilter === "OFFEN",
            "data-testid": "matchcenter-kpi-offen",
          },
          {
            key: "bereit",
            label: "Bereit",
            value: viewModel.kpis.bereit,
            tone: "emerald" as const,
            href: buildHref(basePath, { ...navParams, actionFilter: "ERLEDIGT" }),
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

  return (
    <div className="w-full space-y-5" data-testid="spiele-management-workspace">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium tracking-wide text-[var(--muted)]">Planung</p>
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            Spiele
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            Spiele verwalten, vorbereiten und im Wochenplaner koordinieren.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={wochenplanerHref}
            className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
            data-testid="spiele-open-wochenplaner"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Wochenplaner öffnen
          </Link>
          {canManage ? (
            <Link
              href="/dashboard/matchcenter/new"
              className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
              data-testid="spiele-create-link"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Spiel
            </Link>
          ) : null}
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Spiele-Bereiche"
        className="inline-flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5"
      >
        {TABS.map((item) => {
          const isActive = item.key === tab;
          return (
            <Link
              key={item.key}
              href={buildHref(basePath, { ...navParams, tab: item.key })}
              role="tab"
              aria-selected={isActive}
              data-testid={`matchcenter-tab-${item.key.toLowerCase()}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[var(--foreground)] text-white"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

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

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
        />
        <Suspense fallback={null}>
          <SpieleManagementSortControl value={sort} tab={tab} />
        </Suspense>
      </div>

      <SpieleManagementStatusStrip metrics={summaryMetrics} />

      <MatchcenterReconciliationPanel
        rows={viewModel.needsReconciliation}
        locale={locale}
        timezone={timezone}
      />

      {tab === "SPIELPLANUNG" ? (
        filteredEmpty ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-10 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">Keine Spiele gefunden</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {hasSearch
                ? "Passe Suche oder Filter an."
                : "Für den ausgewählten Monat gibt es keine anstehenden Spiele."}
            </p>
            {canManage && !hasSearch ? (
              <Link
                href="/dashboard/matchcenter/new"
                className="fca-button-primary mt-4 inline-flex items-center gap-1.5 text-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Spiel
              </Link>
            ) : null}
          </div>
        ) : (
          <SpieleManagementUpcomingList
            rows={spielplanungRows}
            locale={locale}
            timezone={timezone}
            tenantLogoUrl={tenantLogoUrl}
            canManage={canManage}
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
  );
}
