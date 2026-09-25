import Link from "next/link";
import { Archive, CalendarClock, CheckCircle2, Plus } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import PlanningManagementKpiCards from "@/components/admin/planning/PlanningManagementKpiCards";
import {
  PLANNING_WORKSPACE_MAIN_RAIL_GRID,
  PLANNING_WORKSPACE_RAIL_ASIDE,
  PLANNING_WORKSPACE_RAIL_STACK,
} from "@/components/admin/planning/planning-management-layout";
import TrainingManagementToolbar from "./TrainingManagementToolbar";
import TrainingManagementSortControl from "./TrainingManagementSortControl";
import TrainingManagementPagination from "./TrainingManagementPagination";
import TrainingSeriesManagementRow from "./TrainingSeriesManagementRow";
import TrainingManagementFilterRail from "./TrainingManagementFilterRail";
import TrainingManagementQuickAccess from "./TrainingManagementQuickAccess";
import type { TrainingSeriesManagementRow as SeriesRow } from "@/lib/training/management-series-view";
import type { TrainingSeriesManagementSort } from "@/lib/training/management-series-view";
import { buildTrainingManagementPaginationNavigation } from "@/lib/training/management-pagination";
import { buildTrainingSeriesWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";

type TeamOption = { id: string; label: string };

type PaginationMeta = {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
};

type TrainingKpis = {
  active: number;
  inactive: number;
  archived: number;
  total: number;
};

type Props = {
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
  isCoordinator: boolean;
  locale: string;
  timezone: string;
  wochenplanerHref: string;
  seriesRows: SeriesRow[];
  teamOptions: TeamOption[];
  pagination: PaginationMeta;
  sort: TrainingSeriesManagementSort;
  kpis: TrainingKpis;
  filters: {
    seriesSearch?: string;
    seriesTeam?: string;
    seriesStatus?: string;
    archived?: boolean;
  };
  archivedCount: number;
  teamHrefByValue: Record<string, string>;
  statusHrefByValue: Record<string, string>;
  resetFiltersHref: string;
};

const LIST_HEADER =
  "hidden md:grid md:grid-cols-[minmax(0,1.85fr)_minmax(7.5rem,0.9fr)_minmax(7.75rem,0.85fr)_minmax(0,1.15fr)_minmax(5.75rem,0.75fr)_3rem] md:gap-x-4 border-b border-[var(--border)]/60 bg-[color-mix(in_srgb,var(--sce-surface-dense)_92%,var(--surface-2)_8%)] px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";

function hasActiveFilters(filters: Props["filters"]): boolean {
  return Boolean(filters.seriesSearch?.trim() || filters.seriesTeam || filters.seriesStatus);
}

export default function TrainingManagementWorkspace({
  canCreate,
  canManage,
  canDelete,
  isCoordinator: _isCoordinator,
  locale: _locale,
  timezone,
  wochenplanerHref,
  seriesRows,
  teamOptions,
  pagination,
  sort,
  kpis,
  filters,
  archivedCount,
  teamHrefByValue,
  statusHrefByValue,
  resetFiltersHref,
}: Props) {
  void _isCoordinator;
  void _locale;

  const archiveToggleHref = filters.archived ? "/dashboard/training" : "/dashboard/training?archived=1";
  const filteredEmpty = pagination.totalCount === 0 && hasActiveFilters(filters);
  const paginationNavigation = buildTrainingManagementPaginationNavigation(
    filters,
    sort,
    pagination.page,
    pagination.pageCount,
  );

  return (
    <div className="w-full space-y-4" data-testid="training-management-workspace">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Trainings"
        title="Trainings"
        subtitle="Trainings verwalten und im Wochenplaner koordinieren."
        subtitleTestId="training-header-subtitle"
        actions={
          <>
            {archivedCount > 0 ? (
              <Link
                href={archiveToggleHref}
                className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
                data-testid="training-archive-toggle"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                {filters.archived ? "Archiv ausblenden" : `Archiv (${archivedCount})`}
              </Link>
            ) : null}
            {canCreate ? (
              <Link
                href="/dashboard/training/new"
                className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
                data-testid="training-create-link"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Training erstellen
              </Link>
            ) : null}
          </>
        }
      />

      <PlanningManagementKpiCards
        testId="training-kpi-cards"
        metrics={[
          {
            key: "active",
            label: "Aktiv",
            value: kpis.active,
            hint: "laufende Serien",
            icon: CalendarClock,
            surface: "border-sky-500/25 bg-sky-950/40",
            iconTile: "bg-sky-500/15 text-sky-400",
            "data-testid": "training-kpi-active",
          },
          {
            key: "inactive",
            label: "Inaktiv",
            value: kpis.inactive,
            hint: "pausiert",
            icon: CheckCircle2,
            surface: "border-amber-500/25 bg-amber-950/30",
            iconTile: "bg-amber-500/15 text-amber-400",
            "data-testid": "training-kpi-inactive",
          },
          {
            key: "archived",
            label: "Archiv",
            value: kpis.archived,
            hint: "archivierte Serien",
            href: archiveToggleHref,
            active: Boolean(filters.archived),
            icon: Archive,
            surface: "border-[var(--border)] bg-[var(--surface)]/80",
            iconTile: "bg-[var(--surface-2)] text-[var(--muted)]",
            "data-testid": "training-kpi-archived",
          },
          {
            key: "total",
            label: "Total",
            value: kpis.total,
            hint: "Trainings im Tenant",
            icon: CheckCircle2,
            surface: "border-emerald-500/25 bg-emerald-950/35",
            iconTile: "bg-emerald-500/15 text-emerald-400",
            "data-testid": "training-kpi-total",
          },
        ]}
      />

      <div className={PLANNING_WORKSPACE_MAIN_RAIL_GRID}>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Suspense fallback={null}>
              <TrainingManagementToolbar
                searchValue={filters.seriesSearch}
                archived={filters.archived}
              />
            </Suspense>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <p className="text-sm text-[var(--text-2)]" data-testid="training-result-count">
                {pagination.totalCount} {pagination.totalCount === 1 ? "Training" : "Trainings"}
              </p>
              <Suspense fallback={null}>
                <TrainingManagementSortControl value={sort} archived={filters.archived} />
              </Suspense>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-xl border border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)]"
            data-testid="training-list"
          >
            <div className={LIST_HEADER}>
              <span>Training</span>
              <span>Trainingstage</span>
              <span>Zeit</span>
              <span>Anlage</span>
              <span>Status</span>
              <span className="sr-only">Aktionen</span>
            </div>

            {seriesRows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                {filteredEmpty ? (
                  <>
                    <p className="text-sm font-medium text-[var(--foreground)]">Keine Trainings gefunden</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Passe Suche oder Filter an.</p>
                    <Link href={resetFiltersHref} className="mt-3 inline-block text-sm text-[var(--sce-primary)] hover:underline">
                      Filter zurücksetzen
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[var(--foreground)]">Noch keine Trainings</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Erstelle das erste Training oder plane es direkt im Wochenplaner.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {seriesRows.map((row) => (
                  <TrainingSeriesManagementRow
                    key={row.teamSeasonId}
                    row={row}
                    wochenplanerHref={buildTrainingSeriesWochenplanerHref({
                      teamSeasonId: row.teamSeasonId,
                      timezone,
                    })}
                    canManage={canManage}
                    canDelete={canDelete}
                  />
                ))}
                <TrainingManagementPagination
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  rangeStart={pagination.rangeStart}
                  rangeEnd={pagination.rangeEnd}
                  totalCount={pagination.totalCount}
                  navigation={paginationNavigation}
                />
              </>
            )}
          </div>
        </div>

        <aside
          className={cn(PLANNING_WORKSPACE_RAIL_ASIDE, PLANNING_WORKSPACE_RAIL_STACK)}
          data-testid="training-management-rail"
        >
          <TrainingManagementQuickAccess canCreate={canCreate} wochenplanerHref={wochenplanerHref} />
          <TrainingManagementFilterRail
            resetHref={resetFiltersHref}
            teamValue={filters.seriesTeam}
            statusValue={filters.seriesStatus}
            teamOptions={teamOptions}
            teamHrefByValue={teamHrefByValue}
            statusHrefByValue={statusHrefByValue}
          />
        </aside>
      </div>
    </div>
  );
}
