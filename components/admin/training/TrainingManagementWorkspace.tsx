import Link from "next/link";
import { Archive } from "lucide-react";
import TrainingCreateMenu from "./TrainingCreateMenu";
import TrainingManagementFilters from "./TrainingManagementFilters";
import TrainingSeriesManagementRow from "./TrainingSeriesManagementRow";
import TrainingSessionManagementRow from "./TrainingSessionManagementRow";
import type { TrainingSeriesManagementRow as SeriesRow } from "@/lib/training/management-series-view";
import type { TrainingSessionManagementRow as SessionRow } from "@/lib/training/management-session-view";
import { buildTrainingSeriesWochenplanerHref, buildTrainingSessionWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";

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
  sessionRows: SessionRow[];
  sessionHasMore: boolean;
  sessionsNextPage: number | null;
  teamOptions: TeamOption[];
  filters: {
    seriesSearch?: string;
    seriesTeam?: string;
    seriesStatus?: string;
    sessionSearch?: string;
    sessionTeam?: string;
    sessionStatus?: string;
    archived?: boolean;
    sessionsPage: number;
  };
  archivedCount: number;
  sessionWindowLabel: string;
};

const SERIES_HEADER =
  "hidden md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_minmax(5.5rem,0.75fr)_minmax(0,1fr)_4.5rem_2.5rem] md:gap-x-3 px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]";

const SESSION_HEADER =
  "hidden md:grid md:grid-cols-[minmax(4.5rem,0.55fr)_minmax(0,1.25fr)_minmax(5.5rem,0.7fr)_minmax(0,1fr)_5rem_2.5rem] md:gap-x-3 px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]";

export default function TrainingManagementWorkspace({
  canCreate,
  canManage,
  canDelete,
  isCoordinator,
  locale,
  timezone,
  wochenplanerHref,
  seriesRows,
  sessionRows,
  sessionHasMore,
  sessionsNextPage,
  teamOptions,
  filters,
  archivedCount,
  sessionWindowLabel,
}: Props) {
  const archiveToggleHref = filters.archived
    ? "/dashboard/training"
    : "/dashboard/training?archived=1";

  const loadMoreQuery = new URLSearchParams();
  if (filters.seriesSearch) loadMoreQuery.set("seriesSearch", filters.seriesSearch);
  if (filters.seriesTeam) loadMoreQuery.set("seriesTeam", filters.seriesTeam);
  if (filters.seriesStatus) loadMoreQuery.set("seriesStatus", filters.seriesStatus);
  if (filters.sessionSearch) loadMoreQuery.set("sessionSearch", filters.sessionSearch);
  if (filters.sessionTeam) loadMoreQuery.set("sessionTeam", filters.sessionTeam);
  if (filters.sessionStatus) loadMoreQuery.set("sessionStatus", filters.sessionStatus);
  if (filters.archived) loadMoreQuery.set("archived", "1");
  if (sessionsNextPage) loadMoreQuery.set("sessionsPage", String(sessionsNextPage));
  const loadMoreHref = `/dashboard/training?${loadMoreQuery.toString()}`;

  return (
    <div className="space-y-8" data-testid="training-management-workspace">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Planung</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Trainings</h1>
          <p className="text-sm text-[var(--text-2)]">Trainingsserien und einzelne Termine verwalten</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={wochenplanerHref} className="fca-button-secondary text-sm" data-testid="training-open-wochenplaner">
            Wochenplaner öffnen
          </Link>
          <TrainingCreateMenu canCreate={canCreate} />
        </div>
      </header>

      <section className="space-y-3" data-testid="training-series-section">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Serien</h2>
            <p className="text-xs text-[var(--muted)]">Wiederkehrende Trainingsdefinitionen</p>
          </div>
          {archivedCount > 0 ? (
            <Link href={archiveToggleHref} className="fca-button-secondary inline-flex items-center gap-1.5 text-xs">
              <Archive className="h-3.5 w-3.5" />
              {filters.archived ? "Archiv ausblenden" : `Archiv (${archivedCount})`}
            </Link>
          ) : null}
        </div>

        <TrainingManagementFilters
          formId="series"
          searchName="seriesSearch"
          searchValue={filters.seriesSearch}
          teamName="seriesTeam"
          teamValue={filters.seriesTeam}
          statusName="seriesStatus"
          statusValue={filters.seriesStatus ?? ""}
          teamOptions={teamOptions}
          statusOptions={[
            { value: "", label: "Aktiv (Standard)" },
            { value: "ALL", label: "Alle Status" },
            { value: "ACTIVE", label: "Aktiv" },
            { value: "INACTIVE", label: "Inaktiv" },
            { value: "ARCHIVED", label: "Archiviert" },
          ]}
          hiddenFields={{
            sessionSearch: filters.sessionSearch,
            sessionTeam: filters.sessionTeam,
            sessionStatus: filters.sessionStatus,
            archived: filters.archived ? "1" : undefined,
          }}
        />

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className={SERIES_HEADER}>
            <span>Training / Team</span>
            <span>Rhythmus</span>
            <span>Zeit</span>
            <span>Anlage</span>
            <span>Status</span>
            <span className="sr-only">Aktionen</span>
          </div>
          {seriesRows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">Keine Trainingsserien gefunden.</p>
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
                isCoordinator={isCoordinator}
              />
            ))
          )}
        </div>
      </section>

      <section className="space-y-3" data-testid="training-sessions-section">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Einzeltrainings</h2>
          <p className="text-xs text-[var(--muted)]">
            Konkrete Termine im Fenster {sessionWindowLabel} — kein Kalender, nur Verwaltung.
          </p>
        </div>

        <TrainingManagementFilters
          formId="sessions"
          searchName="sessionSearch"
          searchValue={filters.sessionSearch}
          teamName="sessionTeam"
          teamValue={filters.sessionTeam}
          statusName="sessionStatus"
          statusValue={filters.sessionStatus ?? ""}
          teamOptions={teamOptions}
          statusOptions={[
            { value: "", label: "Alle" },
            { value: "GEPLANT", label: "Geplant" },
            { value: "AUSNAHME", label: "Ausnahme" },
            { value: "ABGESAGT", label: "Abgesagt" },
          ]}
          hiddenFields={{
            seriesSearch: filters.seriesSearch,
            seriesTeam: filters.seriesTeam,
            seriesStatus: filters.seriesStatus,
            archived: filters.archived ? "1" : undefined,
          }}
        />

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className={SESSION_HEADER}>
            <span>Datum</span>
            <span>Training / Team</span>
            <span>Zeit</span>
            <span>Anlage</span>
            <span>Status</span>
            <span className="sr-only">Aktionen</span>
          </div>
          {sessionRows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">Keine Termine im gewählten Fenster.</p>
          ) : (
            sessionRows.map((row) => (
              <TrainingSessionManagementRow
                key={row.sessionId}
                row={row}
                wochenplanerHref={buildTrainingSessionWochenplanerHref({
                  sessionDate: row.date,
                  teamSeasonId: row.teamSeasonId,
                  timezone,
                })}
                canManage={canManage}
                locale={locale}
                timezone={timezone}
              />
            ))
          )}
        </div>

        {sessionHasMore ? (
          <div className="flex justify-center">
            <Link href={loadMoreHref} className="fca-button-secondary text-sm" data-testid="training-sessions-load-more">
              Weitere Termine laden
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
