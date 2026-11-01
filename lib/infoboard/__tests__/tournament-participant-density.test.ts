import { describe, expect, it } from "vitest";
import {
  TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
  resolveTournamentParticipantDensity,
  resolveTournamentParticipantGrid,
  tournamentParticipantDisplayRows,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";

describe("tournament participant density (R7 max-four grid)", () => {
  it("fixes max participants per row at four", () => {
    expect(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW).toBe(4);
  });

  it.each([
    [1, "large", 1, 1, [1]],
    [2, "large", 2, 1, [2]],
    [3, "large", 3, 1, [3]],
    [4, "medium", 4, 1, [4]],
    [5, "compact", 4, 2, [4, 1]],
    [6, "compact", 4, 2, [4, 2]],
    [7, "compact", 4, 2, [4, 3]],
    [8, "compact", 4, 2, [4, 4]],
  ] as const)(
    "%i participants → density %s, %i columns, %i rows, pattern %j",
    (count, density, columns, rows, pattern) => {
      expect(resolveTournamentParticipantDensity(count)).toBe(density);
      expect(resolveTournamentParticipantGrid(count)).toEqual({ columns, rows });
      expect(tournamentParticipantDisplayRows(count)).toBe(rows);
      expect(tournamentParticipantRowPattern(count)).toEqual(pattern);
    },
  );
});
