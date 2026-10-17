import { describe, expect, it } from "vitest";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";

const TZ = "Europe/Zurich";

function snapshot(partial: Partial<PlanungDomainSnapshot>): PlanungDomainSnapshot {
  return {
    tournamentId: "t1",
    ownership: "TENANT_ORGANISED",
    timezone: TZ,
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T12:00:00.000Z",
    scheduleVersionId: "sv1",
    scheduleRevision: 1,
    schedulingConfig: {
      matchDurationMinutes: 20,
      transitionMinutes: 5,
      minRestMinutes: 10,
    },
    pitches: [
      { id: "p1", displayOrder: 0, label: "Feld 1" },
      { id: "p2", displayOrder: 1, label: "Feld 2" },
    ],
    breaks: [],
    fixtures: [
      {
        id: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        tournamentGroupId: "g1",
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        sides: [],
        phaseLabel: "Gruppe",
        groupLabel: "Gruppe A",
      },
    ],
    assignments: [
      {
        id: "as1",
        fixtureId: "f1",
        tournamentPitchId: "p1",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T08:20:00.000Z",
        scheduleLockDimension: "TIME",
      },
    ],
    participants: [
      {
        participantId: "a",
        displayName: "FCA F2 Rot",
        crestUrl: null,
        accessibleLabel: "FCA F2 Rot",
      },
      {
        participantId: "b",
        displayName: "FCA F2 Blau",
        crestUrl: null,
        accessibleLabel: "FCA F2 Blau",
      },
    ],
    participantCount: 2,
    fixtureCount: 1,
    feasibility: { status: "FEASIBLE", diagnostics: [], metrics: {} as never, suggestions: [] },
    smartTiming: null,
    optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
    ...partial,
  };
}

describe("buildTournamentPlanungViewModel", () => {
  it("preserves distinct tournament-local participant identities", () => {
    const vm = buildTournamentPlanungViewModel(snapshot({}));
    const fixture = vm.cells.find((c) => c.kind === "FIXTURE");
    expect(fixture && fixture.kind === "FIXTURE").toBe(true);
    if (fixture?.kind === "FIXTURE") {
      expect(fixture.sideA.label).toBe("FCA F2 Rot");
      expect(fixture.sideB.label).toBe("FCA F2 Blau");
    }
  });

  it("renders qualification placeholders human-readably", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        fixtures: [
          {
            id: "f-ko",
            stageKey: "KO",
            roundIndex: 1,
            slotIndexInRound: 0,
            tournamentGroupId: null,
            sideAParticipantId: null,
            sideBParticipantId: null,
            phaseLabel: "K.o.",
            groupLabel: null,
            sides: [
              {
                side: "A",
                sourceType: "QUALIFICATION_REFERENCE",
                participantId: null,
                qualification: {
                  sourceType: "GROUP_RANK",
                  rank: 1,
                  sourceGroupLabel: "Gruppe A",
                  sourceFixture: null,
                },
              },
              {
                side: "B",
                sourceType: "QUALIFICATION_REFERENCE",
                participantId: null,
                qualification: {
                  sourceType: "GROUP_RANK",
                  rank: 2,
                  sourceGroupLabel: "Gruppe B",
                  sourceFixture: null,
                },
              },
            ],
          },
        ],
        assignments: [],
      }),
    );
    const cell = vm.cells.find((c) => c.kind === "FIXTURE");
    expect(cell && cell.kind === "FIXTURE").toBe(true);
    if (cell?.kind === "FIXTURE") {
      expect(cell.sideA.label).toBe("1. Gruppe A");
      expect(cell.sideB.label).toBe("2. Gruppe B");
    }
  });

  it("uses non-hardcoded time scale from assignment starts", () => {
    const vm = buildTournamentPlanungViewModel(snapshot({}));
    expect(vm.timeScale?.matchDurationMinutes).toBe(20);
    expect(vm.timeScale?.transitionMinutes).toBe(5);
    expect(vm.timeScale?.rowAnchorsUtc).toContain("2026-08-01T08:00:00.000Z");
  });

  it("mobile timeline shares planner model cells", () => {
    const vm = buildTournamentPlanungViewModel(snapshot({}));
    expect(vm.mobileTimeline.length).toBeGreaterThan(0);
    expect(vm.mobileTimeline[0]?.kind).toBe("FIXTURE");
  });
});
