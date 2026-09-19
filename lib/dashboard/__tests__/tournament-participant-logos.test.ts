import { describe, expect, it } from "vitest";
import {
  MAX_VISIBLE_TOURNAMENT_LOGOS,
  sliceTournamentParticipantLogos,
} from "@/lib/dashboard/tournament-participant-logos";

function participants(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    displayName: `Team ${index + 1}`,
    logoUrl: null as string | null,
  }));
}

describe("tournament participant logo slicing", () => {
  it("uses a max visible cap of 16", () => {
    expect(MAX_VISIBLE_TOURNAMENT_LOGOS).toBe(16);
  });

  it.each([
    [1, 1, 0],
    [4, 4, 0],
    [7, 7, 0],
    [10, 10, 0],
    [16, 16, 0],
    [17, 16, 1],
    [20, 16, 4],
  ] as const)("participants=%i → visible=%i overflow=%i", (total, visible, overflow) => {
    const { visible: rows, overflowCount } = sliceTournamentParticipantLogos(
      participants(total),
    );
    expect(rows).toHaveLength(visible);
    expect(overflowCount).toBe(overflow);
  });

  it("counts participants without logo files toward visible slots", () => {
    const rows = participants(7).map((row) => ({ ...row, logoUrl: null }));
    const { visible, overflowCount } = sliceTournamentParticipantLogos(rows);
    expect(visible).toHaveLength(7);
    expect(overflowCount).toBe(0);
  });
});
