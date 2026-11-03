import { describe, expect, it } from "vitest";

import type { StandingsScheduleMatchEvidence } from "../standings-competition-identity";
import { evaluateStandingsStaleVsSchedule } from "../standings-integrity";
import { evaluateStandingsScheduleEvidence } from "../standings-schedule-membership";

const NOW = new Date("2026-11-03T12:00:00.000Z");

let seq = 0;

function match(
  partial: Partial<StandingsScheduleMatchEvidence> & {
    providerDivisionId: number;
    startAt: Date;
  },
): StandingsScheduleMatchEvidence {
  seq += 1;
  return {
    externalMatchId: partial.externalMatchId ?? 100_000 + seq,
    providerLeagueId: partial.providerLeagueId ?? 15208,
    providerDivisionId: partial.providerDivisionId,
    providerRoundNbr: partial.providerRoundNbr ?? 1,
    providerGroupId: partial.providerGroupId ?? null,
    providerMatchType: partial.providerMatchType ?? 1,
    providerCupId: partial.providerCupId ?? null,
    startAt: partial.startAt,
    isCompleted: partial.isCompleted ?? true,
    isUpcoming: partial.isUpcoming ?? false,
    ...partial,
  };
}

describe("evaluateStandingsScheduleEvidence — confidence", () => {
  const tuple = {
    providerLeagueId: 15208,
    providerDivisionId: 30,
    providerGroupId: null,
  };

  it("CONF-1 — complete metadata aligned with standings is healthy", () => {
    const matches = Array.from({ length: 7 }, (_, index) =>
      match({
        providerDivisionId: 30,
        providerRoundNbr: index + 1,
        startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
      }),
    );

    const evaluation = evaluateStandingsScheduleEvidence(matches, tuple, {
      now: NOW,
    });

    expect(evaluation.confidence).toBe("COMPLETE");
    expect(evaluation.completedRelevantMatches).toBe(7);

    const stale = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: {
        competition: { name: "L", divisionName: null, groupName: null },
        rows: [
          {
            position: 1,
            externalTeamId: 100,
            teamName: "T",
            shortName: null,
            played: 7,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
            penaltyPoints: null,
          },
        ],
      },
      completedRelevantMatches: evaluation.completedRelevantMatches,
      hasScheduleEvidence: true,
      evidenceConfidence: evaluation.confidence,
    });

    expect(stale.isStale).toBe(false);
  });

  it("CONF-2 — complete metadata with authoritative excess declares stale", () => {
    const matches = Array.from({ length: 10 }, (_, index) =>
      match({
        providerDivisionId: 30,
        providerRoundNbr: index + 1,
        startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
      }),
    );

    const evaluation = evaluateStandingsScheduleEvidence(matches, tuple, {
      now: NOW,
    });

    const stale = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: {
        competition: { name: "L", divisionName: null, groupName: null },
        rows: [
          {
            position: 1,
            externalTeamId: 100,
            teamName: "T",
            shortName: null,
            played: 7,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
            penaltyPoints: null,
          },
        ],
      },
      completedRelevantMatches: evaluation.completedRelevantMatches,
      hasScheduleEvidence: true,
      evidenceConfidence: evaluation.confidence,
    });

    expect(stale.isStale).toBe(true);
  });

  it("CONF-3 — missing match type metadata is insufficient and not stale", () => {
    const matches = [
      match({
        providerDivisionId: 30,
        providerMatchType: null,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
      match({
        providerDivisionId: 30,
        startAt: new Date("2026-09-08T14:00:00.000Z"),
      }),
    ];

    const evaluation = evaluateStandingsScheduleEvidence(matches, tuple, {
      now: NOW,
    });

    expect(evaluation.confidence).toBe("INSUFFICIENT");

    const stale = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: {
        competition: { name: "L", divisionName: null, groupName: null },
        rows: [
          {
            position: 1,
            externalTeamId: 100,
            teamName: "T",
            shortName: null,
            played: 1,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
            penaltyPoints: null,
          },
        ],
      },
      completedRelevantMatches: evaluation.completedRelevantMatches,
      hasScheduleEvidence: true,
      evidenceConfidence: evaluation.confidence,
    });

    expect(stale.isStale).toBe(false);
  });

  it("CONF-5 — metadata fill moves evidence to complete", () => {
    const legacy = [
      match({
        providerDivisionId: 30,
        providerMatchType: null,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
    ];
    expect(
      evaluateStandingsScheduleEvidence(legacy, tuple, { now: NOW }).confidence,
    ).toBe("INSUFFICIENT");

    const synced = [
      match({
        providerDivisionId: 30,
        providerMatchType: 1,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
    ];
    expect(
      evaluateStandingsScheduleEvidence(synced, tuple, { now: NOW }).confidence,
    ).toBe("COMPLETE");
  });
});
