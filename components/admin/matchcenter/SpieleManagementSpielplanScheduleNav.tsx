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
    });
  }

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
