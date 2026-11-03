import { beforeEach, describe, expect, it } from "vitest";

import {
  countMatchEvidenceForCompetitionTuple,
  countStandingsCountingMatchesForCompetitionTuple,
  deriveCurrentCompetitionTupleFromMatchEvidence,
} from "../standings-competition-identity";
import type { StandingsScheduleMatchEvidence } from "../standings-competition-identity";
import { evaluateStandingsStaleVsSchedule } from "../standings-integrity";
import { evaluateStandingsScheduleEvidence } from "../standings-schedule-membership";

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
    externalMatchId: partial.externalMatchId ?? 100_000 + evidenceSeq,
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

  it("CASE ID-1 — same round, different externalMatchId counts twice", () => {
    const divisionTuple = {
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
      countStandingsCountingMatchesForCompetitionTuple(matches, divisionTuple, {
        now: NOW,
      }),
    ).toBe(2);
  });

  it("CASE ID-2 — same externalMatchId counts once", () => {
    const divisionTuple = {
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
      countStandingsCountingMatchesForCompetitionTuple(matches, divisionTuple, {
        now: NOW,
      }),
    ).toBe(1);
  });

  it("CASE F — 2. Mannschaft: eleven table matches with membership metadata", () => {
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

    const matches: StandingsScheduleMatchEvidence[] = [
      ...([0, 0, 0] as const).map((round, index) =>
        evidence({
          providerLeagueId: 13029,
          providerDivisionId: 0,
          providerRoundNbr: round,
          providerMatchType: 2,
          startAt: new Date(`2026-07-${24 + index * 2}T14:00:00.000Z`),
        }),
      ),
      ...officialKickoffs.map(({ round, startAt }) =>
        evidence({
          providerLeagueId: 13029,
          providerDivisionId: 0,
          providerRoundNbr: round,
          providerMatchType:
            startAt === "2026-08-15T14:00:00.000Z" ? 2 : 1,
          startAt: new Date(startAt),
        }),
      ),
    ];

    const evaluation = evaluateStandingsScheduleEvidence(matches, tuple, {
      now: NOW,
    });

    expect(evaluation.completedRelevantMatches).toBe(11);
    expect(evaluation.confidence).toBe("PARTIAL");
    expect(evaluation.nonAuthoritativeReason).toBe(
      "HEURISTIC_DOMINANT_MATCH_TYPE",
    );

    const stale = evaluateStandingsStaleVsSchedule({
      externalTeamId: 31_925,
      standingsTable: {
        competition: { name: "League", divisionName: null, groupName: null },
        rows: [
          {
            position: 9,
            externalTeamId: 31_925,
            teamName: "FC Allschwil 2",
            shortName: null,
            played: 11,
            won: 4,
            drawn: 2,
            lost: 5,
            goalsFor: 26,
            goalsAgainst: 27,
            points: 14,
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

  it("CASE H — Junioren A reused rounds with membership classification", () => {
    const divisionTuple = {
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: 2,
    };
    const matches = [
      ...Array.from({ length: 7 }, (_, index) =>
        evidence({
          providerLeagueId: 15208,
          providerDivisionId: 30,
          providerGroupId: 2,
          providerRoundNbr: index + 1,
          startAt: new Date(`2026-08-${17 + index}T14:00:00.000Z`),
        }),
      ),
      ...([1, 2, 3] as const).flatMap((round) =>
        [0, 1].map((dup) =>
          evidence({
            providerLeagueId: 15208,
            providerDivisionId: 30,
            providerGroupId: 2,
            providerRoundNbr: round,
            externalMatchId: 4_358_261 + round * 100 + dup,
            providerMatchType: 2,
            startAt: new Date(`2026-10-${10 + round + dup}T14:00:00.000Z`),
          }),
        ),
      ),
    ];

    const evaluation = evaluateStandingsScheduleEvidence(
      matches,
      divisionTuple,
      { now: NOW, authoritativeGroupId: 2 },
    );

    expect(evaluation.completedRelevantMatches).toBe(7);
    expect(evaluation.confidence).toBe("PARTIAL");
  });

  it("CASE I — B1 mapped league 15308 resists newer league 15303 activity", () => {
    const matches = [
      ...Array.from({ length: 11 }, (_, index) =>
        evidence({
          providerLeagueId: 15308,
          providerDivisionId: 30,
          providerRoundNbr: index + 1,
          startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
        }),
      ),
      evidence({
        providerLeagueId: 15303,
        providerDivisionId: 0,
        providerRoundNbr: 1,
        startAt: new Date("2026-11-01T14:00:00.000Z"),
      }),
      evidence({
        providerLeagueId: 15303,
        providerDivisionId: 0,
        providerRoundNbr: 2,
        startAt: new Date("2026-11-02T14:00:00.000Z"),
      }),
    ];

    const tuple = deriveCurrentCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15308,
    });

    expect(tuple?.providerLeagueId).toBe(15308);

    const evaluation = evaluateStandingsScheduleEvidence(
      matches,
      {
        providerLeagueId: 15308,
        providerDivisionId: 30,
        providerGroupId: null,
      },
      { now: NOW },
    );

    expect(evaluation.completedRelevantMatches).toBe(11);
  });

  it("CASE J — Frauen non-table fixture excluded via provider match type", () => {
    const divisionTuple = {
      providerLeagueId: 10,
      providerDivisionId: 20,
      providerGroupId: 30,
    };
    const matches = [
      ...Array.from({ length: 11 }, (_, index) =>
        evidence({
          providerLeagueId: 10,
          providerDivisionId: 20,
          providerGroupId: 30,
          providerRoundNbr: index + 1,
          startAt: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`),
        }),
      ),
      evidence({
        providerLeagueId: 10,
        providerDivisionId: 20,
        providerGroupId: 30,
        providerRoundNbr: 106,
        providerMatchType: 3,
        externalMatchId: 4403401,
        startAt: new Date("2026-10-15T14:00:00.000Z"),
      }),
    ];

    const evaluation = evaluateStandingsScheduleEvidence(
      matches,
      divisionTuple,
      { now: NOW, authoritativeGroupId: 30 },
    );

    expect(evaluation.completedRelevantMatches).toBe(11);
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
