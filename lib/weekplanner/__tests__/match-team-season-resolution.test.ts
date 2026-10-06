import { describe, expect, it } from "vitest";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import {
  resolveMatchcenterOwnTeamId,
  resolveWeekplannerMatchTeamSeasonId,
  teamSeasonLookupKey,
} from "../match-team-season-resolution";

function sfvMatchSummary(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  return {
    id: "event-sfv-40",
    tenantId: "tenant-fca",
    teamId: "team-senioren-40",
    teamSeasonId: null,
    seasonId: "season-2026-2027",
    type: "MATCH",
    title: "Senioren 40+ vs FC Birsfelden",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-10-09T18:30:00.000Z"),
    kickoffKnown: true,
    endAt: new Date("2026-10-09T20:30:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-10-09T20:30:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "3. Liga",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: 100,
      providerTeamName: "Provider Home",
      canonicalTeamId: "team-senioren-40",
      canonicalTeamName: "Senioren 40+",
      displayName: "Senioren 40+",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 200,
      providerTeamName: "FC Birsfelden",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC Birsfelden",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
    },
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "9001",
      provider: "SFV",
      externalMatchId: 9001,
      externalSeasonId: 2027,
      matchNumber: 12345,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: "KR2",
      homeDressingRoomCode: "G1",
      awayDressingRoomCode: "G2",
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: true,
      trainingsplanVisible: false,
      teamPageVisible: true,
    },
    reviewStage: "DRAFT",
    publishedAt: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
    ...overrides,
  };
}

describe("match team season resolution — SFV/provider shape", () => {
  const lookup = new Map([
    [teamSeasonLookupKey("team-senioren-40", "season-2026-2027"), "ts-senioren-40-fca"],
    [teamSeasonLookupKey("team-senioren-30", "season-2026-2027"), "ts-senioren-30-fca"],
  ]);

  it("resolves own team id from Event.teamId when present", () => {
    expect(resolveMatchcenterOwnTeamId(sfvMatchSummary())).toBe("team-senioren-40");
  });

  it("falls back to own side canonicalTeamId when Event.teamId is absent", () => {
    expect(
      resolveMatchcenterOwnTeamId(
        sfvMatchSummary({
          teamId: null,
        }),
      ),
    ).toBe("team-senioren-40");
  });

  it("returns null teamSeasonId on Event but resolves via teamId + seasonId lookup", () => {
    const summary = sfvMatchSummary({ teamSeasonId: null });
    expect(summary.teamSeasonId).toBeNull();
    expect(resolveWeekplannerMatchTeamSeasonId(summary, lookup)).toBe("ts-senioren-40-fca");
  });

  it("prefers persisted Event.teamSeasonId when set", () => {
    expect(
      resolveWeekplannerMatchTeamSeasonId(
        sfvMatchSummary({ teamSeasonId: "ts-persisted" }),
        lookup,
      ),
    ).toBe("ts-persisted");
  });
});
