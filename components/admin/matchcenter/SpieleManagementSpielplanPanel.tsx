"use client";

import { useCallback, useMemo, useState } from "react";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type {
  MatchcenterActionFilter,
  MatchcenterTab,
  MatchcenterWochenplanFilter,
} from "@/lib/matchcenter/view-model";
import type { MatchcenterTeamOption } from "@/lib/matchcenter/navigation";
import {
  deriveSpieleManagementPresentation,
  parseSpieleManagementSort,
} from "@/lib/matchcenter/management-view";
import {
  mergeMatchcenterMatchesById,
  type SpielplanMonthChip,
  type SpielplanungPaginationState,
} from "@/lib/matchcenter/spielplan-schedule-scope";
import SpieleManagementSpielplanScheduleNav from "./SpieleManagementSpielplanScheduleNav";
import SpieleManagementUpcomingList from "./SpieleManagementUpcomingList";
import SpieleManagementSpielplanLoadMore from "./SpieleManagementSpielplanLoadMore";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { SpieleHomeAwayFilter, SpieleListView, SpieleStatusMaskKey } from "@/lib/matchcenter/navigation";

type Props = {
  basePath: string;
  spielplanMatches: MatchcenterMatchSummary[];
  resultateMonthMatches: MatchcenterMatchSummary[];
  pagination: SpielplanungPaginationState;
  scheduleScopeLabel: string;
  scheduleScopeSource: string;
  scopeFrom?: string | null;
  scopeTo?: string | null;
  tab: MatchcenterTab;
  actionFilter: MatchcenterActionFilter;
  wochenplanFilter: MatchcenterWochenplanFilter;
  teamFilter: string | null;
  teamOptions: MatchcenterTeamOption[];
  spielplanungListMonthFilter: string | null;
  calendarMonthParam: string;
  spielplanMonthChipsFromScope: SpielplanMonthChip[];
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  tenantClubName?: string | null;
  canManage: boolean;
  canManageOperationalAllocations: boolean;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  searchQuery: string;
  sortParam: string | null;
  homeAwayFilter: SpieleHomeAwayFilter;
  listView: SpieleListView;
  competitionFilter: string | null;
  venueFilter: string | null;
  statusMask: readonly SpieleStatusMaskKey[];
};

export default function SpieleManagementSpielplanPanel({
  basePath,
  spielplanMatches: initialSpielplanMatches,
  resultateMonthMatches,
  pagination,
  scheduleScopeLabel,
  scheduleScopeSource,
  scopeFrom,
  scopeTo,
  tab,
  actionFilter,
  wochenplanFilter,
  teamFilter,
  teamOptions,
  spielplanungListMonthFilter,
  calendarMonthParam,
  spielplanMonthChipsFromScope,
  locale,
  timezone,
  tenantLogoUrl,
  tenantClubName,
  canManage,
  canManageOperationalAllocations,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  searchQuery,
  sortParam,
  homeAwayFilter,
  listView,
  competitionFilter,
  venueFilter,
  statusMask,
}: Props) {
  const [spielplanMatches, setSpielplanMatches] = useState(initialSpielplanMatches);

  const sort =
    sortParam != null
      ? parseSpieleManagementSort(sortParam)
      : "KICKOFF_ASC";

  const onAppend = useCallback((mergedSpielplan: MatchcenterMatchSummary[]) => {
    setSpielplanMatches(mergedSpielplan);
  }, []);

  const mergedForDerivation = useMemo(
    () => mergeMatchcenterMatchesById(spielplanMatches, resultateMonthMatches),
    [spielplanMatches, resultateMonthMatches],
  );

  const { spielplanungMonthGroups } = deriveSpieleManagementPresentation(
    mergedForDerivation,
    {
      tab,
      searchQuery,
      sort,
      statusMask,
      homeAwayFilter,
      competitionFilter,
      venueFilter,
      locale,
      timezone,
      wochenplanFilter,
      teamFilter,
      spielplanungListMonthFilter,
      calendarMonthParam,
      spielplanMonthChipsOverride: spielplanMonthChipsFromScope,
    },
  );

  return (
    <div className="space-y-4">
      <p
        className="text-xs text-[var(--muted)]"
        data-testid="matchcenter-spielplan-scope-label"
      >
        Spielplanumfang: {scheduleScopeLabel}
        {scheduleScopeSource === "default-range"
          ? " — Datumsbereich via scopeFrom/scopeTo anpassbar."
          : null}
      </p>
      <SpieleManagementSpielplanScheduleNav
        basePath={basePath}
        tab={tab}
        teamOptions={teamOptions}
        teamFilter={teamFilter}
        spielplanungListMonthFilter={spielplanungListMonthFilter}
        calendarMonthParam={calendarMonthParam}
        monthChips={spielplanMonthChipsFromScope}
        actionFilter={actionFilter}
        wochenplanFilter={wochenplanFilter}
        searchQuery={searchQuery}
        sortParam={sortParam}
        homeAwayFilter={homeAwayFilter}
        listView={listView}
        competitionFilter={competitionFilter}
        venueFilter={venueFilter}
        statusMask={statusMask}
        scheduleScopeSource={scheduleScopeSource}
        scopeFrom={scopeFrom}
        scopeTo={scopeTo}
      />
      <SpieleManagementUpcomingList
        monthGroups={spielplanungMonthGroups}
        locale={locale}
        timezone={timezone}
        tenantLogoUrl={tenantLogoUrl}
        tenantClubName={tenantClubName}
        canManage={canManage}
        canManageOperationalAllocations={canManageOperationalAllocations}
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        compact={listView === "KOMPAKT"}
      />
      <SpieleManagementSpielplanLoadMore
        matches={spielplanMatches}
        pagination={pagination}
        scopeFrom={scopeFrom}
        scopeTo={scopeTo}
        onAppend={onAppend}
      />
    </div>
  );
}
