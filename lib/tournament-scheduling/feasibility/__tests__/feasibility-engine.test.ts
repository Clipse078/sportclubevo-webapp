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

let pitchOrder = 0;
function tournamentPitch(id: string, displayOrder?: number) {
  return {
    tournamentPitchId: id,
    displayOrder: displayOrder ?? pitchOrder++,
    label: id,
    playableIntervals: [],
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
    tournamentPitches: [tournamentPitch("pitch-a"), tournamentPitch("pitch-b")],
    breaks: [],
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
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
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
        tournamentWindow: windowFromMinutes(0, 30),
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
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
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
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
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
    expect(result.metrics.availableTournamentPitchMinutes).toBeGreaterThan(result.metrics.requiredMatchMinutes);
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
        tournamentWindow: windowFromMinutes(0, 35),
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      }),
    );
    expect(infeasibleOnePitch.status).toBe("INFEASIBLE");

    const feasibleTwoPitches = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        tournamentWindow: windowFromMinutes(0, 35),
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(feasibleTwoPitches.status);
  });

  it("G. global break blocks entire window", () => {
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
    const window = windowFromMinutes(0, 600);
    const blocked = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        breaks: [
          {
            breakId: "br1",
            startUtcMs: window.startUtcMs,
            endUtcMs: window.endUtcMs,
            scope: "ALL_PITCHES",
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
        tournamentPitches: [tournamentPitch("pitch-a"), tournamentPitch("pitch-b")],
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
    const tournamentPitches = Array.from({ length: 8 }, (_, i) => tournamentPitch(`pitch-${i}`, i));
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures,
        participants: ids.map((participantId) => ({ participantId })),
        tournamentPitches,
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
        tournamentWindow: windowFromMinutes(0, 2000),
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
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
            tournamentPitches: [tournamentPitch("pitch-a", 0)],
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
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
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
    const tournamentPitches = Array.from({ length: 8 }, (_, i) => tournamentPitch(`pitch-${i}`, i));
    const input = defaultInput({
      fixtures,
      participants: ids.map((participantId) => ({ participantId })),
      tournamentPitches,
      config: { matchDurationMinutes: 15, transitionMinutes: 5, minRestMinutes: 10 },
      tournamentWindow: windowFromMinutes(0, 12 * 60),
    });
    const start = performance.now();
    analyseTournamentFeasibility(input);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe("tournament pitch count matrix", () => {
  const parallelFixtures = Array.from({ length: 8 }, (_, i) => ({
    fixtureId: `f${i}`,
    stageKey: "MAIN",
    roundIndex: 0,
    slotIndexInRound: i,
    sideAParticipantId: `p${i * 2}`,
    sideBParticipantId: `p${i * 2 + 1}`,
  }));

  it("1 pitch INFEASIBLE vs 8 pitches FEASIBLE for same window", () => {
    const window = windowFromMinutes(0, 35);
    const config = { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 };
    const one = analyseTournamentFeasibility(
      defaultInput({
        fixtures: parallelFixtures,
        tournamentWindow: window,
        tournamentPitches: [tournamentPitch("feld-1", 0)],
        config,
      }),
    );
    expect(one.status).toBe("INFEASIBLE");

    const eight = analyseTournamentFeasibility(
      defaultInput({
        fixtures: parallelFixtures,
        tournamentWindow: window,
        tournamentPitches: Array.from({ length: 8 }, (_, i) => tournamentPitch(`feld-${i + 1}`, i)),
        config,
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(eight.status);
  });
});

describe("tournament break matrix", () => {
  const singleFixture = [
    {
      fixtureId: "f1",
      stageKey: "MAIN",
      roundIndex: 0,
      slotIndexInRound: 0,
      sideAParticipantId: "p1",
      sideBParticipantId: "p2",
    },
  ];

  it("J. fixture may start exactly when break ends", () => {
    const breakEnd = windowFromMinutes(30, 45);
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures: singleFixture,
        tournamentWindow: windowFromMinutes(0, 600),
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
        tournamentPitches: [tournamentPitch("feld-1", 0)],
        breaks: [
          {
            breakId: "br",
            startUtcMs: windowFromMinutes(0, 30).startUtcMs,
            endUtcMs: breakEnd.endUtcMs,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.status).not.toBe("INFEASIBLE");
  });

  it("I. fixture overlapping break start is rejected", () => {
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures: singleFixture,
        tournamentWindow: windowFromMinutes(0, 35),
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
        tournamentPitches: [tournamentPitch("feld-1", 0)],
        breaks: [
          {
            breakId: "br",
            startUtcMs: windowFromMinutes(0, 0).startUtcMs,
            endUtcMs: windowFromMinutes(35, 35).endUtcMs,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.status).toBe("INFEASIBLE");
  });

  it("selected-pitch break only blocks chosen pitches", () => {
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures: singleFixture,
        tournamentWindow: windowFromMinutes(0, 35),
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
        tournamentPitches: [tournamentPitch("feld-1", 0), tournamentPitch("feld-2", 1)],
        breaks: [
          {
            breakId: "br",
            startUtcMs: windowFromMinutes(0, 0).startUtcMs,
            endUtcMs: windowFromMinutes(35, 35).endUtcMs,
            scope: "SELECTED_PITCHES",
            tournamentPitchIds: ["feld-1"],
          },
        ],
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(result.status);
  });

  it("overlapping global + pitch-specific breaks merge on affected pitch", () => {
    const result = analyseTournamentFeasibility(
      defaultInput({
        fixtures: singleFixture,
        tournamentWindow: windowFromMinutes(0, 90),
        config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
        tournamentPitches: [tournamentPitch("feld-1", 0)],
        breaks: [
          {
            breakId: "g",
            startUtcMs: windowFromMinutes(30, 30).startUtcMs,
            endUtcMs: windowFromMinutes(45, 45).endUtcMs,
            scope: "ALL_PITCHES",
          },
          {
            breakId: "p",
            startUtcMs: windowFromMinutes(40, 40).startUtcMs,
            endUtcMs: windowFromMinutes(55, 55).endUtcMs,
            scope: "SELECTED_PITCHES",
            tournamentPitchIds: ["feld-1"],
          },
        ],
      }),
    );
    expect(result.status).not.toBe("INFEASIBLE");
  });
});
