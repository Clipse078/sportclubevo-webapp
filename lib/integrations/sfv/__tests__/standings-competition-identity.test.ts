import { describe, expect, it } from "vitest";

import {
  countMatchEvidenceForCompetitionTuple,
  deriveDominantCompetitionTupleFromMatchEvidence,
} from "../standings-competition-identity";

describe("deriveDominantCompetitionTupleFromMatchEvidence", () => {
  it("CASE B — selects division with strongest completed match evidence", () => {
    const matches = [
      ...Array.from({ length: 10 }, () => ({
        providerLeagueId: 15208,
        providerDivisionId: 30,
      })),
      {
        providerLeagueId: 15208,
        providerDivisionId: 0,
      },
    ];

    const tuple = deriveDominantCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple).toEqual({
      providerLeagueId: 15208,
      providerDivisionId: 30,
      providerGroupId: null,
    });
  });

  it("CASE D — ignores other leagues when providerLeagueId is set", () => {
    const matches = [
      ...Array.from({ length: 10 }, () => ({
        providerLeagueId: 15208,
        providerDivisionId: 30,
      })),
      ...Array.from({ length: 5 }, () => ({
        providerLeagueId: 99999,
        providerDivisionId: 1,
      })),
    ];

    const tuple = deriveDominantCompetitionTupleFromMatchEvidence(matches, {
      providerLeagueId: 15208,
    });

    expect(tuple?.providerDivisionId).toBe(30);
    expect(
      countMatchEvidenceForCompetitionTuple(matches, tuple!, true),
    ).toBe(10);
  });
});
