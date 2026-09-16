"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import type { TournamentDto, TournamentStatus } from "@/lib/tournaments/types";
import {
  buildTournamentCenterHref,
  buildTournamentCenterResetHref,
  hasActiveTournamentWorkspaceFilters,
  type TournamentTeamOption,
} from "@/lib/tournaments/navigation";
import {
  buildTournamentWorkspaceViewModel,
  type TournamentGroupMode,
  type TournamentSortMode,
  type TournamentTimeScope,
  type TournamentWorkspaceRow,
} from "@/lib/tournaments/workspace-view-model";
import { isTournamentInArchivList } from "@/lib/tournaments/operational-state";
import type { TournamentActionFilter } from "@/lib/tournaments/view-model";
import { formatMonthLabel, resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import {
  formatTournamentAgendaDateHeading,
  formatTournamentAgendaMonthHeading,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/tournaments/presentation";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import { CenterPeriodNavigation } from "@/components/centers/CenterPeriodNavigation";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import TournamentOperationalRow from "./TournamentOperationalRow";
import {
  TournamentCenterActiveFilterChips,
  TournamentCenterFilterSurface,
} from "./TournamentCenterFilterSurface";

const TIME_SCOPES: { key: TournamentTimeScope; label: string }[] = [
  { key: "UPCOMING", label: "Anstehend" },
  { key: "PAST", label: "Vergangen" },
  { key: "ALL", label: "Alle" },
];

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
  teamOptions: TournamentTeamOption[];
  tenantLogoUrl?: string | null;
  basePath?: string;
  timezone?: string;
  locale?: string;
  canCreate?: boolean;
};

function workspaceHref(
  basePath: string,
  state: {
    scope: TournamentTimeScope;
    search: string;
    teamFilter: string | null;
    monthParam: string | null;
    statusFilter: TournamentStatus | null;
    actionFilter: TournamentActionFilter;
    group: TournamentGroupMode;
    sort: TournamentSortMode;
  },
  overrides: Partial<{
    scope: TournamentTimeScope;
    search: string;
    teamFilter: string | null;
    month: string | null;
    statusFilter: TournamentStatus | null;
    actionFilter: TournamentActionFilter;
    group: TournamentGroupMode;
    sort: TournamentSortMode;
  }> = {},
) {
  return buildTournamentCenterHref(basePath, {
    scope: overrides.scope ?? state.scope,
    search: overrides.search ?? state.search,
    teamFilter: overrides.teamFilter !== undefined ? overrides.teamFilter : state.teamFilter,
    month: overrides.month !== undefined ? overrides.month : state.monthParam,
    statusFilter: overrides.statusFilter !== undefined ? overrides.statusFilter : state.statusFilter,
    actionFilter: overrides.actionFilter ?? state.actionFilter,
    group: overrides.group ?? state.group,
    sort: overrides.sort ?? state.sort,
  });
}

function TournamentGroupHeading({
  group,
  heading,
  groupKey,
  teamOptions,
  tenantLogoUrl = null,
  locale,
  timezone,
  count,
}: {
  group: TournamentGroupMode;
  heading: string;
  groupKey: string;
  teamOptions: TournamentTeamOption[];
  tenantLogoUrl?: string | null;
  locale: string;
  timezone: string;
  count: number;
}) {
  if (!heading) return null;

  let displayHeading = heading;
  if (group === "DATE") {
    displayHeading = formatTournamentAgendaDateHeading(groupKey, locale, timezone);
  } else if (group === "MONTH") {
    displayHeading = formatTournamentAgendaMonthHeading(groupKey, locale, timezone);
  }

  const teamOption = group === "TEAM" && groupKey !== "__none__"
    ? teamOptions.find((t) => t.id === groupKey)
    : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
      <div className="flex min-w-0 items-center gap-2">
        {teamOption ? (
          <ClubLogo
            logoUrl={tenantLogoUrl}
            name={teamOption.label}
            size="sm"
            bare
            className="h-6 w-6 shrink-0"
          />
        ) : null}
        <h2 className="truncate text-xs font-bold uppercase tracking-wide text-[var(--foreground)]">
          {displayHeading}
        </h2>
      </div>
      <span className="shrink-0 text-[0.65rem] font-medium tabular-nums text-[var(--muted)]">{count}</span>
    </div>
  );
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
    teamOptions,
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
      scope,
      search: initialSearch,
      teamFilter,
      monthParam,
      statusFilter,
      actionFilter,
      group,
      sort,
    }),
    [scope, initialSearch, teamFilter, monthParam, statusFilter, actionFilter, group, sort],
  );

  const buildHref = useCallback(
    (overrides: Parameters<typeof workspaceHref>[2]) =>
      workspaceHref(basePath, workspaceState, overrides),
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

  const viewModel = useMemo(
    () =>
      buildTournamentWorkspaceViewModel(tournaments, {
        scope: workspaceState.scope,
        search: workspaceState.search,
        teamFilter: workspaceState.teamFilter,
        monthParam: workspaceState.monthParam,
        statusFilter: workspaceState.statusFilter,
        actionFilter: workspaceState.actionFilter,
        group: workspaceState.group,
        sort: workspaceState.sort,
      }, { timeZone: timezone, locale }),
    [tournaments, workspaceState, timezone, locale],
  );

  const monthWindow = monthParam
    ? resolveMatchcenterMonthWindow({ monthParam, timeZone: timezone })
    : null;

  const currentMonthWindow = resolveMatchcenterMonthWindow({ timeZone: timezone });

  const filtersActive = hasActiveTournamentWorkspaceFilters({
    search: initialSearch,
    teamFilter,
    month: monthParam,
    statusFilter,
    actionFilter,
  });

  const compactDate = group === "DATE" || group === "MONTH";

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; href: string }[] = [];

    if (initialSearch.trim()) {
      chips.push({
        key: "q",
        label: `„${initialSearch.trim()}“`,
        href: buildHref({ search: "" }),
      });
    }

    if (teamFilter) {
      const label = teamOptions.find((t) => t.id === teamFilter)?.label ?? "Team";
      chips.push({
        key: "team",
        label,
        href: buildHref({ teamFilter: null }),
      });
    }

    if (monthParam && monthWindow) {
      chips.push({
        key: "month",
        label: formatMonthLabel(monthWindow, locale, timezone),
        href: buildHref({ month: null }),
      });
    }

    if (statusFilter) {
      chips.push({
        key: "status",
        label: TOURNAMENT_STATUS_LABELS[statusFilter] ?? statusFilter,
        href: buildHref({ statusFilter: null }),
      });
    }

    if (scope === "UPCOMING" && actionFilter !== "ALLE") {
      const readinessLabel =
        actionFilter === "OFFEN" ? "Offen" : actionFilter === "ERLEDIGT" ? "Erledigt" : actionFilter;
      chips.push({
        key: "readiness",
        label: readinessLabel,
        href: buildHref({ actionFilter: "ALLE" }),
      });
    }

    return chips;
  }, [
    initialSearch,
    teamFilter,
    monthParam,
    monthWindow,
    statusFilter,
    actionFilter,
    scope,
    teamOptions,
    buildHref,
    locale,
    timezone,
  ]);

  function rowVariant(row: TournamentWorkspaceRow): "past" | "upcoming" {
    if (scope === "PAST") return "past";
    if (scope === "UPCOMING") return "upcoming";
    return isTournamentInArchivList(row.tournament) ? "past" : "upcoming";
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div
        role="tablist"
        aria-label="Zeitraum"
        className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        data-testid="tournamentcenter-scope"
      >
        {TIME_SCOPES.map((item) => {
          const isActive = item.key === scope;
          return (
            <Link
              key={item.key}
              href={buildHref({ scope: item.key })}
              role="tab"
              aria-selected={isActive}
              data-testid={`tournamentcenter-scope-${item.key.toLowerCase()}`}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <CenterWorkspaceSearchInput
            value={searchDraft}
            onChange={pushSearch}
            placeholder="Turniere durchsuchen…"
            ariaLabel="Turniere durchsuchen"
            className="relative min-w-0 flex-1"
            data-testid="tournamentcenter-search"
          />

          <TournamentCenterFilterSurface
            scope={scope}
            teamFilter={teamFilter}
            monthParam={monthParam}
            statusFilter={statusFilter}
            actionFilter={actionFilter}
            group={group}
            sort={sort}
            teamOptions={teamOptions}
            buildHref={buildHref}
            timezone={timezone}
            locale={locale}
            filtersActive={filtersActive}
          />
        </div>

        {viewModel.totalMatching > 0 ? (
          <p className="text-[0.68rem] font-medium text-[var(--muted)]" data-testid="tournamentcenter-result-count">
            {viewModel.totalMatching}{" "}
            {viewModel.totalMatching === 1 ? "Turnier" : "Turniere"}
            {filtersActive ? " (gefiltert)" : ""}
          </p>
        ) : null}

        <TournamentCenterActiveFilterChips
          chips={activeFilterChips}
          resetHref={buildTournamentCenterResetHref(basePath, scope, group)}
        />

        {monthWindow ? (
          <CenterPeriodNavigation
            label={formatMonthLabel(monthWindow, locale, timezone)}
            previousHref={buildHref({ month: monthWindow.previousParam })}
            nextHref={buildHref({ month: monthWindow.nextParam })}
            todayHref={buildHref({ month: currentMonthWindow.param })}
            data-testid-label="tournamentcenter-month-label"
            data-testid-previous="tournamentcenter-month-previous"
            data-testid-next="tournamentcenter-month-next"
            data-testid-today="tournamentcenter-month-today"
          />
        ) : null}
      </div>

      {viewModel.emptyKind === "no_data" ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={<Trophy className="h-8 w-8" />}
            heading="Noch keine Turniere"
            description="Erstellen Sie das erste Turnier für Ihren Verein."
            action={
              canCreate ? (
                <Link href="/dashboard/tournamentcenter/new" className="fca-button-primary">
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
            description={
              scope === "UPCOMING"
                ? "Aktuell sind keine kommenden Turniere geplant. Wechseln Sie zu Vergangen oder Alle."
                : "Für diesen Zeitraum liegen keine Einträge vor."
            }
            action={
              scope === "UPCOMING" ? (
                <Link
                  href={buildTournamentCenterHref(basePath, { scope: "PAST", group })}
                  className="fca-button-secondary text-sm"
                >
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
            description="Passen Sie Suche oder Filter an — aktive Filter sind oben als Chips sichtbar."
            action={
              <Link
                href={buildTournamentCenterResetHref(basePath, scope, group)}
                className="fca-button-secondary text-sm"
                data-testid="tournamentcenter-empty-reset"
              >
                Alle Filter zurücksetzen
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-6" data-testid="tournamentcenter-list">
          {viewModel.groups.map((groupBlock) => (
            <section key={groupBlock.key} className="space-y-2">
              <TournamentGroupHeading
                group={group}
                heading={groupBlock.heading}
                groupKey={groupBlock.key}
                teamOptions={teamOptions}
                tenantLogoUrl={tenantLogoUrl}
                locale={locale}
                timezone={timezone}
                count={groupBlock.count}
              />
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {groupBlock.rows.map((row) => (
                  <TournamentOperationalRow
                    key={`${groupBlock.key}-${row.tournament.id}`}
                    tournament={row.tournament}
                    assessment={row.assessment}
                    locale={locale}
                    timezone={timezone}
                    compactDate={compactDate && Boolean(groupBlock.heading)}
                    variant={rowVariant(row)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
