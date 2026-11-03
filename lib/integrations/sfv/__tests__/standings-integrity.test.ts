import { describe, expect, it } from "vitest";

import {
  evaluateStandingsStaleVsSchedule,
  shouldPersistStandingsSnapshot,
} from "../standings-integrity";

function table(played: number) {
  return {
    competition: { name: "League", divisionName: null, groupName: null },
    rows: [
      {
        position: 1,
        externalTeamId: 100,
        teamName: "Team 100",
        shortName: null,
        played,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        penaltyPoints: null,
      },
    ],
  };
}

describe("evaluateStandingsStaleVsSchedule", () => {
  it("CASE C — detects stale when schedule evidence exceeds standings played", () => {
    const result = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: table(7),
      completedRelevantMatches: 10,
      hasScheduleEvidence: true,
      evidenceConfidence: "COMPLETE",
    });

    expect(result).toEqual({ isStale: true, standingsPlayed: 7 });
  });

  it("CASE CONF-4 — partial heuristic evidence does not declare stale", () => {
    const result = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: table(7),
      completedRelevantMatches: 10,
      hasScheduleEvidence: true,
      evidenceConfidence: "PARTIAL",
    });

    expect(result.isStale).toBe(false);
  });

  it("CASE CONF-4 — insufficient evidence does not declare stale", () => {
    const result = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: table(7),
      completedRelevantMatches: 10,
      hasScheduleEvidence: true,
      evidenceConfidence: "INSUFFICIENT",
    });

    expect(result.isStale).toBe(false);
  });

  it("CASE G — does not declare stale without schedule evidence", () => {
    const result = evaluateStandingsStaleVsSchedule({
      externalTeamId: 100,
      standingsTable: table(7),
      completedRelevantMatches: 10,
      hasScheduleEvidence: false,
    });

    expect(result.isStale).toBe(false);
  });
});

describe("shouldPersistStandingsSnapshot", () => {
  it("CASE E — blocks regressive stale overwrite", () => {
    expect(
      shouldPersistStandingsSnapshot({
        incomingPlayed: 7,
        existingSnapshotPlayed: 9,
        isStale: true,
        hasScheduleEvidence: true,
      }),
    ).toBe(false);
  });

  it("CASE A — persists fresh non-stale standings", () => {
    expect(
      shouldPersistStandingsSnapshot({
        incomingPlayed: 10,
        existingSnapshotPlayed: 7,
        isStale: false,
        hasScheduleEvidence: true,
      }),
    ).toBe(true);
  });
});
