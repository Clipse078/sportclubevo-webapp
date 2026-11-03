import { beforeEach, describe, expect, it } from "vitest";

import {
  countMatchEvidenceForCompetitionTuple,
  countStandingsCountingMatchesForCompetitionTuple,
  deriveCurrentCompetitionTupleFromMatchEvidence,
} from "../standings-competition-identity";
import type { StandingsScheduleMatchEvidence } from "../standings-competition-identity";
import { evaluateStandingsStaleVsSchedule } from "../standings-integrity";

const NOW = new Date("2026-11-03T12:00:00.000Z");

let evidenceSeq = 0;

beforeEach(() => {
  evidenceSeq = 0;
});

function evidence(
  partial: Partial<StandingsScheduleMatchEvidence> & {
    providerDivisionId: number;
    startAt: Date;
  },
): StandingsScheduleMatchEvidence {
  evidenceSeq += 1;
  return {
    providerLeagueId: 15208,
    providerDivisionId: partial.providerDivisionId,
    providerRoundNbr: partial.providerRoundNbr ?? 1,
    externalMatchId: partial.externalMatchId ?? 100_000 + evidenceSeq,
    startAt: partial.startAt,
    isCompleted: partial.isCompleted ?? true,
    isUpcoming: partial.isUpcoming ?? false,
    ...partial,
  };
}

describe("deriveCurrentCompetitionTupleFromMatchEvidence", () => {
  it("CASE A — selects newer division with one current match over ten older", () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 10,
          startAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
      evidence({
        providerDivisionId: 1,
        startAt: new Date("2026-10-15T14:00:00.000Z"),
        providerRoundNbr: 1,
      }),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(1);
  });

  it("CASE B — selects newer division 2 over ten older in division 10", () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 10,
          startAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
      evidence({
        providerDivisionId: 2,
        startAt: new Date("2026-10-20T14:00:00.000Z"),
        providerRoundNbr: 1,
      }),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(2);
  });

  it("CASE C — Junioren A: division 30 current over older division 0", () => {
    const matches = [
      evidence({
        providerDivisionId: 0,
        startAt: new Date("2026-08-02T14:00:00.000Z"),
        providerRoundNbr: 1,
      }),
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 30,
          startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple).toEqual({
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    });
  });

  it("CASE D — upcoming fixtures establish a new division when supported", () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 30,
          startAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
      evidence({
        providerDivisionId: 40,
        startAt: new Date("2026-11-20T14:00:00.000Z"),
        isCompleted: false,
        isUpcoming: true,
        providerRoundNbr: 1,
      }),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(40);
  });

  it("CASE E — one-off single-match division does not steal from established phase", () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 30,
          startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
      evidence({
        providerDivisionId: 99,
        startAt: new Date("2026-10-01T14:00:00.000Z"),
        providerRoundNbr: 1,
      }),
      evidence({
        providerDivisionId: 30,
        startAt: new Date("2026-11-25T14:00:00.000Z"),
        isCompleted: false,
        isUpcoming: true,
        providerRoundNbr: 11,
      }),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(30);
  });

  it("CASE T4 — two current matches in new division beat historical volume", () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 30,
          startAt: new Date(`2026-07-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
      evidence({
        providerDivisionId: 40,
        startAt: new Date("2026-10-28T14:00:00.000Z"),
        providerRoundNbr: 1,
      }),
      evidence({
        providerDivisionId: 40,
        startAt: new Date("2026-11-02T14:00:00.000Z"),
        providerRoundNbr: 2,
      }),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(40);
  });

  it("CASE D legacy — ignores other leagues when providerLeagueId is set", () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, index) =>
        evidence({
          providerDivisionId: 30,
          startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        evidence({
          providerLeagueId: 99999,
          providerDivisionId: 1,
          startAt: new Date(`2026-11-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
          providerRoundNbr: index + 1,
        }),
      ),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(30);
  });
});

describe("countStandingsCountingMatchesForCompetitionTuple", () => {
  const tuple = {
    providerLeagueId: 13029,
    providerDivisionId: 0,
    providerGroupId: null,
  };

  it("CASE A — counts two completed matches with the same round when externalMatchId differs", () => {
    const tuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    const matches = [
      evidence({
        providerDivisionId: 30,
        providerRoundNbr: 1,
        externalMatchId: 9001,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
      evidence({
        providerDivisionId: 30,
        providerRoundNbr: 1,
        externalMatchId: 9002,
        startAt: new Date("2026-09-08T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(2);
  });

  it("CASE B — counts all six identities when rounds 1–3 each appear twice", () => {
    const tuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    const matches = [1, 2, 3].flatMap((round, roundIndex) =>
      [0, 1].map((dup) =>
        evidence({
          providerDivisionId: 30,
          providerRoundNbr: round,
          externalMatchId: 8000 + roundIndex * 10 + dup,
          startAt: new Date(
            `2026-09-${String(roundIndex * 2 + dup + 1).padStart(2, "0")}T14:00:00.000Z`,
          ),
        }),
      ),
    );

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(6);
  });

  it("CASE C — deduplicates the same externalMatchId only once", () => {
    const tuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    const matches = [
      evidence({
        providerDivisionId: 30,
        providerRoundNbr: 1,
        externalMatchId: 7001,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
      evidence({
        providerDivisionId: 30,
        providerRoundNbr: 2,
        externalMatchId: 7001,
        startAt: new Date("2026-09-08T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(1);
  });

  it("CASE D — excludes round 0 preparation fixtures", () => {
    const tuple = {
      providerLeagueId: 13029,
      providerDivisionId: 0,
      providerGroupId: null,
    };
    const matches = [
      evidence({
        providerLeagueId: 13029,
        providerDivisionId: 0,
        providerRoundNbr: 0,
        externalMatchId: 6001,
        startAt: new Date("2026-07-24T14:00:00.000Z"),
      }),
      evidence({
        providerLeagueId: 13029,
        providerDivisionId: 0,
        providerRoundNbr: 1,
        externalMatchId: 6002,
        startAt: new Date("2026-08-21T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(1);
  });

  it("CASE E — excludes other leagues", () => {
    const tuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    const matches = [
      evidence({
        providerLeagueId: 99999,
        providerDivisionId: 30,
        providerRoundNbr: 1,
        externalMatchId: 5001,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
      evidence({
        providerLeagueId: 15208,
        providerDivisionId: 30,
        providerRoundNbr: 1,
        externalMatchId: 5002,
        startAt: new Date("2026-09-08T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(1);
  });

  it("CASE F — excludes other divisions", () => {
    const tuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    const matches = [
      evidence({
        providerDivisionId: 0,
        providerRoundNbr: 1,
        externalMatchId: 4001,
        startAt: new Date("2026-09-01T14:00:00.000Z"),
      }),
      evidence({
        providerDivisionId: 30,
        providerRoundNbr: 1,
        externalMatchId: 4002,
        startAt: new Date("2026-09-08T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(1);
  });

  it("CASE G — excludes future kickoffs marked completed until startAt <= now", () => {
    const tuple = {
      providerLeagueId: 13029,
      providerDivisionId: 0,
      providerGroupId: null,
    };
    const matches = [
      evidence({
        providerLeagueId: 13029,
        providerDivisionId: 0,
        providerRoundNbr: 10,
        externalMatchId: 3001,
        startAt: new Date("2026-11-04T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(0);
  });

  it("CASE F legacy — reproduces 31925 schedule evidence with match-identity counting", () => {
    const officialKickoffs = [
      { round: 1, startAt: "2026-08-21T14:00:00.000Z" },
      { round: 2, startAt: "2026-08-15T14:00:00.000Z" },
      { round: 2, startAt: "2026-08-30T14:00:00.000Z" },
      { round: 3, startAt: "2026-09-05T14:00:00.000Z" },
      { round: 4, startAt: "2026-09-13T14:00:00.000Z" },
      { round: 5, startAt: "2026-09-19T14:00:00.000Z" },
      { round: 6, startAt: "2026-09-23T14:00:00.000Z" },
      { round: 7, startAt: "2026-09-26T14:00:00.000Z" },
      { round: 8, startAt: "2026-10-04T14:00:00.000Z" },
      { round: 9, startAt: "2026-10-10T14:00:00.000Z" },
      { round: 11, startAt: "2026-10-25T14:00:00.000Z" },
      { round: 12, startAt: "2026-10-31T14:00:00.000Z" },
      { round: 10, startAt: "2026-11-04T14:00:00.000Z" },
      { round: 13, startAt: "2026-11-08T14:00:00.000Z" },
    ] as const;

    let matchId = 31_925_000;
    const matches: StandingsScheduleMatchEvidence[] = [
      ...([0, 0, 0] as const).map((round, index) => {
        matchId += 1;
        return evidence({
          providerLeagueId: 13029,
          providerDivisionId: 0,
          providerRoundNbr: round,
          externalMatchId: matchId,
          startAt: new Date(`2026-07-${24 + index * 2}T14:00:00.000Z`),
        });
      }),
      ...officialKickoffs.map(({ round, startAt }) => {
        matchId += 1;
        return evidence({
          providerLeagueId: 13029,
          providerDivisionId: 0,
          providerRoundNbr: round,
          externalMatchId: matchId,
          startAt: new Date(startAt),
        });
      }),
    ];

    const counted = countStandingsCountingMatchesForCompetitionTuple(
      matches,
      tuple,
      { now: NOW },
    );

    // Two distinct round-2 fixtures both count; future rounds 10/13 excluded.
    expect(counted).toBe(12);
  });

  it("CASE G — detects stale when standings-counting rounds exceed played", () => {
    const matches = Array.from({ length: 10 }, (_, index) =>
      evidence({
        providerLeagueId: 10,
        providerDivisionId: 20,
        providerRoundNbr: index + 1,
        startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
      }),
    );

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, {
        providerLeagueId: 10,
        providerDivisionId: 20,
        providerGroupId: null,
      }),
    ).toBe(10);
  });

  it("CASE H — Junioren A: ten provider match identities vs standings played 7", () => {
    const tuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    let matchId = 31_928_000;
    const matches = [
      ...Array.from({ length: 7 }, (_, index) => {
        matchId += 1;
        return evidence({
          providerLeagueId: 15208,
          providerDivisionId: 30,
          providerRoundNbr: index + 1,
          externalMatchId: matchId,
          startAt: new Date(`2026-08-${17 + index}T14:00:00.000Z`),
        });
      }),
      ...([3, 5, 7] as const).map((round) => {
        matchId += 1;
        return evidence({
          providerLeagueId: 15208,
          providerDivisionId: 30,
          providerRoundNbr: round,
          externalMatchId: matchId,
          startAt: new Date("2026-10-18T14:00:00.000Z"),
        });
      }),
    ];

    const completedRelevantMatches =
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      });

    expect(completedRelevantMatches).toBe(10);

    const stale = evaluateStandingsStaleVsSchedule({
      externalTeamId: 31_928,
      standingsTable: {
        competition: { name: "League", divisionName: null, groupName: null },
        rows: [
          {
            position: 1,
            externalTeamId: 31_928,
            teamName: "Team",
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
      completedRelevantMatches,
      hasScheduleEvidence: true,
    });

    expect(stale).toEqual({ isStale: true, standingsPlayed: 7 });
  });

  it("CASE I — B1 control: eleven distinct matches align with standings played 11", () => {
    const tuple = {
      providerLeagueId: 15308,
      providerDivisionId: 30,
      providerGroupId: null,
    };
    let matchId = 31_930_000;
    const matches = Array.from({ length: 11 }, (_, index) => {
      matchId += 1;
      return evidence({
        providerLeagueId: 15308,
        providerDivisionId: 30,
        providerRoundNbr: index + 1,
        externalMatchId: matchId,
        startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
      });
    });

    const completedRelevantMatches =
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      });

    expect(completedRelevantMatches).toBe(11);

    const stale = evaluateStandingsStaleVsSchedule({
      externalTeamId: 31_930,
      standingsTable: {
        competition: { name: "League", divisionName: null, groupName: null },
        rows: [
          {
            position: 1,
            externalTeamId: 31_930,
            teamName: "Team",
            shortName: null,
            played: 11,
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
      completedRelevantMatches,
      hasScheduleEvidence: true,
    });

    expect(stale.isStale).toBe(false);
  });

  it("ignores future completed kickoffs when counting", () => {
    const matches = [
      evidence({
        providerLeagueId: 13029,
        providerDivisionId: 0,
        providerRoundNbr: 10,
        startAt: new Date("2026-11-04T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(matches, tuple, {
        now: NOW,
      }),
    ).toBe(0);
  });

  it("counts distinct provider match identities for countMatchEvidenceForCompetitionTuple", () => {
    const matches = Array.from({ length: 10 }, (_, index) =>
      evidence({
        providerLeagueId: 15208,
        providerDivisionId: 30,
        providerRoundNbr: index + 1,
        startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
      }),
    );

    expect(
      countMatchEvidenceForCompetitionTuple(
        matches,
        {
          providerLeagueId: 15208,
          providerDivisionId: 30,
          providerGroupId: null,
        },
        true,
      ),
    ).toBe(10);
  });
});
