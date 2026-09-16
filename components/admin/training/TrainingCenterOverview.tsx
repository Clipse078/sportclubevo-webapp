import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import { SectionCard } from "@/components/ui/page/SectionCard";
import { SceSegmentedLinkGroup } from "@/components/admin/shared/SceSegmentedLinkGroup";
import type { TrainingCenterView } from "@/lib/training/date-range";
import type { TrainingActionFilter, TrainingCenterViewModel } from "@/lib/training/view-model";
import TrainingMonthCalendar from "./TrainingMonthCalendar";
import TrainingSessionRow from "./TrainingSessionRow";

export type TrainingCenterWindowLike = {
  param: string;
  label: string;
  previousParam: string;
  nextParam: string;
};

type Props = {
  view: TrainingCenterView;
  actionFilter: TrainingActionFilter;
  viewModel: TrainingCenterViewModel;
  monthWindow: TrainingCenterWindowLike & { weeks: { date: string; inMonth: boolean }[][] };
  weekWindow: TrainingCenterWindowLike & { days: string[] };
  dayWindow: TrainingCenterWindowLike & { date: string };
  canManage: boolean;
  basePath?: string;
  timezone?: string;
  locale?: string;
};

const VIEW_TABS: { key: TrainingCenterView; label: string }[] = [
  { key: "MONTH", label: "Monat" },
  { key: "WEEK", label: "Woche" },
  { key: "DAY", label: "Tag" },
];

const ACTION_FILTERS: { key: TrainingActionFilter; label: string }[] = [
  { key: "ALLE", label: "Alle" },
  { key: "OFFEN", label: "Offen" },
  { key: "ERLEDIGT", label: "Bereit" },
];

function paramKeyForView(view: TrainingCenterView): "month" | "week" | "day" {
  if (view === "WEEK") return "week";
  if (view === "DAY") return "day";
  return "month";
}

function buildHref(
  basePath: string,
  params: { view: TrainingCenterView; dateParam: string; actionFilter: TrainingActionFilter },
): string {
  const search = new URLSearchParams();
  search.set("tab", "kalender");
  search.set("view", params.view.toLowerCase());
  search.set(paramKeyForView(params.view), params.dateParam);
  search.set("filter", params.actionFilter.toLowerCase());
  return `${basePath}?${search.toString()}`;
}

function windowForView(
  view: TrainingCenterView,
  monthWindow: TrainingCenterWindowLike,
  weekWindow: TrainingCenterWindowLike,
  dayWindow: TrainingCenterWindowLike,
): TrainingCenterWindowLike {
  if (view === "WEEK") return weekWindow;
  if (view === "DAY") return dayWindow;
  return monthWindow;
}

export default function TrainingCenterOverview({
  view,
  actionFilter,
  viewModel,
  monthWindow,
  weekWindow,
  dayWindow,
  canManage,
  basePath = "/dashboard/training",
  timezone = "Europe/Zurich",
  locale = "de-CH",
}: Props) {
  const activeWindow = windowForView(view, monthWindow, weekWindow, dayWindow);

  const dayScopedRows =
    view === "DAY" ? viewModel.rows.filter((row) => row.session.date === dayWindow.date) : viewModel.rows;
  const dayScopedFilteredRows =
    view === "DAY"
      ? viewModel.filteredRows.filter((row) => row.session.date === dayWindow.date)
      : viewModel.filteredRows;
  const displayKpis =
    view === "DAY"
      ? {
          gesamt: dayScopedRows.length,
          offen: dayScopedRows.filter((row) => row.assessment.status === "OPEN").length,
          bereit: dayScopedRows.filter((row) => row.assessment.status !== "OPEN").length,
        }
      : {
          gesamt: viewModel.kpis.gesamt,
          offen: viewModel.kpis.offen,
          bereit: viewModel.kpis.erledigt,
        };

  const rowsByDate = new Map<string, typeof viewModel.filteredRows>();
  for (const row of viewModel.filteredRows) {
    const list = rowsByDate.get(row.session.date) ?? [];
    list.push(row);
    rowsByDate.set(row.session.date, list);
  }

  const viewOptions = VIEW_TABS.map((item) => {
    const itemWindow = windowForView(item.key, monthWindow, weekWindow, dayWindow);
    return {
      value: item.key,
      label: item.label,
      href: buildHref(basePath, { view: item.key, dateParam: itemWindow.param, actionFilter }),
    };
  });

  const filterOptions = ACTION_FILTERS.map((item) => ({
    value: item.key,
    label: item.label,
    href: buildHref(basePath, { view, dateParam: activeWindow.param, actionFilter: item.key }),
  }));

  const emptyCount =
    (view === "DAY" ? dayScopedFilteredRows.length : viewModel.filteredRows.length) === 0;

  return (
    <div className="space-y-4" data-testid="training-center-calendar">
      <div
        className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:px-4"
        data-testid="trainingcenter-operational-toolbar"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SceSegmentedLinkGroup
            aria-label="TrainingCenter-Ansichten"
            testId="trainingcenter-view"
            value={view}
            options={viewOptions}
          />

          <div className="flex items-center justify-center gap-2">
            <Link
              href={buildHref(basePath, { view, dateParam: activeWindow.previousParam, actionFilter })}
              aria-label="Vorheriger Zeitraum"
              data-testid="trainingcenter-date-previous"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span
              className="min-w-[10rem] text-center text-sm font-semibold text-[var(--foreground)]"
              data-testid="trainingcenter-date-label"
            >
              {activeWindow.label}
            </span>
            <Link
              href={buildHref(basePath, { view, dateParam: activeWindow.nextParam, actionFilter })}
              aria-label="Nächster Zeitraum"
              data-testid="trainingcenter-date-next"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-sm text-[var(--text-2)]"
            data-testid="trainingcenter-summary-strip"
          >
            <span className="font-semibold text-[var(--foreground)]">{displayKpis.gesamt}</span> Trainings
            <span className="mx-2 text-[var(--muted)]" aria-hidden>·</span>
            <span className={cn(displayKpis.offen > 0 && "font-semibold text-[var(--sce-warning)]")}>
              {displayKpis.offen}
            </span>{" "}
            offen
            <span className="mx-2 text-[var(--muted)]" aria-hidden>·</span>
            <span className="font-semibold text-[var(--foreground)]">{displayKpis.bereit}</span> bereit
            {view === "MONTH" ? (
              <>
                <span className="mx-2 text-[var(--muted)]" aria-hidden>·</span>
                <Link
                  href={`${basePath}?tab=planungsraster&day=${dayWindow.param}`}
                  className="font-semibold text-[var(--sce-primary)] hover:underline"
                >
                  Planungsraster
                </Link>
              </>
            ) : null}
          </p>

          <SceSegmentedLinkGroup
            aria-label="Aktionsfilter"
            testId="trainingcenter-filter"
            value={actionFilter}
            options={filterOptions}
          />
        </div>
      </div>

      {emptyCount ? (
        <SectionCard noPadding>
          <EmptyState
            icon={<Dumbbell className="h-8 w-8" />}
            heading="Keine Trainings gefunden"
            description="Für den ausgewählten Zeitraum und Filter gibt es keine Trainings."
          />
        </SectionCard>
      ) : view === "MONTH" ? (
        <TrainingMonthCalendar
          monthWindow={monthWindow as never}
          rowsByDate={rowsByDate}
          actionFilter={actionFilter}
          basePath={basePath}
          timezone={timezone}
        />
      ) : view === "WEEK" ? (
        <div className="space-y-3">
          {weekWindow.days.map((date) => {
            const dayRows = rowsByDate.get(date) ?? [];
            if (dayRows.length === 0) return null;
            return (
              <SectionCard key={date} noPadding>
                <div className="border-b border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)]">
                  {new Intl.DateTimeFormat(locale, {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: timezone,
                  }).format(new Date(`${date}T12:00:00.000Z`))}
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {dayRows.map((row) => (
                    <TrainingSessionRow
                      key={row.session.id}
                      row={row}
                      allocationSummary={row.allocationSummary}
                      canManage={canManage}
                      locale={locale}
                      timezone={timezone}
                    />
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      ) : (
        <SectionCard noPadding>
          <div className="divide-y divide-[var(--border)]" data-testid="trainingcenter-day-list">
            {dayScopedFilteredRows.map((row) => (
              <TrainingSessionRow
                key={row.session.id}
                row={row}
                allocationSummary={row.allocationSummary}
                canManage={canManage}
                locale={locale}
                timezone={timezone}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
