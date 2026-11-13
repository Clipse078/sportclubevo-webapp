import { describe, expect, it } from "vitest";
import {
  resolveMatchScoreSideEmphasis,
  resolveNumericMatchScore,
  sceMatchScoreBoxClassName,
} from "../match-score-outcome-styling";

describe("SCE-MATCH-UX-01 — match score outcome styling", () => {
  it("resolves numeric scores only when both sides are finite", () => {
    expect(resolveNumericMatchScore(2, 1)).toEqual({ home: 2, away: 1 });
    expect(resolveNumericMatchScore(0, 0)).toEqual({ home: 0, away: 0 });
    expect(resolveNumericMatchScore(null, 1)).toBeNull();
    expect(resolveNumericMatchScore(Number.NaN, 1)).toBeNull();
  });

  it("marks draw sides as neutral", () => {
    const scores = resolveNumericMatchScore(1, 1)!;
    expect(resolveMatchScoreSideEmphasis(scores, "home")).toBe("neutral");
    expect(resolveMatchScoreSideEmphasis(scores, "away")).toBe("neutral");
  });

  it("emphasizes winner and de-emphasizes loser per home/away orientation", () => {
    const homeWin = resolveNumericMatchScore(3, 1)!;
    expect(resolveMatchScoreSideEmphasis(homeWin, "home")).toBe("winner");
    expect(resolveMatchScoreSideEmphasis(homeWin, "away")).toBe("loser");

    const awayWin = resolveNumericMatchScore(1, 4)!;
    expect(resolveMatchScoreSideEmphasis(awayWin, "home")).toBe("loser");
    expect(resolveMatchScoreSideEmphasis(awayWin, "away")).toBe("winner");
  });

  it("ships outcome tokens on score box classes", () => {
    expect(sceMatchScoreBoxClassName("winner")).toContain(
      "--sce-match-result-foreground-winner",
    );
    expect(sceMatchScoreBoxClassName("loser")).toContain(
      "--sce-match-result-foreground-loser",
    );
    expect(sceMatchScoreBoxClassName("neutral")).toContain("--sce-match-result-foreground)");
  });
});
