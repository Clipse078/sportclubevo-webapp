import { describe, expect, it } from "vitest";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";
import { formatKnockoutRoundLabel } from "../planung-round-labels";

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
      matchDurationMinutes: 14,
      transitionMinutes: 1,
      minRestMinutes: 5,
    },
    pitches: [
      { id: "p1", displayOrder: 0, label: "Feld 1" },
      { id: "p2", displayOrder: 1, label: "Feld 2" },
    ],
    breaks: [],
    fixtures: [],
    assignments: [],
    participants: [],
    participantCount: 4,
    fixtureCount: 0,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
    fixtureResults: [],
    groups: [],
    rankingConfiguration: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
    },
    ...partial,
  };
}

describe("Planung schedule sections (01H-R3)", () => {
  it("G — assignments expose fixture, participants, times, and tournament pitch", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        fixtures: [
          {
            id: "f1",
            stageKey: "MAIN",
            roundIndex: 0,
            slotIndexInRound: 0,
            tournamentGroupId: null,
            phaseType: null,
            sideAParticipantId: "a",
            sideBParticipantId: "b",
            sides: [],
            phaseLabel: null,
            groupLabel: null,
          },
        ],
        assignments: [
          {
            id: "as1",
            fixtureId: "f1",
            tournamentPitchId: "p1",
            startAt: "2026-08-01T08:00:00.000Z",
            endAt: "2026-08-01T08:14:00.000Z",
            scheduleLockDimension: null,
          },
        ],
        participants: [
          { participantId: "a", displayName: "Team X", crestUrl: null, accessibleLabel: "Team X" },
          { participantId: "b", displayName: "Team Y", crestUrl: null, accessibleLabel: "Team Y" },
        ],
        fixtureCount: 1,
        optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
      }),
    );
    const section = vm.scheduleSections.find((s) => s.title === "Runde 1");
    expect(section).toBeTruthy();
    const entry = section!.entries[0];
    expect(entry?.kind).toBe("FIXTURE");
    if (entry?.kind === "FIXTURE") {
      expect(entry.sideA.label).toBe("Team X");
      expect(entry.pitchId).toBe("p1");
      expect(entry.endUtc).toBe("2026-08-01T08:14:00.000Z");
    }
  });

  it("H — round grouping is deterministic", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        fixtures: [
          {
            id: "f1",
            stageKey: "MAIN",
            roundIndex: 0,
            slotIndexInRound: 0,
            tournamentGroupId: "g1",
            phaseType: "GROUP_MIX",
            sideAParticipantId: "a",
            sideBParticipantId: "b",
            sides: [],
            phaseLabel: "Gruppe",
            groupLabel: "Gruppe A",
          },
          {
            id: "f2",
            stageKey: "MAIN",
            roundIndex: 1,
            slotIndexInRound: 0,
            tournamentGroupId: "g1",
            phaseType: "GROUP_MIX",
            sideAParticipantId: "a",
            sideBParticipantId: "c",
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
            endAt: "2026-08-01T08:14:00.000Z",
            scheduleLockDimension: null,
          },
          {
            id: "as2",
            fixtureId: "f2",
            tournamentPitchId: "p2",
            startAt: "2026-08-01T08:15:00.000Z",
            endAt: "2026-08-01T08:29:00.000Z",
            scheduleLockDimension: null,
          },
        ],
        participants: [
          { participantId: "a", displayName: "A", crestUrl: null, accessibleLabel: "A" },
          { participantId: "b", displayName: "B", crestUrl: null, accessibleLabel: "B" },
          { participantId: "c", displayName: "C", crestUrl: null, accessibleLabel: "C" },
        ],
        fixtureCount: 2,
        optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
      }),
    );
    expect(vm.scheduleSections.map((s) => s.title)).toEqual([
      "Gruppe A · Runde 1",
      "Gruppe A · Runde 2",
    ]);
  });

  it("J — breaks appear as breaks, not fixtures", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        breaks: [
          {
            id: "br1",
            label: "Pause",
            startAt: "2026-08-01T09:00:00.000Z",
            endAt: "2026-08-01T09:15:00.000Z",
            scope: "ALL_PITCHES",
            tournamentPitchIds: [],
          },
        ],
        fixtures: [
          {
            id: "f1",
            stageKey: "MAIN",
            roundIndex: 0,
            slotIndexInRound: 0,
            tournamentGroupId: null,
            phaseType: null,
            sideAParticipantId: "a",
            sideBParticipantId: "b",
            sides: [],
            phaseLabel: null,
            groupLabel: null,
          },
        ],
        assignments: [
          {
            id: "as1",
            fixtureId: "f1",
            tournamentPitchId: "p1",
            startAt: "2026-08-01T08:00:00.000Z",
            endAt: "2026-08-01T08:14:00.000Z",
            scheduleLockDimension: null,
          },
        ],
        participants: [
          { participantId: "a", displayName: "A", crestUrl: null, accessibleLabel: "A" },
          { participantId: "b", displayName: "B", crestUrl: null, accessibleLabel: "B" },
        ],
        fixtureCount: 1,
        optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
      }),
    );
    const breakEntry = vm.scheduleSections.flatMap((s) => s.entries).find((e) => e.kind === "BREAK");
    expect(breakEntry?.kind).toBe("BREAK");
    expect(breakEntry && breakEntry.kind === "BREAK" && breakEntry.accessibleLabel).toMatch(
      /Alle Felder/,
    );
  });

  it("K — selected-pitch break scope preserved in label", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        breaks: [
          {
            id: "br1",
            label: "Pause",
            startAt: "2026-08-01T09:00:00.000Z",
            endAt: "2026-08-01T09:15:00.000Z",
            scope: "SELECTED_PITCHES",
            tournamentPitchIds: ["p1", "p2"],
          },
        ],
        fixtureCount: 0,
      }),
    );
    const br = vm.cells.find((c) => c.kind === "BREAK");
    expect(br && br.kind === "BREAK" && br.accessibleLabel).toMatch(/Feld 1, Feld 2/);
  });

  it("knockout labels derive from round structure", () => {
    expect(formatKnockoutRoundLabel(2, 2)).toBe("Finale");
    expect(formatKnockoutRoundLabel(1, 2)).toBe("Halbfinale");
    expect(formatKnockoutRoundLabel(0, 2)).toBe("Viertelfinale");
  });
});
