/**
 * SCE-TOURNAMENT-PLANNER-01I — pure manual assignment validation.
 */

import { describe, expect, it } from "vitest";
import { validateTournamentManualAssignment } from "../validate-tournament-manual-assignment";
import { scheduleAssignmentFromStart } from "../assignment-intervals";
import type { TournamentManualAssignmentValidationContext } from "../types";
import type { FeasibilityFixtureRef } from "../../feasibility/types";

const CONFIG = { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 5 };
const WINDOW = { startUtcMs: 0, endUtcMs: 7200_000 };
const PITCH_A = "pitch-a";
const PITCH_B = "pitch-b";
const PITCH_FOREIGN = "pitch-foreign";

function fixture(id: string, a: string, b: string): FeasibilityFixtureRef {
  return {
    fixtureId: id,
    stageKey: "MAIN",
    roundIndex: 0,
    slotIndexInRound: 0,
    sideAParticipantId: a,
    sideBParticipantId: b,
  };
}

function baseCtx(
  overrides: Partial<TournamentManualAssignmentValidationContext> = {},
): TournamentManualAssignmentValidationContext {
  const t0 = 3_600_000;
  const t1 = t0 + (CONFIG.matchDurationMinutes + CONFIG.transitionMinutes) * 60_000;
  return {
    tournamentWindow: WINDOW,
    config: CONFIG,
    fixtures: [fixture("f1", "p1", "p2"), fixture("f2", "p3", "p4")],
    assignments: [
      scheduleAssignmentFromStart({
        fixtureId: "f1",
        tournamentPitchId: PITCH_A,
        startUtcMs: t0,
        config: CONFIG,
      }),
      scheduleAssignmentFromStart({
        fixtureId: "f2",
        tournamentPitchId: PITCH_B,
        startUtcMs: t1,
        config: CONFIG,
      }),
    ],
    pitches: [
      { tournamentPitchId: PITCH_A, displayOrder: 0, label: "Feld 1", playableIntervals: [] },
      { tournamentPitchId: PITCH_B, displayOrder: 1, label: "Feld 2", playableIntervals: [] },
    ],
    breaks: [],
    dependencies: new Map(),
    movingFixtureId: "f1",
    targetTournamentPitchId: PITCH_B,
    targetStartUtcMs: t0,
    lockDimension: null,
    participantDisplayNames: new Map([
      ["p1", "FC Allschwil F1"],
      ["p2", "FC Allschwil F2"],
    ]),
    ...overrides,
  };
}

describe("01I validateTournamentManualAssignment", () => {
  it("A — valid pitch-only move", () => {
    const ctx = baseCtx({ targetTournamentPitchId: PITCH_B, targetStartUtcMs: 3_600_000 });
    expect(validateTournamentManualAssignment(ctx).ok).toBe(true);
  });

  it("B — valid time-only move", () => {
    const ctx = baseCtx({
      targetTournamentPitchId: PITCH_A,
      targetStartUtcMs: 3_600_000 + (CONFIG.matchDurationMinutes + CONFIG.transitionMinutes) * 60_000,
    });
    expect(validateTournamentManualAssignment(ctx).ok).toBe(true);
  });

  it("C — valid time+pitch move", () => {
    const slotMs = (CONFIG.matchDurationMinutes + CONFIG.transitionMinutes) * 60_000;
    const ctx = baseCtx({
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: 3_600_000 + slotMs * 2,
    });
    expect(validateTournamentManualAssignment(ctx).ok).toBe(true);
  });

  it("D — pitch overlap rejected", () => {
    const ctx = baseCtx({
      movingFixtureId: "f1",
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: baseCtx().assignments[1]!.startUtcMs,
    });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("PITCH_OVERLAP");
    }
  });

  it("E — participant overlap rejected", () => {
    const ctx = baseCtx({
      config: { ...CONFIG, minRestMinutes: 0 },
      movingFixtureId: "f1",
      targetTournamentPitchId: PITCH_A,
      targetStartUtcMs: baseCtx().assignments[1]!.startUtcMs,
      assignments: [
        scheduleAssignmentFromStart({
          fixtureId: "f1",
          tournamentPitchId: PITCH_A,
          startUtcMs: 3_600_000,
          config: CONFIG,
        }),
        scheduleAssignmentFromStart({
          fixtureId: "f2",
          tournamentPitchId: PITCH_A,
          startUtcMs: 3_600_000 + 12 * 60_000,
          config: CONFIG,
        }),
      ],
      fixtures: [fixture("f1", "p1", "p2"), fixture("f2", "p1", "p5")],
    });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("PARTICIPANT_OVERLAP");
    }
  });

  it("F — minimum rest rejected when configured", () => {
    const start = 3_600_000;
    const ctx = baseCtx({
      config: { ...CONFIG, minRestMinutes: 30 },
      assignments: [
        scheduleAssignmentFromStart({
          fixtureId: "f1",
          tournamentPitchId: PITCH_A,
          startUtcMs: start,
          config: CONFIG,
        }),
        scheduleAssignmentFromStart({
          fixtureId: "f2",
          tournamentPitchId: PITCH_B,
          startUtcMs: start + 12 * 60_000,
          config: CONFIG,
        }),
      ],
      fixtures: [fixture("f1", "p1", "p2"), fixture("f2", "p1", "p4")],
      movingFixtureId: "f2",
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: start + 14 * 60_000,
    });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("MINIMUM_REST");
    }
  });

  it("G — break conflict rejected", () => {
    const start = 3_600_000;
    const ctx = baseCtx({
      breaks: [
        {
          breakId: "b1",
          startUtcMs: start,
          endUtcMs: start + 30 * 60_000,
          scope: "SELECTED_PITCHES",
          tournamentPitchIds: [PITCH_B],
        },
      ],
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: start,
    });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("BREAK_CONFLICT");
    }
  });

  it("H — outside window rejected", () => {
    const ctx = baseCtx({ targetStartUtcMs: WINDOW.endUtcMs + 1000 });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("OUTSIDE_TOURNAMENT_WINDOW");
    }
  });

  it("I — invalid tournament pitch rejected", () => {
    const ctx = baseCtx({ targetTournamentPitchId: PITCH_FOREIGN });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("INVALID_TOURNAMENT_PITCH");
    }
  });

  it("J — qualification dependency rejected", () => {
    const start = 3_600_000;
    const deps = new Map([
      ["f2", [{ kind: "AFTER_FIXTURE_COMPLETE" as const, sourceFixtureId: "f1" }]],
    ]);
    const ctx = baseCtx({
      dependencies: deps,
      movingFixtureId: "f2",
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: start,
    });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("QUALIFICATION_DEPENDENCY");
    }
  });

  it("K — TIME lock rejects time move but allows pitch move", () => {
    const start = 3_600_000;
    const ctxTime = baseCtx({
      lockDimension: "TIME",
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: start + 20 * 60_000,
    });
    expect(validateTournamentManualAssignment(ctxTime).ok).toBe(false);
    const ctxPitch = baseCtx({
      lockDimension: "TIME",
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: start,
    });
    expect(validateTournamentManualAssignment(ctxPitch).ok).toBe(true);
  });

  it("L — PITCH lock rejects pitch move but allows time move", () => {
    const start = 3_600_000;
    const ctxPitch = baseCtx({
      lockDimension: "PITCH",
      targetTournamentPitchId: PITCH_B,
      targetStartUtcMs: start,
    });
    expect(validateTournamentManualAssignment(ctxPitch).ok).toBe(false);
    const ctxTime = baseCtx({
      lockDimension: "PITCH",
      targetTournamentPitchId: PITCH_A,
      targetStartUtcMs: start + 20 * 60_000,
    });
    expect(validateTournamentManualAssignment(ctxTime).ok).toBe(true);
  });

  it("M — TIME_AND_PITCH rejects move", () => {
    const ctx = baseCtx({ lockDimension: "TIME_AND_PITCH" });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.category).toBe("SCHEDULE_LOCK_VIOLATION");
    }
  });

  it("V — end time derived canonically from match duration", () => {
    const ctx = baseCtx({ targetTournamentPitchId: PITCH_B, targetStartUtcMs: 3_600_000 });
    const result = validateTournamentManualAssignment(ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slot.endUtcMs - result.slot.startUtcMs).toBe(CONFIG.matchDurationMinutes * 60_000);
    }
  });

  it("W — deterministic identical validation result", () => {
    const ctx = baseCtx({ targetTournamentPitchId: PITCH_B, targetStartUtcMs: 3_600_000 });
    const a = validateTournamentManualAssignment(ctx);
    const b = validateTournamentManualAssignment(ctx);
    expect(a).toEqual(b);
  });
});
