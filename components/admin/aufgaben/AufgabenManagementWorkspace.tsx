import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle, CalendarClock, ListChecks, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import PlanningManagementKpiCards from "@/components/admin/planning/PlanningManagementKpiCards";
import {
  PLANNING_WORKSPACE_MAIN_RAIL_GRID,
  PLANNING_WORKSPACE_RAIL_ASIDE,
  PLANNING_WORKSPACE_RAIL_STACK,
} from "@/components/admin/planning/planning-management-layout";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type {
  TaskManagementListItem,
  TaskManagementSummary,
  TaskSeriesManagementRow,
} from "@/lib/tasks/management-service";
import { TASK_MANAGEMENT_PAGE_SIZE } from "@/lib/tasks/management-service";
import {
  buildTaskManagementPaginationNavigation,
  computeTaskManagementRange,
} from "@/lib/tasks/management-pagination";
import {
  buildTaskManagementFilterHrefMaps,
  mergeAssigneeFilterHrefs,
} from "@/lib/tasks/management-filter-maps";
import {
  hasSecondaryTaskFilters,
  type TaskManagementQueryState,
  type TaskManagementSort,
  type TaskManagementView,
} from "@/lib/tasks/management-navigation";
import AufgabenManagementToolbar from "./AufgabenManagementToolbar";
import AufgabenManagementSortControl from "./AufgabenManagementSortControl";
import AufgabenManagementQuickAccess from "./AufgabenManagementQuickAccess";
import AufgabenManagementFilterRail from "./AufgabenManagementFilterRail";
import AufgabenManagementPagination from "./AufgabenManagementPagination";
import AufgabenQuickCreateDialog from "./AufgabenQuickCreateDialog";
import AufgabenTaskList from "./AufgabenTaskList";
import AufgabenSeriesList from "./AufgabenSeriesList";

type Props = {
  basePath?: string;
  locale: string;
  timeZone: string;
  query: TaskManagementQueryState;
  sort: TaskManagementSort;
  summary: TaskManagementSummary;
  items: TaskManagementListItem[];
  seriesRows: TaskSeriesManagementRow[];
  totalCount: number;
  page: number;
  pageCount: number;
  assigneeOptions: TaskAssigneeOption[];
  canCreate: boolean;
  canAssign: boolean;
  canManage: boolean;
  loadError?: boolean;
};

const LIST_VIEWS: TaskManagementView[] = [
  "MEINE",
  "ALLE",
  "UEBERFAELLIG",
  "DEMNAECHST",
  "WIEDERKEHREND",
  "ERLEDIGT",
];

function emptyCopy(view: TaskManagementView, filtered: boolean): { title: string; description: string } {
  if (filtered) {
    return {
      title: "Keine Aufgaben gefunden",
      description: "Passe Suche oder Filter an.",
    };
  }
  switch (view) {
    case "MEINE":
      return {
        title: "Dir sind aktuell keine offenen Aufgaben zugewiesen.",
        description: "Neue Zuweisungen erscheinen hier automatisch.",
      };
    case "UEBERFAELLIG":
      return {
        title: "Keine überfälligen Aufgaben.",
        description: "Gut — alles im Plan.",
      };
    case "ERLEDIGT":
      return {
        title: "Noch keine erledigten Aufgaben.",
        description: "Abgeschlossene Arbeit wird hier archiviert sichtbar.",
      };
    case "WIEDERKEHREND":
      return {
        title: "Keine wiederkehrenden Serien.",
        description: "Serien werden separat verwaltet (Detail folgt in AUFGABEN-03).",
      };
    case "DEMNAECHST":
      return {
        title: "Keine anstehenden Termine in diesem Horizont.",
        description: "Der nächste Fälligkeitstermin erscheint hier.",
      };
    default:
      return {
        title: "Noch keine Aufgaben vorhanden.",
        description: "Lege die erste Aufgabe an, um operative Arbeit zu koordinieren.",
      };
  }
}

export default function AufgabenManagementWorkspace({
  basePath = "/dashboard/aufgaben",
  locale,
  timeZone,
  query,
  sort,
  summary,
  items,
  seriesRows,
  totalCount,
  page,
  pageCount,
  assigneeOptions,
  canCreate,
  canAssign,
  canManage,
  loadError = false,
}: Props) {
  const filterMaps = buildTaskManagementFilterHrefMaps(basePath, query);
  const assigneeHrefByValue = mergeAssigneeFilterHrefs(
    filterMaps,
    basePath,
    query,
    assigneeOptions,
  );

  const viewLinks = LIST_VIEWS.map((view) => ({
    view,
    href: filterMaps.viewHrefByValue[view]!,
    active: query.view === view,
  }));

  const filtered = hasSecondaryTaskFilters(query);
  const isSeriesView = query.view === "WIEDERKEHREND";
  const listCount = isSeriesView ? seriesRows.length : totalCount;
  const { rangeStart, rangeEnd } = computeTaskManagementRange(
    page,
    TASK_MANAGEMENT_PAGE_SIZE,
    totalCount,
  );
  const paginationNavigation = buildTaskManagementPaginationNavigation(
    basePath,
    query,
    page,
    pageCount,
  );

  const empty = emptyCopy(query.view, filtered);
  const showParentContext =
    query.view === "MEINE" || query.view === "UEBERFAELLIG" || query.view === "DEMNAECHST";

  return (
    <div className="w-full space-y-4" data-testid="aufgaben-management-workspace">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Aufgaben"
        title="Aufgaben"
        subtitle="Operatives Task Center — Arbeit im Verein koordinieren und nachverfolgen."
        subtitleTestId="aufgaben-header-subtitle"
        actions={<AufgabenQuickCreateDialog canCreate={canCreate} assigneeOptions={assigneeOptions} />}
      />

      <PlanningManagementKpiCards
        testId="aufgaben-kpi-cards"
        metrics={[
          {
            key: "open",
            label: "Offen",
            value: summary.open,
            hint: "aktive Hauptaufgaben",
            href: filterMaps.kpiHrefs.open,
            active: query.view === "ALLE" && !filtered,
            icon: ListChecks,
            surface: "border-sky-500/25 bg-sky-950/40",
            iconTile: "bg-sky-500/15 text-sky-400",
            "data-testid": "aufgaben-kpi-open",
          },
          {
            key: "overdue",
            label: "Überfällig",
            value: summary.overdue,
            hint: "mit Fälligkeit",
            href: filterMaps.kpiHrefs.overdue,
            active: query.view === "UEBERFAELLIG",
            icon: AlertCircle,
            surface: "border-orange-500/25 bg-orange-950/35",
            iconTile: "bg-orange-500/15 text-orange-400",
            "data-testid": "aufgaben-kpi-overdue",
          },
          {
            key: "week",
            label: "Diese Woche",
            value: summary.dueThisWeek,
            hint: "fällig",
            href: filterMaps.kpiHrefs.dueThisWeek,
            active: query.deadline === "THIS_WEEK" && query.view === "ALLE",
            icon: CalendarClock,
            surface: "border-amber-500/25 bg-amber-950/30",
            iconTile: "bg-amber-500/15 text-amber-400",
            "data-testid": "aufgaben-kpi-week",
          },
          {
            key: "my",
            label: "Meine",
            value: summary.myOpen,
            hint: "offen zugewiesen",
            href: filterMaps.kpiHrefs.my,
            active: query.view === "MEINE",
            icon: UserRound,
            surface: "border-emerald-500/25 bg-emerald-950/35",
            iconTile: "bg-emerald-500/15 text-emerald-400",
            "data-testid": "aufgaben-kpi-my",
          },
        ]}
      />

      <div className={PLANNING_WORKSPACE_MAIN_RAIL_GRID}>
        <div className="min-w-0 space-y-4">
          {loadError ? (
            <div
              className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-100"
              data-testid="aufgaben-load-error"
            >
              Aufgaben konnten nicht geladen werden. Bitte Seite neu laden oder später erneut versuchen.
            </div>
          ) : null}

          {!isSeriesView ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Suspense fallback={null}>
                <AufgabenManagementToolbar searchValue={query.search} />
              </Suspense>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <p className="text-sm text-[var(--text-2)]" data-testid="aufgaben-result-count">
                  {listCount} {listCount === 1 ? "Aufgabe" : "Aufgaben"}
                </p>
                <Suspense fallback={null}>
                  <AufgabenManagementSortControl value={sort} />
                </Suspense>
              </div>
            </div>
          ) : null}

          <div
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            data-testid="aufgaben-list-shell"
          >
            {isSeriesView ? (
              seriesRows.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-[var(--foreground)]">{empty.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{empty.description}</p>
                </div>
              ) : (
                <AufgabenSeriesList rows={seriesRows} locale={locale} timeZone={timeZone} />
              )
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center" data-testid="aufgaben-empty-state">
                <p className="text-sm font-medium text-[var(--foreground)]">{empty.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{empty.description}</p>
                {filtered ? (
                  <Link
                    href={filterMaps.resetHref}
                    className="mt-3 inline-block text-sm text-[var(--sce-primary)] hover:underline"
                  >
                    Filter zurücksetzen
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <AufgabenTaskList
                  items={items}
                  locale={locale}
                  timeZone={timeZone}
                  canAssign={canAssign}
                  canComplete={canManage || canAssign}
                  assigneeOptions={assigneeOptions}
                  showParentContext={showParentContext}
                />
                <AufgabenManagementPagination
                  page={page}
                  pageCount={pageCount}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalCount={totalCount}
                  navigation={paginationNavigation}
                />
              </>
            )}
          </div>
        </div>

        <aside
          className={cn(PLANNING_WORKSPACE_RAIL_ASIDE, PLANNING_WORKSPACE_RAIL_STACK)}
          data-testid="aufgaben-management-rail"
        >
          <AufgabenManagementQuickAccess viewLinks={viewLinks} />
          {!isSeriesView ? (
            <AufgabenManagementFilterRail
              resetHref={filterMaps.resetHref}
              statusValue={query.status}
              assigneeValue={query.assigneeUserId ?? undefined}
              priorityValue={query.priority ?? undefined}
              deadlineValue={query.deadline}
              recurringValue={query.recurring}
              contextValue={query.contextType ?? undefined}
              assigneeOptions={assigneeOptions.map((a) => ({
                userId: a.userId,
                label: `${a.firstName} ${a.lastName}`.trim(),
              }))}
              statusHrefByValue={filterMaps.statusHrefByValue}
              assigneeHrefByValue={assigneeHrefByValue}
              priorityHrefByValue={filterMaps.priorityHrefByValue}
              deadlineHrefByValue={filterMaps.deadlineHrefByValue}
              recurringHrefByValue={filterMaps.recurringHrefByValue}
              contextHrefByValue={filterMaps.contextHrefByValue}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
