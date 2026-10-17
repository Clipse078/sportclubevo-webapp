import { describe, expect, it } from "vitest";
import { optimiseTournamentSchedule } from "../optimise";
import { optimiserInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("01F2 — schedule monotonicity", () => {
  const fixtures = sequentialFixtures(4);
  const baseConfig = { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 10 };

  it("adding a pitch does not destroy feasibility", { timeout: 30_000 }, () => {
    const onePitch = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config: baseConfig,
        tournamentWindow: windowFromClock(0, 180),
      }),
    );
    const twoPitches = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: baseConfig,
        tournamentWindow: windowFromClock(0, 180),
      }),
    );
    if (onePitch.status === "OPTIMAL" || onePitch.status === "FEASIBLE_NOT_PROVEN_OPTIMAL") {
      expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(twoPitches.status);
    }
  });

  it("extending tournament window does not destroy feasibility", { timeout: 30_000 }, () => {
    const tight = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config: baseConfig,
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    const wide = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config: baseConfig,
        tournamentWindow: windowFromClock(0, 300),
      }),
    );
    if (tight.status === "OPTIMAL" || tight.status === "FEASIBLE_NOT_PROVEN_OPTIMAL") {
      expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(wide.status);
    }
  });

  it("relaxing minimum rest does not destroy resolved-participant feasibility", { timeout: 30_000 }, () => {
    const fixturesRest = sequentialFixtures(4, [
      ["p1", "p2"],
      ["p1", "p3"],
      ["p2", "p4"],
      ["p3", "p4"],
    ]);
    const strict = optimiseTournamentSchedule(
      optimiserInput({
        fixtures: fixturesRest,
        config: { ...baseConfig, minRestMinutes: 30 },
        tournamentWindow: windowFromClock(0, 300),
      }),
    );
    const relaxed = optimiseTournamentSchedule(
      optimiserInput({
        fixtures: fixturesRest,
        config: { ...baseConfig, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 300),
      }),
    );
    if (strict.status === "OPTIMAL" || strict.status === "FEASIBLE_NOT_PROVEN_OPTIMAL") {
      expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(relaxed.status);
    }
  });
});
