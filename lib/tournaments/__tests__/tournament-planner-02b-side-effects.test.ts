import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("02B — PlayingFormat metadata does not mutate schedule", () => {
  it("planung pitch PATCH reloads view model without live schedule reconcile", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/tournaments/[tournamentId]/planung/pitches/[pitchId]/route.ts"),
      "utf8",
    );
    expect(route).toContain("loadTournamentPlanungViewModel");
    expect(route).not.toContain("applyPlanungLiveScheduleReconcile");
    expect(route).not.toContain("regenerate");
  });
});
