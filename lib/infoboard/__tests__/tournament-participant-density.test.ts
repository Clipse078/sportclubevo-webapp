import { describe, expect, it } from "vitest";
import {
  resolveTournamentParticipantDensity,
  resolveTournamentParticipantGrid,
  tournamentParticipantDisplayRows,
} from "@/lib/infoboard/tournament-participant-density";

describe("tournament participant density (R6)", () => {
  it.each([
    [2, "large", 2, 1],
    [3, "large", 3, 1],
    [4, "medium", 4, 1],
    [5, "compact", 3, 2],
    [6, "compact", 3, 2],
  ] as const)(
    "%i participants → density %s, %i columns, %i rows",
    (count, density, columns, rows) => {
      expect(resolveTournamentParticipantDensity(count)).toBe(density);
      expect(resolveTournamentParticipantGrid(count)).toEqual({ columns, rows });
      expect(tournamentParticipantDisplayRows(count)).toBe(rows);
    },
  );
});
