import { describe, expect, it } from "vitest";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";

function baseSnapshot(
  ownership: PlanungDomainSnapshot["ownership"],
): PlanungDomainSnapshot {
  return {
    tournamentId: "t1",
    ownership,
    timezone: "Europe/Zurich",
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T18:00:00.000Z",
    scheduleVersionId: null,
    scheduleRevision: null,
    schedulingConfig: {
      matchDurationMinutes: 20,
      transitionMinutes: 5,
      minRestMinutes: 10,
    },
    pitches: [{ id: "p1", displayOrder: 0, label: "Feld 1" }],
    breaks: [],
    fixtures: [],
    assignments: [],
    participants: [],
    participantCount: 4,
    fixtureCount: 0,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
  };
}

describe("01H — planner ownership presentation", () => {
  it("tenant-organised tournament → Planung available", () => {
    const vm = buildTournamentPlanungViewModel(baseSnapshot("TENANT_ORGANISED"));
    expect(vm.availability).toBe("AVAILABLE");
  });

  it("explicit AWAY → editable Planung unavailable", () => {
    const vm = buildTournamentPlanungViewModel(baseSnapshot("EXTERNALLY_ORGANISED"));
    expect(vm.availability).toBe("UNAVAILABLE_EXTERNALLY_ORGANISED");
  });

  it("unknown ownership → unavailable (fail closed)", () => {
    const vm = buildTournamentPlanungViewModel(baseSnapshot("UNKNOWN"));
    expect(vm.availability).toBe("UNAVAILABLE_UNKNOWN_OWNERSHIP");
  });
});
