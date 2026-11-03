import { describe, expect, it } from "vitest";

import {
  countMatchEvidenceForCompetitionTuple,
  countStandingsCountingMatchesForCompetitionTuple,
  deriveCurrentCompetitionTupleFromMatchEvidence,
} from "../standings-competition-identity";
import type { StandingsScheduleMatchEvidence } from "../standings-competition-identity";

const NOW = new Date("2026-11-03T12:00:00.000Z");

function evidence(
  partial: Partial<StandingsScheduleMatchEvidence> & {
    providerDivisionId: number;
    startAt: Date;
  },
): StandingsScheduleMatchEvidence {
  return {
    providerLeagueId: 15208,
    providerDivisionId: partial.providerDivisionId,
    providerRoundNbr: partial.providerRoundNbr ?? 1,
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

  it("CASE F — reproduces 31925 schedule vs standings using round semantics", () => {
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
          startAt: new Date(`2026-07-${24 + index * 2}T14:00:00.000Z`),
        }),
      ),
      ...officialKickoffs.map(({ round, startAt }) =>
        evidence({
          providerLeagueId: 13029,
          providerDivisionId: 0,
          providerRoundNbr: round,
          startAt: new Date(startAt),
        }),
      ),
    ];

    const counted = countStandingsCountingMatchesForCompetitionTuple(
      matches,
      tuple,
      { now: NOW },
    );

    expect(counted).toBe(11);
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

  it("CASE H — equals played when rescheduled duplicates share rounds", () => {
    const matches = [
      ...Array.from({ length: 7 }, (_, index) =>
        evidence({
          providerLeagueId: 15208,
          providerDivisionId: 30,
          providerRoundNbr: index + 1,
          startAt: new Date(`2026-08-${17 + index}T14:00:00.000Z`),
        }),
      ),
      evidence({
        providerLeagueId: 15208,
        providerDivisionId: 30,
        providerRoundNbr: 3,
        startAt: new Date("2026-10-18T14:00:00.000Z"),
      }),
      evidence({
        providerLeagueId: 15208,
        providerDivisionId: 30,
        providerRoundNbr: 5,
        startAt: new Date("2026-10-28T14:00:00.000Z"),
      }),
      evidence({
        providerLeagueId: 15208,
        providerDivisionId: 30,
        providerRoundNbr: 7,
        startAt: new Date("2026-11-02T14:00:00.000Z"),
      }),
    ];

    expect(
      countStandingsCountingMatchesForCompetitionTuple(
        matches,
        {
          providerLeagueId: 15208,
          providerDivisionId: 30,
          providerGroupId: null,
        },
        { now: NOW },
      ),
    ).toBe(7);
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

  it("counts distinct rounds for legacy countMatchEvidenceForCompetitionTuple API", () => {
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
