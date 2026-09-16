"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trophy, X } from "lucide-react";
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
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import { SectionCard } from "@/components/ui/page/SectionCard";
import { CenterSummaryStrip } from "@/components/centers/CenterSummaryStrip";
import { CenterPeriodNavigation } from "@/components/centers/CenterPeriodNavigation";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import TournamentOperationalRow from "./TournamentOperationalRow";

const TIME_SCOPES: { key: TournamentTimeScope; label: string }[] = [
  { key: "UPCOMING", label: "Anstehend" },
  { key: "PAST", label: "Vergangen" },
  { key: "ALL", label: "Alle" },
];

const GROUP_OPTIONS: { key: TournamentGroupMode; label: string }[] = [
  { key: "DATE", label: "Datum" },
  { key: "MONTH", label: "Monat" },
  { key: "TEAM", label: "Team" },
  { key: "NONE", label: "Keine Gruppierung" },
];

const SORT_OPTIONS: { key: TournamentSortMode; label: string }[] = [
  { key: "DATE_ASC", label: "Datum aufsteigend" },
  { key: "DATE_DESC", label: "Datum absteigend" },
  { key: "TITLE", label: "Turniername" },
];

const READINESS_FILTERS: { key: TournamentActionFilter; label: string }[] = [
  { key: "ALLE", label: "Alle" },
  { key: "OFFEN", label: "Offen" },
  { key: "ERLEDIGT", label: "Erledigt" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Status" },
  { value: "DRAFT", label: "Entwurf" },
  { value: "SCHEDULED", label: "Geplant" },
  { value: "LIVE", label: "Live" },
  { value: "COMPLETED", label: "Abgeschlossen" },
  { value: "CANCELLED", label: "Storniert" },
  { value: "POSTPONED", label: "Verschoben" },
  { value: "ARCHIVED", label: "Archiviert" },
] as const;

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

function CompactSelect<T extends string>({
  label,
  value,
  options,
  hrefForValue,
  active,
  testId,
}: {
  label: string;
  value: T | "";
  options: { value: T | ""; label: string }[];
  hrefForValue: (value: T | "") => string;
  active?: boolean;
  testId?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const currentLabel = options.find((o) => o.value === value)?.label ?? label;

  function select(next: T | "") {
    setOpen(false);
    router.push(hrefForValue(next));
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) return;
    window.setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={containerRef} className="relative" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={handleBlur}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
          active || value
            ? "border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="max-w-[140px] truncate">{value ? currentLabel : label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              select("" as T | "");
            }}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-[var(--tenant-primary)]/20"
            aria-label={`${label} zurücksetzen`}
          >
            <X className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-[180px] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]"
        >
          {options.map((option) => (
            <button
              key={option.value || "__all__"}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(option.value)}
              className={cn(
                "flex w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]",
                option.value === value && "bg-[var(--surface-2)] font-semibold",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
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

  const summaryMetrics = [
    {
      key: "upcoming",
      label: "Anstehend",
      value: viewModel.summary.upcoming,
      tone: "default" as const,
      href: buildTournamentCenterHref(basePath, { scope: "UPCOMING", group }),
      active: scope === "UPCOMING",
      "data-testid": "tournamentcenter-kpi-anstehend",
    },
    {
      key: "this-month",
      label: "Diesen Monat",
      value: viewModel.summary.thisMonth,
      tone: "default" as const,
      href: buildTournamentCenterHref(basePath, {
        scope: "UPCOMING",
        month: currentMonthWindow.param,
        group,
      }),
      active: Boolean(monthParam === currentMonthWindow.param && scope === "UPCOMING"),
      "data-testid": "tournamentcenter-kpi-this-month",
    },
    {
      key: "teams",
      label: "Teams",
      value: viewModel.summary.teamsInvolved,
      tone: "muted" as const,
      "data-testid": "tournamentcenter-kpi-teams",
    },
    {
      key: "past",
      label: "Vergangen",
      value: viewModel.summary.past,
      tone: "muted" as const,
      href: buildTournamentCenterHref(basePath, { scope: "PAST", group }),
      active: scope === "PAST",
      "data-testid": "tournamentcenter-kpi-archiv",
    },
  ];

  const compactDate = group === "DATE" || group === "MONTH";

  function rowVariant(row: TournamentWorkspaceRow): "past" | "upcoming" {
    if (scope === "PAST") return "past";
    if (scope === "UPCOMING") return "upcoming";
    return isTournamentInArchivList(row.tournament) ? "past" : "upcoming";
  }

  return (
    <div className="space-y-4">
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

      <CenterSummaryStrip metrics={summaryMetrics} />

      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <CenterWorkspaceSearchInput
            value={searchDraft}
            onChange={pushSearch}
            placeholder="Turniere, Teams, Orte…"
            ariaLabel="Turniere durchsuchen"
            data-testid="tournamentcenter-search"
          />

          <div className="flex flex-wrap items-center gap-2">
            <CompactSelect
              label="Team"
              value={teamFilter ?? ""}
              options={[
                { value: "", label: "Alle Teams" },
                ...teamOptions.map((t) => ({ value: t.id, label: t.label })),
              ]}
              hrefForValue={(value) => buildHref({ teamFilter: value || null })}
              active={Boolean(teamFilter)}
              testId="tournamentcenter-filter-team"
            />

            <CompactSelect
              label="Status"
              value={statusFilter ?? ""}
              options={STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              hrefForValue={(value) =>
                buildHref({ statusFilter: value ? (value as TournamentStatus) : null })
              }
              active={Boolean(statusFilter)}
              testId="tournamentcenter-filter-status"
            />

            <CompactSelect
              label="Gruppieren nach"
              value={group}
              options={GROUP_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              hrefForValue={(value) => buildHref({ group: (value || "DATE") as TournamentGroupMode })}
              testId="tournamentcenter-group"
            />

            <CompactSelect
              label="Sortierung"
              value={sort}
              options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              hrefForValue={(value) => buildHref({ sort: (value || "DATE_ASC") as TournamentSortMode })}
              testId="tournamentcenter-sort"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
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
          ) : (
            <CompactSelect
              label="Monat"
              value=""
              options={[
                { value: "", label: "Alle Monate" },
                {
                  value: currentMonthWindow.param,
                  label: formatMonthLabel(currentMonthWindow, locale, timezone),
                },
              ]}
              hrefForValue={(value) => buildHref({ month: value || null })}
              testId="tournamentcenter-filter-month"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {scope === "UPCOMING" ? (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Vorbereitungsfilter">
                {READINESS_FILTERS.map((item) => {
                  const isActive = item.key === actionFilter;
                  return (
                    <Link
                      key={item.key}
                      href={buildHref({ actionFilter: item.key })}
                      data-testid={`tournamentcenter-filter-${item.key.toLowerCase()}`}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[0.68rem] font-semibold transition",
                        isActive
                          ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {filtersActive ? (
              <Link
                href={buildTournamentCenterResetHref(basePath, scope, group)}
                className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                data-testid="tournamentcenter-reset-filters"
              >
                Filter zurücksetzen
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {viewModel.emptyKind === "no_data" ? (
        <SectionCard noPadding>
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
        </SectionCard>
      ) : viewModel.emptyKind === "no_scope" ? (
        <SectionCard noPadding>
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
        </SectionCard>
      ) : viewModel.emptyKind === "filtered" ? (
        <SectionCard noPadding>
          <EmptyState
            icon={<Trophy className="h-8 w-8" />}
            heading="Keine Turniere entsprechen den ausgewählten Filtern"
            description="Passen Sie Suche oder Filter an, um mehr Ergebnisse zu sehen."
            action={
              <Link
                href={buildTournamentCenterResetHref(basePath, scope, group)}
                className="fca-button-secondary text-sm"
                data-testid="tournamentcenter-empty-reset"
              >
                Filter zurücksetzen
              </Link>
            }
          />
        </SectionCard>
      ) : (
        <div className="space-y-4" data-testid="tournamentcenter-list">
          {viewModel.groups.map((groupBlock) =>
            groupBlock.heading ? (
              <SectionCard key={groupBlock.key} noPadding>
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)]">
                    {groupBlock.heading}
                  </h2>
                  <span className="text-[0.65rem] font-medium tabular-nums text-[var(--muted)]">
                    {groupBlock.count}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {groupBlock.rows.map((row) => (
                    <TournamentOperationalRow
                      key={`${groupBlock.key}-${row.tournament.id}`}
                      tournament={row.tournament}
                      assessment={row.assessment}
                      locale={locale}
                      timezone={timezone}
                      compactDate={compactDate}
                      variant={rowVariant(row)}
                    />
                  ))}
                </div>
              </SectionCard>
            ) : (
              <SectionCard key={groupBlock.key} noPadding>
                <div className="divide-y divide-[var(--border)]">
                  {groupBlock.rows.map((row) => (
                    <TournamentOperationalRow
                      key={row.tournament.id}
                      tournament={row.tournament}
                      assessment={row.assessment}
                      locale={locale}
                      timezone={timezone}
                      compactDate={false}
                      variant={rowVariant(row)}
                    />
                  ))}
                </div>
              </SectionCard>
            ),
          )}
        </div>
      )}
    </div>
  );
}
