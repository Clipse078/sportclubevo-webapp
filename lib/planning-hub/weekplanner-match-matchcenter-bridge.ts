/**
 * SCE-PLANNER-OPS-01 — minimal Weekplanner MATCH → MatchcenterMatchSummary for shared operational UI.
 * Weekplanner Liste only surfaces HOME tenant matches; publication flags come from persisted Event visibility.
 */

import type { MatchcenterMatchSummary, MatchcenterVisibility } from "@/lib/matchcenter/types";
import { assessMatchOperationalState, type MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { coercePlanningInstant } from "@/lib/planning-hub/manipulation-transport";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";

function firstCode(refs: { code: string }[]): string | null {
  const code = refs[0]?.code?.trim();
  return code || null;
}

const UNRESOLVED_MATCH_VISIBILITY: MatchcenterVisibility = {
  websiteVisible: false,
  infoboardVisible: false,
  homepageVisible: false,
  wochenplanVisible: false,
  trainingsplanVisible: false,
  teamPageVisible: false,
};

function mapWeekplannerMatchSide(side: WeekplannerMatchItem["homeSide"]) {
  return {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: side.canonicalTeamId ?? null,
    canonicalTeamName: side.canonicalTeamName ?? null,
    canonicalTeamShortName: side.canonicalTeamShortName ?? null,
    displayName: side.displayName,
    resolution: "RESOLVED" as const,
    isOwnTeam: side.isOwnTeam,
    externalLogoUrl: side.externalLogoUrl ?? null,
  };
}

export function weekplannerMatchToMatchcenterSummary(item: WeekplannerMatchItem): MatchcenterMatchSummary {
  const startAt = coercePlanningInstant(item.startAt, "startAt");
  const endAt = coercePlanningInstant(item.endAt, "endAt");
  const canonicalEndAt = coercePlanningInstant(item.canonicalEndAt, "canonicalEndAt");
  const operationalEndAt = endAt;

  return {
    id: item.eventId,
    tenantId: item.tenantId,
    teamId: null,
    teamSeasonId: item.teamSeasonId,
    seasonId: null,
    type: "MATCH",
    title: item.title,
    description: null,
    status: item.matchStatus ?? "SCHEDULED",
    startAt,
    kickoffKnown: item.kickoffKnown ?? true,
    endAt,
    operationalEndAtOverride: null,
    operationalEndAt,
    location: item.venueLabel?.trim() || null,
    competitionLabel: item.competitionLabel?.trim() || null,
    homeAway: item.homeAway,
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: mapWeekplannerMatchSide(item.homeSide),
    away: mapWeekplannerMatchSide(item.awaySide),
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
    visibility: item.publicationVisibility ?? UNRESOLVED_MATCH_VISIBILITY,
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
