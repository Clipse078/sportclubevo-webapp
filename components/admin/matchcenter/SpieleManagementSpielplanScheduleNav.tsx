"use client";

import Link from "next/link";
import MatchcenterTeamFilter from "./MatchcenterTeamFilter";
import { buildMatchcenterHref, type MatchcenterTeamOption, type SpieleHomeAwayFilter, type SpieleListView, type SpieleStatusMaskKey } from "@/lib/matchcenter/navigation";
import type {
  MatchcenterActionFilter,
  MatchcenterTab,
  MatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import type { SpielplanMonthChip } from "@/lib/matchcenter/spielplan-schedule-scope";
import { cn } from "@/lib/cn";

const CHIP_CLASS =
  "inline-flex h-8 items-center rounded-lg border px-3 text-xs font-semibold transition-colors";

type Props = {
  basePath?: string;
  tab: MatchcenterTab;
  teamOptions: MatchcenterTeamOption[];
  teamFilter: string | null;
  spielplanungListMonthFilter: string | null;
  calendarMonthParam: string;
  monthChips: SpielplanMonthChip[];
  actionFilter: MatchcenterActionFilter;
  wochenplanFilter: MatchcenterWochenplanFilter;
  searchQuery?: string;
  sortParam?: string | null;
  homeAwayFilter?: SpieleHomeAwayFilter;
  listView?: SpieleListView;
  competitionFilter?: string | null;
  venueFilter?: string | null;
  statusMask?: readonly SpieleStatusMaskKey[] | null;
  scheduleScopeSource?: string;
  scopeFrom?: string | null;
  scopeTo?: string | null;
};

export default function SpieleManagementSpielplanScheduleNav({
  basePath = "/dashboard/matchcenter",
  tab,
  teamOptions,
  teamFilter,
  spielplanungListMonthFilter,
  calendarMonthParam,
  monthChips,
  actionFilter,
  wochenplanFilter,
  searchQuery = "",
  sortParam = null,
  homeAwayFilter = "ALLE",
  listView = "LISTE",
  competitionFilter = null,
  venueFilter = null,
  statusMask = null,
  scheduleScopeSource = "season",
  scopeFrom = null,
  scopeTo = null,
}: Props) {
  function hrefForMonth(month: string | null) {
    return buildMatchcenterHref(basePath, {
      tab,
      month,
      calendarMonth: calendarMonthParam,
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
      scopeFrom,
      scopeTo,
    });
  }

  const scopeAction = `${basePath}?tab=spielplanung`;

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)]/30 px-3 py-3 sm:px-4"
      data-testid="matchcenter-spielplan-schedule-nav"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Team</p>
          <MatchcenterTeamFilter
            teams={teamOptions}
            teamFilter={teamFilter}
            basePath={basePath}
            tab={tab}
            month={spielplanungListMonthFilter ?? undefined}
            calendarMonth={calendarMonthParam}
            actionFilter={actionFilter}
            wochenplanFilter={wochenplanFilter}
            urlSearch={searchQuery}
            urlSort={sortParam}
            spieleFilters={{
              homeAwayFilter,
              listView,
              competitionFilter,
              venueFilter,
              statusMask,
            }}
            fullWidth
          />
        </div>
      </div>

      {scheduleScopeSource !== "season" ? (
        <form
          action={scopeAction}
          method="get"
          className="flex flex-wrap items-end gap-2"
          data-testid="matchcenter-spielplan-scope-range"
        >
          <input type="hidden" name="tab" value="spielplanung" />
          {calendarMonthParam ? (
            <input type="hidden" name="cal" value={calendarMonthParam} />
          ) : null}
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Von
            <input
              type="date"
              name="scopeFrom"
              defaultValue={scopeFrom ?? ""}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-normal normal-case text-[var(--foreground)]"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Bis
            <input
              type="date"
              name="scopeTo"
              defaultValue={scopeTo ?? ""}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-normal normal-case text-[var(--foreground)]"
            />
          </label>
          <button type="submit" className="fca-button-secondary h-8 px-3 text-xs">
            Zeitraum anwenden
          </button>
        </form>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Monat</p>
        <div className="flex flex-wrap gap-1.5" data-testid="matchcenter-spielplan-month-chips">
          <Link
            href={hrefForMonth(null)}
            className={cn(
              CHIP_CLASS,
              !spielplanungListMonthFilter
                ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
            )}
            data-testid="matchcenter-spielplan-month-alle"
            aria-current={!spielplanungListMonthFilter ? "true" : undefined}
          >
            Alle
          </Link>
          {monthChips.map((chip) => {
            const active = spielplanungListMonthFilter === chip.param;
            return (
              <Link
                key={chip.param}
                href={hrefForMonth(chip.param)}
                className={cn(
                  CHIP_CLASS,
                  active
                    ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                    : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                )}
                data-testid={`matchcenter-spielplan-month-${chip.param}`}
                aria-current={active ? "true" : undefined}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
