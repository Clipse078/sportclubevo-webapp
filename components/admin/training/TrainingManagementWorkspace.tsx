import Link from "next/link";
import { Archive, CalendarDays, Plus } from "lucide-react";
import { Suspense } from "react";
import TrainingManagementToolbar from "./TrainingManagementToolbar";
import TrainingManagementSortControl from "./TrainingManagementSortControl";
import TrainingManagementPagination from "./TrainingManagementPagination";
import TrainingSeriesManagementRow from "./TrainingSeriesManagementRow";
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
  filters: {
    seriesSearch?: string;
    seriesTeam?: string;
    seriesStatus?: string;
    archived?: boolean;
  };
  archivedCount: number;
};

const LIST_HEADER =
  "hidden md:grid md:grid-cols-[minmax(0,1.85fr)_minmax(7.5rem,0.9fr)_minmax(7.75rem,0.85fr)_minmax(0,1.15fr)_minmax(5.75rem,0.75fr)_3rem] md:gap-x-4 border-b border-[var(--border)]/60 bg-[var(--surface-2)]/25 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";

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
  filters,
  archivedCount,
}: Props) {
  void _isCoordinator;
  void _locale;

  const archiveToggleHref = filters.archived ? "/dashboard/training" : "/dashboard/training?archived=1";
  const filteredEmpty = pagination.totalCount === 0 && hasActiveFilters(filters);
  const resetFiltersHref = filters.archived ? "/dashboard/training?archived=1" : "/dashboard/training";
  const paginationNavigation = buildTrainingManagementPaginationNavigation(
    filters,
    sort,
    pagination.page,
    pagination.pageCount,
  );

  return (
    <div className="space-y-5" data-testid="training-management-workspace">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            Trainings
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            Trainings verwalten und im Wochenplaner koordinieren.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={wochenplanerHref}
            className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
            data-testid="training-open-wochenplaner"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Wochenplaner öffnen
          </Link>
          {canCreate ? (
            <Link
              href="/dashboard/training/new"
              className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
              data-testid="training-create-link"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Training
            </Link>
          ) : null}
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Suspense fallback={null}>
            <TrainingManagementToolbar
              teamOptions={teamOptions}
              searchValue={filters.seriesSearch}
              teamValue={filters.seriesTeam}
              statusValue={filters.seriesStatus}
              archived={filters.archived}
            />
          </Suspense>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <p className="text-sm text-[var(--text-2)]" data-testid="training-result-count">
              {pagination.totalCount} {pagination.totalCount === 1 ? "Training" : "Trainings"}
            </p>
            <Suspense fallback={null}>
              <TrainingManagementSortControl value={sort} archived={filters.archived} />
            </Suspense>
            {archivedCount > 0 ? (
              <Link
                href={archiveToggleHref}
                className="fca-button-secondary inline-flex items-center gap-1.5 text-xs"
                data-testid="training-archive-toggle"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                {filters.archived ? "Archiv ausblenden" : `Archiv (${archivedCount})`}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/70"
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
                <Link href={resetFiltersHref} className="mt-3 inline-block text-sm text-[var(--blue)] hover:underline">
                  Filter zurücksetzen
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--foreground)]">Noch keine Trainings</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Erstelle das erste Training oder plane es direkt im Wochenplaner.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {canCreate ? (
                    <Link
                      href="/dashboard/training/new"
                      className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Training
                    </Link>
                  ) : null}
                  <Link href={wochenplanerHref} className="fca-button-secondary text-sm">
                    Wochenplaner öffnen
                  </Link>
                </div>
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
  );
}
