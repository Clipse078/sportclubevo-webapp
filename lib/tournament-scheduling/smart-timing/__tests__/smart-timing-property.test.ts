import { describe, expect, it } from "vitest";
import { assessTournamentTiming, computeEffectivePlayableCapacityMinutes } from "../assess";
import { normalizeTimingConfig } from "../prepare-context";
import { BASE_MS, baseInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("Smart Timing — monotonicity properties", () => {
  const fixtures = sequentialFixtures(8);

  it("adding an available pitch does not reduce structural capacity", () => {
    const config = normalizeTimingConfig({ matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 });
    const one = computeEffectivePlayableCapacityMinutes(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentPitches: [tournamentPitch("p1", 0)],
        tournamentWindow: windowFromClock(0, 120),
      }),
      config,
    );
    const two = computeEffectivePlayableCapacityMinutes(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentPitches: [tournamentPitch("p1", 0), tournamentPitch("p2", 1)],
        tournamentWindow: windowFromClock(0, 120),
      }),
      config,
    );
    expect(two).toBeGreaterThanOrEqual(one);
  });

  it("lengthening tournament window does not reduce capacity", () => {
    const config = normalizeTimingConfig({ matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 });
    const short = computeEffectivePlayableCapacityMinutes(
      baseInput({ mode: "FORWARD", fixtures, tournamentWindow: windowFromClock(0, 120) }),
      config,
    );
    const long = computeEffectivePlayableCapacityMinutes(
      baseInput({ mode: "FORWARD", fixtures, tournamentWindow: windowFromClock(0, 240) }),
      config,
    );
    expect(long).toBeGreaterThanOrEqual(short);
  });

  it("adding a break does not increase capacity", () => {
    const config = normalizeTimingConfig({ matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 });
    const base = baseInput({ mode: "FORWARD", fixtures, tournamentWindow: windowFromClock(0, 240) });
    const without = computeEffectivePlayableCapacityMinutes(base, config);
    const withBreak = computeEffectivePlayableCapacityMinutes(
      {
        ...base,
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 60 * 60_000,
            endUtcMs: BASE_MS + 90 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      },
      config,
    );
    expect(withBreak).toBeLessThanOrEqual(without);
  });

  it("increasing match duration does not increase required span for serial pitch", () => {
    const short = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures: sequentialFixtures(4),
        config: { matchDurationMinutes: 10, transitionMinutes: 3, minRestMinutes: 0 },
        endBoundaryKnown: false,
      }),
    );
    const long = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures: sequentialFixtures(4),
        config: { matchDurationMinutes: 14, transitionMinutes: 3, minRestMinutes: 0 },
        endBoundaryKnown: false,
      }),
    );
    expect(long.requiredSpanMinutes).toBeGreaterThanOrEqual(short.requiredSpanMinutes);
  });

  it("deterministic assessments", () => {
    const input = baseInput({
      mode: "BACKWARD",
      fixtures: sequentialFixtures(8),
      tournamentWindow: windowFromClock(0, 120),
    });
    const a = assessTournamentTiming(input);
    const b = assessTournamentTiming(input);
    expect(a).toEqual(b);
  });
});
