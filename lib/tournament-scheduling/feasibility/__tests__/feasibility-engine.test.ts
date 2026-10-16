import { describe, expect, it } from "vitest";
import {
  analyseTournamentFeasibility,
  FEASIBILITY_MAX_CANDIDATE_SLOTS,
  HARD_CONSTRAINT_CATALOGUE,
  TIGHT_CAPACITY_UTILISATION_THRESHOLD,
  type TournamentFeasibilityInput,
} from "@/lib/tournament-scheduling/feasibility";
import {
  canonicalizeParticipantIds,
  generateRoundRobinFixtures,
} from "@/lib/tournament-scheduling/fixtures";

const BASE_MS = Date.UTC(2026, 6, 1, 8, 0, 0);

function windowFromMinutes(start: number, end: number) {
  return {
    startUtcMs: BASE_MS + start * 60_000,
    endUtcMs: BASE_MS + end * 60_000,
  };
}

function resource(id: string, start = 0, end = 600) {
  return {
    resourceId: id,
    availabilityIntervals: [windowFromMinutes(start, end)],
  };
}

function defaultInput(
  partial: Partial<TournamentFeasibilityInput> & Pick<TournamentFeasibilityInput, "fixtures">,
): TournamentFeasibilityInput {
  const participantIds = new Set<string>();
  for (const f of partial.fixtures) {
    participantIds.add(f.sideAParticipantId);
    participantIds.add(f.sideBParticipantId);
  }
  return {
    tournamentWindow: windowFromMinutes(0, 600),
    config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 10 },
    participants: [...participantIds].map((participantId) => ({ participantId })),
    resources: [resource("pitch-a"), resource("pitch-b")],
    externalOccupancy: [],
    ...partial,
  };
}

describe("analyseTournamentFeasibility — matrix A–L", () => {
  it("A. simple feasible tournament", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ];
    const result = analyseTournamentFeasibility(defaultInput({ fixtures }));
    expect(result.status).toBe("FEASIBLE");
    expect(result.diagnostics).toHaveLength(0);
  });

  it("B. exact-capacity tournament is FEASIBLE or TIGHT", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ];
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        tournamentWindow: windowFromMinutes(0, 35),
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
        resources: [resource("pitch-a", 0, 35)],
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(result.status);
  });

  it("C. insufficient total pitch-minutes", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 1,
        sideAParticipantId: "p3",
        sideBParticipantId: "p4",
      },
    ];
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        resources: [resource("pitch-a", 0, 30)],
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
    expect(result.diagnostics.some((d) => d.code === "CAPACITY.PITCH_MINUTES_SHORT")).toBe(true);
  });

  it("D. insufficient tournament window (rest span)", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
      {
        fixtureId: "f3",
        stageKey: "MAIN",
        roundIndex: 2,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p4",
      },
    ];
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        participants: ["p1", "p2", "p3", "p4"].map((participantId) => ({ participantId })),
        tournamentWindow: windowFromMinutes(0, 200),
        config: { matchDurationMinutes: 30, transitionMinutes: 0, minRestMinutes: 60 },
        resources: [resource("pitch-a", 0, 200), resource("pitch-b", 0, 200)],
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
    expect(
      result.diagnostics.some(
        (d) =>
          d.code === "REST.CANNOT_SATISFY_MIN_REST" || d.code === "CAPACITY.WINDOW_TOO_SHORT",
      ),
    ).toBe(true);
  });

  it("E. insufficient rest despite enough aggregate pitch-minutes", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
      {
        fixtureId: "f3",
        stageKey: "MAIN",
        roundIndex: 2,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p4",
      },
    ];
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        participants: ["p1", "p2", "p3", "p4"].map((participantId) => ({ participantId })),
        tournamentWindow: windowFromMinutes(0, 500),
        config: { matchDurationMinutes: 30, transitionMinutes: 0, minRestMinutes: 240 },
        resources: [resource("pitch-a", 0, 500), resource("pitch-b", 0, 500)],
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
    expect(result.metrics.availablePitchMinutes).toBeGreaterThan(result.metrics.requiredMatchMinutes);
    expect(result.diagnostics.some((d) => d.code === "REST.CANNOT_SATISFY_MIN_REST")).toBe(true);
  });

  it("F. multiple pitches make previously impossible setup feasible", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 1,
        sideAParticipantId: "p3",
        sideBParticipantId: "p4",
      },
    ];
    const infeasibleOnePitch = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        resources: [resource("pitch-a", 0, 35)],
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      }),
    );
    expect(infeasibleOnePitch.status).toBe("INFEASIBLE");

    const feasibleTwoPitches = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        resources: [resource("pitch-a", 0, 35), resource("pitch-b", 0, 35)],
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(feasibleTwoPitches.status);
  });

  it("G. unavailable resource interval reduces capacity", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ];
    const blocked = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        resources: [resource("pitch-a", 0, 600)],
        externalOccupancy: [
          {
            resourceId: "pitch-a",
            startUtcMs: windowFromMinutes(0, 600).startUtcMs,
            endUtcMs: windowFromMinutes(600, 600).endUtcMs,
          },
        ],
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      }),
    );
    expect(blocked.status).toBe("INFEASIBLE");
  });

  it("H. odd-participant round robin", () => {
    const ids = canonicalizeParticipantIds([
      { id: "p1", displayOrder: 0 },
      { id: "p2", displayOrder: 1 },
      { id: "p3", displayOrder: 2 },
    ]);
    const generated = generateRoundRobinFixtures({
      participantIds: ids,
      config: { format: "ROUND_ROBIN", stageKey: "MAIN" },
    });
    const fixtures = generated.map((f, index) => ({
      fixtureId: `f${index}`,
      stageKey: f.stageKey,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideAParticipantId: f.sideAParticipantId,
      sideBParticipantId: f.sideBParticipantId,
    }));
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        participants: ids.map((participantId) => ({ participantId })),
        resources: [resource("pitch-a"), resource("pitch-b")],
        config: { matchDurationMinutes: 20, transitionMinutes: 5, minRestMinutes: 5 },
        tournamentWindow: windowFromMinutes(0, 600),
      }),
    );
    expect(result.status).not.toBe("INFEASIBLE");
  });

  it("I. 16-participant upper bound", () => {
    const participants = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i}`,
      displayOrder: i,
    }));
    const ids = canonicalizeParticipantIds(participants);
    const generated = generateRoundRobinFixtures({
      participantIds: ids,
      config: { format: "ROUND_ROBIN", stageKey: "MAIN" },
    });
    expect(generated.length).toBe(120);
    const fixtures = generated.map((f, index) => ({
      fixtureId: `f${index}`,
      stageKey: f.stageKey,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideAParticipantId: f.sideAParticipantId,
      sideBParticipantId: f.sideBParticipantId,
    }));
    const resources = Array.from({ length: 8 }, (_, i) => resource(`pitch-${i}`, 0, 12 * 60));
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        participants: ids.map((participantId) => ({ participantId })),
        resources,
        config: { matchDurationMinutes: 15, transitionMinutes: 5, minRestMinutes: 10 },
        tournamentWindow: windowFromMinutes(0, 12 * 60),
      }),
    );
    expect(result.status).not.toBe("INFEASIBLE");
  });

  it("J. deterministic repeated result", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
    ];
    const input = defaultInput({ fixtures });
    const a = analyseTournamentFeasibility(input);
    const b = analyseTournamentFeasibility(input);
    expect(a).toEqual(b);
  });

  it("K. malformed fixture set rejected", () => {
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures: [
          {
            fixtureId: "f1",
            stageKey: "MAIN",
            roundIndex: 0,
            slotIndexInRound: 0,
            sideAParticipantId: "p1",
            sideBParticipantId: "p1",
          },
        ],
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
    expect(result.diagnostics.some((d) => d.code === "FIXTURE_SET.INVALID")).toBe(true);
  });

  it("L. >500 candidate-slot safety boundary", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ];
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        tournamentWindow: windowFromMinutes(0, 2000),
        resources: [resource("pitch-a", 0, 2000), resource("pitch-b", 0, 2000)],
        config: { matchDurationMinutes: 1, transitionMinutes: 0, minRestMinutes: 0 },
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
    expect(result.diagnostics.some((d) => d.code === "SLOTS.TOO_MANY_CANDIDATES")).toBe(true);
    expect(result.metrics.candidateSlotCount).toBeGreaterThan(FEASIBILITY_MAX_CANDIDATE_SLOTS);
  });
});

describe("hard constraints H1–H12 catalogue", () => {
  it("documents twelve constraints", () => {
    expect(HARD_CONSTRAINT_CATALOGUE.map((c) => c.id)).toEqual([
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "H7",
      "H8",
      "H9",
      "H10",
      "H11",
      "H12",
    ]);
  });

  it.each([
    {
      id: "H2",
      positive: () =>
        analyseTournamentFeasibility(
          defaultInput({
            fixtures: [
              {
                fixtureId: "f1",
                stageKey: "MAIN",
                roundIndex: 0,
                slotIndexInRound: 0,
                sideAParticipantId: "p1",
                sideBParticipantId: "p2",
              },
            ],
          }),
        ),
      negative: () =>
        analyseTournamentFeasibility(
          defaultInput({
            fixtures: [
              {
                fixtureId: "f1",
                stageKey: "MAIN",
                roundIndex: 0,
                slotIndexInRound: 0,
                sideAParticipantId: "p1",
                sideBParticipantId: "p2",
              },
              {
                fixtureId: "f2",
                stageKey: "MAIN",
                roundIndex: 0,
                slotIndexInRound: 1,
                sideAParticipantId: "p3",
                sideBParticipantId: "p4",
              },
            ],
            resources: [resource("pitch-a", 0, 35)],
            config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
          }),
        ),
    },
  ])("$id positive feasible / negative infeasible", ({ positive, negative }) => {
    expect(positive().status).not.toBe("INFEASIBLE");
    expect(negative().status).toBe("INFEASIBLE");
  });
});

describe("boundary equalities", () => {
  it("fixture ends exactly at tournament end", () => {
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures: [
          {
            fixtureId: "f1",
            stageKey: "MAIN",
            roundIndex: 0,
            slotIndexInRound: 0,
            sideAParticipantId: "p1",
            sideBParticipantId: "p2",
          },
        ],
        tournamentWindow: windowFromMinutes(0, 35),
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
        resources: [resource("pitch-a", 0, 35)],
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(result.status);
  });

  it("rest exactly equals minimum", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
    ];
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        participants: ["p1", "p2", "p3"].map((participantId) => ({ participantId })),
        config: { matchDurationMinutes: 30, transitionMinutes: 0, minRestMinutes: 15 },
        tournamentWindow: windowFromMinutes(0, 500),
      }),
    );
    expect(result.status).not.toBe("INFEASIBLE");
  });
});

describe("TIGHT policy", () => {
  it("uses documented utilisation threshold", () => {
    expect(TIGHT_CAPACITY_UTILISATION_THRESHOLD).toBe(0.85);
  });
});

describe("performance — 16-team round robin", () => {
  it("completes within MVP target under test conditions", () => {
    const participants = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i}`,
      displayOrder: i,
    }));
    const ids = canonicalizeParticipantIds(participants);
    const generated = generateRoundRobinFixtures({
      participantIds: ids,
      config: { format: "ROUND_ROBIN", stageKey: "MAIN" },
    });
    const fixtures = generated.map((f, index) => ({
      fixtureId: `f${index}`,
      stageKey: f.stageKey,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideAParticipantId: f.sideAParticipantId,
      sideBParticipantId: f.sideBParticipantId,
    }));
    const resources = Array.from({ length: 8 }, (_, i) => resource(`pitch-${i}`, 0, 12 * 60));
    const input = defaultInput({
      fixtures,
      participants: ids.map((participantId) => ({ participantId })),
      resources,
      config: { matchDurationMinutes: 15, transitionMinutes: 5, minRestMinutes: 10 },
      tournamentWindow: windowFromMinutes(0, 12 * 60),
    });
    const start = performance.now();
    analyseTournamentFeasibility(input);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
