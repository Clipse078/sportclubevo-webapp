import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { Suspense } from "react";
import TrainingManagementToolbar from "./TrainingManagementToolbar";
import TrainingSeriesManagementRow from "./TrainingSeriesManagementRow";
import type { TrainingSeriesManagementRow as SeriesRow } from "@/lib/training/management-series-view";
import { buildTrainingSeriesWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";

type TeamOption = { id: string; label: string };

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
  filters: {
    seriesSearch?: string;
    seriesTeam?: string;
    seriesStatus?: string;
    archived?: boolean;
  };
  archivedCount: number;
};

const LIST_HEADER =
  "hidden md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(6rem,0.75fr)_minmax(7rem,0.85fr)_minmax(0,1fr)_5.5rem_2.75rem] md:gap-x-4 px-4 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]";

function hasActiveFilters(filters: Props["filters"]): boolean {
  return Boolean(filters.seriesSearch?.trim() || filters.seriesTeam || filters.seriesStatus);
}

export default function TrainingManagementWorkspace({
  canCreate,
  canManage,
  canDelete,
  isCoordinator,
  locale: _locale,
  timezone,
  wochenplanerHref,
  seriesRows,
  teamOptions,
  filters,
  archivedCount,
}: Props) {
  void _locale;

  const archiveToggleHref = filters.archived ? "/dashboard/training" : "/dashboard/training?archived=1";
  const filteredEmpty = seriesRows.length === 0 && hasActiveFilters(filters);
  const resetFiltersHref = filters.archived ? "/dashboard/training?archived=1" : "/dashboard/training";

  return (
    <div className="space-y-5" data-testid="training-management-workspace">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Trainings</h1>
          <p className="text-sm text-[var(--text-2)]">
            Trainings verwalten und im Wochenplaner koordinieren
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={wochenplanerHref}
            className="fca-button-secondary text-sm"
            data-testid="training-open-wochenplaner"
          >
            Wochenplaner
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={null}>
          <TrainingManagementToolbar
            teamOptions={teamOptions}
            searchValue={filters.seriesSearch}
            teamValue={filters.seriesTeam}
            statusValue={filters.seriesStatus}
            archived={filters.archived}
          />
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

      <div
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/60"
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
                <Link href={resetFiltersHref} className="mt-3 inline-block text-sm text-[var(--blue)] hover:underline">
                  Filter zurücksetzen
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--foreground)]">Noch keine Trainings</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Erstelle das erste Training, um die Trainingsplanung zu beginnen.
                </p>
                {canCreate ? (
                  <Link
                    href="/dashboard/training/new"
                    className="fca-button-primary mt-4 inline-flex items-center gap-1.5 text-sm"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Training
                  </Link>
                ) : null}
              </>
            )}
          </div>
        ) : (
          seriesRows.map((row) => (
            <TrainingSeriesManagementRow
              key={row.seriesId}
              row={row}
              wochenplanerHref={buildTrainingSeriesWochenplanerHref({
                teamSeasonId: row.teamSeasonId,
                timezone,
              })}
              canManage={canManage}
              canDelete={canDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
