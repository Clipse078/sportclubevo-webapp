/**
 * SCE-PLANNER-OPS-01 — minimal Weekplanner MATCH → MatchcenterMatchSummary for shared operational UI.
 * Weekplanner Liste only surfaces HOME tenant matches; fields not needed for preparation UI are stubbed.
 */

import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { assessMatchOperationalState, type MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";

function firstCode(refs: { code: string }[]): string | null {
  const code = refs[0]?.code?.trim();
  return code || null;
}

const EMPTY_SIDE = {
  providerTeamId: null,
  providerTeamName: null,
  canonicalTeamId: null,
  canonicalTeamName: null,
  displayName: "",
  resolution: "RESOLVED" as const,
  isOwnTeam: false,
};

export function weekplannerMatchToMatchcenterSummary(item: WeekplannerMatchItem): MatchcenterMatchSummary {
  const operationalEndAt = item.canonicalEndAt ?? item.endAt;

  return {
    id: item.eventId,
    tenantId: item.tenantId,
    teamId: null,
    teamSeasonId: item.teamSeasonId,
    seasonId: null,
    type: "MATCH",
    title: item.title,
    description: null,
    status: "SCHEDULED",
    startAt: item.canonicalStartAt,
    kickoffKnown: true,
    endAt: item.canonicalEndAt,
    operationalEndAtOverride: null,
    operationalEndAt,
    location: null,
    competitionLabel: null,
    homeAway: item.homeAway,
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      ...EMPTY_SIDE,
      displayName: item.homeSide.displayName,
      isOwnTeam: item.homeSide.isOwnTeam,
    },
    away: {
      ...EMPTY_SIDE,
      displayName: item.awaySide.displayName,
      isOwnTeam: item.awaySide.isOwnTeam,
    },
    source: {
      eventSource: item.eventSource,
      externalSource: null,
      externalSourceId: null,
      provider: null,
      externalMatchId: null,
      externalSeasonId: null,
      matchNumber: null,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: firstCode(item.pitchAllocations),
      homeDressingRoomCode: firstCode(item.dressingRoomAllocations),
      awayDressingRoomCode: firstCode(item.awayDressingRoomAllocations),
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: false,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: true,
      trainingsplanVisible: false,
      teamPageVisible: false,
    },
    reviewStage: "NONE",
    publishedAt: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
  };
}

export function weekplannerMatchOperationalAssessment(item: WeekplannerMatchItem): MatchcenterOperationalAssessment {
  return assessMatchOperationalState(weekplannerMatchToMatchcenterSummary(item));
}
