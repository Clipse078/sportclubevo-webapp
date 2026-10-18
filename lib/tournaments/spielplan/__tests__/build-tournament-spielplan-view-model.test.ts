import { describe, expect, it } from "vitest";
import { buildTournamentPlanungViewModel } from "@/lib/tournaments/planung/build-planung-view-model";
import type { PlanungDomainSnapshot } from "@/lib/tournaments/planung/build-planung-view-model";
import {
  buildTournamentSpielplanFromPlanung,
  resolveTeamSpielplan,
} from "../build-tournament-spielplan-view-model";

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
      { id: "p3", displayOrder: 2, label: "Feld 3" },
      { id: "p4", displayOrder: 3, label: "Feld 4" },
    ],
    breaks: [],
    fixtures: [],
    assignments: [],
    participants: [],
    participantCount: 0,
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

function spielplanFromSnapshot(partial: Partial<PlanungDomainSnapshot>) {
  const snap = snapshot(partial);
  const planung = buildTournamentPlanungViewModel(snap);
  return buildTournamentSpielplanFromPlanung({
    tournamentId: snap.tournamentId,
    title: "Testturnier",
    startAtIso: snap.windowStartUtc!,
    location: "Sportanlage",
    organizerName: "FC Test",
    tenantName: "FC Test",
    tenantLogoUrl: null,
    timezone: snap.timezone,
    pitches: planung.pitches.map((p) => ({
      pitchId: p.pitchId,
      displayOrder: p.displayOrder,
      label: p.label,
    })),
    cells: planung.cells,
    scheduleSections: planung.scheduleSections,
    participants: snap.participants.map((p) => ({
      participantId: p.participantId,
      displayName: p.displayName,
      crestUrl: p.crestUrl,
    })),
  });
}

describe("buildTournamentSpielplanViewModel", () => {
  it("A — 8 participants / 4 pitches matrix slots", () => {
    const participantIds = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
    const participants = participantIds.map((id, i) => ({
      participantId: id,
      displayName: `Team ${i + 1}`,
      crestUrl: null,
      accessibleLabel: `Team ${i + 1}`,
    }));
    const fixtures = Array.from({ length: 4 }, (_, i) => ({
      id: `f${i + 1}`,
      stageKey: "MAIN",
      roundIndex: 0,
      slotIndexInRound: i,
      tournamentGroupId: null,
      phaseType: null as const,
      sideAParticipantId: participantIds[i * 2]!,
      sideBParticipantId: participantIds[i * 2 + 1]!,
      sides: [],
      phaseLabel: null,
      groupLabel: null,
    }));
    const assignments = fixtures.map((f, i) => ({
      id: `a${i + 1}`,
      fixtureId: f.id,
      tournamentPitchId: `p${i + 1}`,
      startAt: "2026-08-01T08:00:00.000Z",
      endAt: "2026-08-01T08:14:00.000Z",
      scheduleLockDimension: null,
    }));
    const model = spielplanFromSnapshot({
      fixtures,
      assignments,
      participants,
      participantCount: 8,
      fixtureCount: 4,
    });
    expect(model.pitches).toHaveLength(4);
    const slot = model.matrixRows.find((r) => r.kind === "SCHEDULE_SLOT");
    expect(slot?.kind).toBe("SCHEDULE_SLOT");
    if (slot?.kind === "SCHEDULE_SLOT") {
      expect(Object.keys(slot.cellsByPitchId)).toHaveLength(4);
      expect(slot.cellsByPitchId.p1?.kind).toBe("FIXTURE");
    }
  });

  it("B — arbitrary pitch count", () => {
    const model = spielplanFromSnapshot({
      pitches: [
        { id: "p1", displayOrder: 0, label: "A" },
        { id: "p2", displayOrder: 1, label: "B" },
        { id: "p3", displayOrder: 2, label: "C" },
      ],
    });
    expect(model.pitches.map((p) => p.label)).toEqual(["A", "B", "C"]);
  });

  it("C — simultaneous assignment grouping by start time", () => {
    const model = spielplanFromSnapshot({
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
        {
          id: "f2",
          stageKey: "MAIN",
          roundIndex: 0,
          slotIndexInRound: 1,
          tournamentGroupId: null,
          phaseType: null,
          sideAParticipantId: "c",
          sideBParticipantId: "d",
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
        {
          id: "as2",
          fixtureId: "f2",
          tournamentPitchId: "p2",
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-01T08:14:00.000Z",
          scheduleLockDimension: null,
        },
      ],
      participants: [
        { participantId: "a", displayName: "A", crestUrl: null, accessibleLabel: "A" },
        { participantId: "b", displayName: "B", crestUrl: null, accessibleLabel: "B" },
        { participantId: "c", displayName: "C", crestUrl: null, accessibleLabel: "C" },
        { participantId: "d", displayName: "D", crestUrl: null, accessibleLabel: "D" },
      ],
      fixtureCount: 2,
    });
    const slots = model.matrixRows.filter((r) => r.kind === "SCHEDULE_SLOT");
    expect(slots).toHaveLength(1);
  });

  it("D/E — pitch columns and display order", () => {
    const model = spielplanFromSnapshot({
      pitches: [
        { id: "p2", displayOrder: 1, label: "Feld 2" },
        { id: "p1", displayOrder: 0, label: "Feld 1" },
      ],
    });
    expect(model.pitches.map((p) => p.label)).toEqual(["Feld 1", "Feld 2"]);
  });

  it("F — clock time labels in Europe/Zurich", () => {
    const model = spielplanFromSnapshot({
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
    });
    const slot = model.matrixRows.find((r) => r.kind === "SCHEDULE_SLOT");
    expect(slot?.kind).toBe("SCHEDULE_SLOT");
    if (slot?.kind === "SCHEDULE_SLOT") {
      expect(slot.timeLabel).toMatch(/10:00/);
    }
  });

  it("G — competition round metadata on slot", () => {
    const model = spielplanFromSnapshot({
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
    });
    const slot = model.matrixRows.find((r) => r.kind === "SCHEDULE_SLOT");
    expect(slot?.kind).toBe("SCHEDULE_SLOT");
    if (slot?.kind === "SCHEDULE_SLOT") {
      expect(slot.roundTitle).toMatch(/Runde 1/);
    }
  });

  it("H — all-pitch break band", () => {
    const model = spielplanFromSnapshot({
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
    });
    expect(model.matrixRows.some((r) => r.kind === "ALL_PITCHES_BREAK")).toBe(true);
  });

  it("I — selected-pitch blocked cell", () => {
    const model = spielplanFromSnapshot({
      breaks: [
        {
          id: "br1",
          label: "Pause",
          startAt: "2026-08-01T09:00:00.000Z",
          endAt: "2026-08-01T09:15:00.000Z",
          scope: "SELECTED_PITCHES",
          tournamentPitchIds: ["p1"],
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
          tournamentPitchId: "p2",
          startAt: "2026-08-01T09:00:00.000Z",
          endAt: "2026-08-01T09:14:00.000Z",
          scheduleLockDimension: null,
        },
      ],
      participants: [
        { participantId: "a", displayName: "A", crestUrl: null, accessibleLabel: "A" },
        { participantId: "b", displayName: "B", crestUrl: null, accessibleLabel: "B" },
      ],
      fixtureCount: 1,
    });
    const slot = model.matrixRows.find(
      (r) => r.kind === "SCHEDULE_SLOT" && r.startUtc === "2026-08-01T09:00:00.000Z",
    );
    expect(slot?.kind).toBe("SCHEDULE_SLOT");
    if (slot?.kind === "SCHEDULE_SLOT") {
      expect(slot.cellsByPitchId.p1?.kind).toBe("PITCH_BLOCKED");
      expect(slot.cellsByPitchId.p2?.kind).toBe("FIXTURE");
    }
  });

  it("J — empty pitch in slot", () => {
    const model = spielplanFromSnapshot({
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
    });
    const slot = model.matrixRows.find((r) => r.kind === "SCHEDULE_SLOT");
    if (slot?.kind === "SCHEDULE_SLOT") {
      expect(slot.cellsByPitchId.p2?.kind).toBe("EMPTY");
    }
  });

  it("K — duplicate source-team participants remain distinct team plans", () => {
    const model = spielplanFromSnapshot({
      fixtures: [
        {
          id: "f1",
          stageKey: "MAIN",
          roundIndex: 0,
          slotIndexInRound: 0,
          tournamentGroupId: null,
          phaseType: null,
          sideAParticipantId: "p-red",
          sideBParticipantId: "p-blue",
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
        {
          participantId: "p-red",
          displayName: "FC Allschwil F2 Rot",
          crestUrl: null,
          accessibleLabel: "Rot",
        },
        {
          participantId: "p-blue",
          displayName: "FC Allschwil F2 Blau",
          crestUrl: null,
          accessibleLabel: "Blau",
        },
      ],
      fixtureCount: 1,
    });
    expect(model.teamPlans).toHaveLength(2);
    const red = resolveTeamSpielplan(model, "p-red");
    const blue = resolveTeamSpielplan(model, "p-blue");
    expect(red?.entries[0]?.kind).toBe("MATCH");
    expect(blue?.entries[0]?.kind).toBe("MATCH");
    if (red?.entries[0]?.kind === "MATCH") {
      expect(red.entries[0].opponentLabel).toBe("FC Allschwil F2 Blau");
    }
  });

  it("L/M — qualification placeholders in pairing", () => {
    const model = spielplanFromSnapshot({
      fixtures: [
        {
          id: "f1",
          stageKey: "MAIN",
          roundIndex: 0,
          slotIndexInRound: 0,
          tournamentGroupId: null,
          phaseType: "KNOCKOUT",
          sideAParticipantId: null,
          sideBParticipantId: null,
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
          phaseLabel: "Final",
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
      participants: [],
      fixtureCount: 1,
    });
    expect(model.fixtures[0]?.pairingLabel).toMatch(/Gruppe A/);
    expect(model.fixtures[0]?.pairingLabel).toMatch(/Gruppe B/);
  });

  it("N — optional completed result", () => {
    const model = spielplanFromSnapshot({
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
      fixtureResults: [
        {
          fixtureId: "f1",
          state: "COMPLETED",
          scoreSideA: 2,
          scoreSideB: 1,
          winnerParticipantId: "a",
          revision: 1,
        },
      ],
      fixtureCount: 1,
    });
    expect(model.fixtures[0]?.result).toEqual({ scoreSideA: 2, scoreSideB: 1 });
  });

  it("O — no fake score without result", () => {
    const model = spielplanFromSnapshot({
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
    });
    expect(model.fixtures[0]?.result).toBeNull();
  });
});

describe("Team Spielplan", () => {
  it("derives plan per participant with opponent and pitch", () => {
    const model = spielplanFromSnapshot({
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
        { participantId: "a", displayName: "Alpha", crestUrl: null, accessibleLabel: "Alpha" },
        { participantId: "b", displayName: "Beta", crestUrl: null, accessibleLabel: "Beta" },
      ],
      fixtureCount: 1,
    });
    const teamA = resolveTeamSpielplan(model, "a");
    expect(teamA?.entries.filter((e) => e.kind === "MATCH")).toHaveLength(1);
    const match = teamA?.entries.find((e) => e.kind === "MATCH");
    if (match?.kind === "MATCH") {
      expect(match.opponentLabel).toBe("Beta");
      expect(match.pitchLabel).toBe("Feld 1");
    }
  });

  it("does not fabricate fixtures for uninvolved participant", () => {
    const model = spielplanFromSnapshot({
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
        { participantId: "c", displayName: "C", crestUrl: null, accessibleLabel: "C" },
      ],
      fixtureCount: 1,
    });
    const teamC = resolveTeamSpielplan(model, "c");
    expect(teamC?.entries.filter((e) => e.kind === "MATCH")).toHaveLength(0);
  });
});
