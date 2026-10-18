/**
 * SCE-TOURNAMENT-PLANNER-01M — scale + integrity scenarios (deterministic, bounded).
 */

import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "@/lib/tournament-scheduling/feasibility";
import {
  canonicalizeParticipantIds,
  generateRoundRobinFixtures,
  generateSmartMixFixtures,
  validateRoundRobinInvariants,
} from "@/lib/tournament-scheduling/fixtures";
import { generateKnockoutBracketPure } from "@/lib/tournament-scheduling/knockout-bracket/knockout-bracket-pure";
import { optimiseTournamentSchedule } from "@/lib/tournament-scheduling/schedule-optimiser/optimise";
import {
  optimiserInput,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "@/lib/tournament-scheduling/schedule-optimiser/__tests__/helpers";

const BASE_MS = Date.UTC(2026, 7, 1, 8, 0, 0);

function participantIds(count: number): string[] {
  return canonicalizeParticipantIds(
    Array.from({ length: count }, (_, i) => ({
      id: `team-${String(i).padStart(3, "0")}`,
      displayOrder: i,
    })),
  );
}

function smartMixFixtures(count: number, targetMatches: number) {
  const ids = participantIds(count);
  const generated = generateSmartMixFixtures({
    participantIds: ids,
    config: { targetMatchesPerParticipant: targetMatches, homeAwayRelevance: "OFF" },
  });
  const fixtures = generated.map((f, index) => ({
    ...f,
    fixtureId: `fx-${count}-${targetMatches}-${index}`,
  }));
  return { ids, fixtures };
}

function roundRobinFixtures(count: number) {
  const ids = participantIds(count);
  const generated = generateRoundRobinFixtures({
    participantIds: ids,
    config: { format: "ROUND_ROBIN", meetingsPerOpponent: 1, homeAwayRelevance: "OFF" },
  });
  validateRoundRobinInvariants(ids, generated, { meetingsPerOpponent: 1 });
  const fixtures = generated.map((f, index) => ({
    ...f,
    fixtureId: `rr-${count}-${index}`,
  }));
  return { ids, fixtures };
}

function feasibilityWindowMinutes(minutes: number) {
  return { startUtcMs: BASE_MS, endUtcMs: BASE_MS + minutes * 60_000 };
}

describe("01M scale — fixture generation (no participant ceiling)", () => {
  it.each([
    [4, 1],
    [8, 1],
    [12, 3],
    [16, 1],
    [24, 4],
    [32, 4],
  ] as const)("Smart Mix: %i participants × %i matches each", (n, target) => {
    const { ids, fixtures } = smartMixFixtures(n, target);
    expect(ids).toHaveLength(n);
    expect(new Set(fixtures.map((f) => f.fixtureId)).size).toBe(fixtures.length);
    for (const f of fixtures) {
      expect(f.sideAParticipantId).not.toBe(f.sideBParticipantId);
      expect(ids).toContain(f.sideAParticipantId);
      expect(ids).toContain(f.sideBParticipantId);
    }
    const elapsed = performance.now();
    expect(elapsed).toBeLessThan(30_000);
  });

  it.each([4, 8, 12, 16] as const)("Round Robin: %i participants", (n) => {
    const { fixtures } = roundRobinFixtures(n);
    expect(fixtures.length).toBe((n * (n - 1)) / 2);
  });

  it("Knockout: 64 entrants (larger scenario, bounded fixture count)", () => {
    const entrants = participantIds(64).map((participantId) => ({
      kind: "CONCRETE_PARTICIPANT" as const,
      participantId,
    }));
    const result = generateKnockoutBracketPure({ stageKey: "KO", entrants });
    expect(result.fixtures.length).toBe(63);
    expect(
      new Set(result.fixtures.map((f) => `${f.roundIndex}:${f.slotIndexInRound}`)).size,
    ).toBe(63);
  });
});

describe("01M scale — feasibility must not reject tournaments for participant count alone", () => {
  it("24 participants Smart Mix is not INFEASIBLE solely due to legacy 16-participant guard", () => {
    const { ids, fixtures } = smartMixFixtures(24, 4);
    const result = analyseTournamentFeasibility({
      tournamentWindow: feasibilityWindowMinutes(24 * 60),
      config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 0 },
      participants: ids.map((participantId) => ({ participantId })),
      tournamentPitches: Array.from({ length: 12 }, (_, i) => tournamentPitch(`p${i}`, i)),
      fixtures: fixtures.map((f) => ({
        fixtureId: f.fixtureId,
        stageKey: f.stageKey,
        roundIndex: f.roundIndex,
        slotIndexInRound: f.slotIndexInRound,
        sideAParticipantId: f.sideAParticipantId,
        sideBParticipantId: f.sideBParticipantId,
      })),
      breaks: [],
    });
    expect(result.status).not.toBe("INFEASIBLE");
    expect(result.diagnostics.some((d) => d.code === "ANALYSIS.COMPLETE_SEARCH_BOUNDARY")).toBe(
      false,
    );
    expect(["FEASIBLE", "TIGHT", "UNRESOLVED"]).toContain(result.status);
  });
});

describe("01M scale — optimiser bounded path for medium tournaments", () => {
  it("32 sequential fixtures completes within generous budget (bounded improvement path)", () => {
    const fixtures = sequentialFixtures(32);
    const pitches = Array.from({ length: 4 }, (_, i) => tournamentPitch(`pitch-${i}`, i));
    const input = optimiserInput({
      fixtures,
      tournamentPitches: pitches,
      config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 5 },
      tournamentWindow: windowFromClock(0, Math.max(1200, 32 * 18)),
    });
    const started = performance.now();
    const result = optimiseTournamentSchedule(input);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(120_000);
    expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(result.status);
    expect(result.assignments).toHaveLength(fixtures.length);
    expect(new Set(result.assignments.map((a) => a.fixtureId)).size).toBe(fixtures.length);
    expect(result.hardConstraintValidationOk).toBe(true);
  }, 120_000);
});
