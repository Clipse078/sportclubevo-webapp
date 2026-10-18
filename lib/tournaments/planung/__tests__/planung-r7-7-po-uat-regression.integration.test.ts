import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateRoundRobinFixtures,
  expectedRoundRobinGlobalRoundCount,
} from "@/lib/tournament-scheduling/fixtures/round-robin";
import {
  resolveEffectiveRoundRobinMeetingsPerOpponent,
  normalizeStoredRoundRobinMeetingsForHomeAwayToggle,
} from "../planung-round-robin-home-away";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";
import { buildTournamentSpielplanFromPlanung } from "@/lib/tournaments/spielplan/build-tournament-spielplan-view-model";
import {
  assessPlanungRoundRobinTopologyMismatch,
  ensurePersistedRoundRobinMeetingsForHomeAwayRelevance,
} from "../planung-fixture-topology-audit";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zonedTimeToUtc } from "@/lib/training/recurrence";
import type { TournamentPlanungBoardCell } from "../types";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tournamentParticipant: { count: vi.fn() },
    tournamentFixture: { count: vi.fn() },
    tournamentCompetitionConfiguration: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    tournamentGroup: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";

const TIMEZONE = "Europe/Zurich";
const PARTICIPANTS = ["p-a", "p-b", "p-c", "p-d"];

function legacySnapshot(params: {
  fixtureHomeAwayRelevance: "ON" | "OFF";
  fixtures: PlanungDomainSnapshot["fixtures"];
  assignments: PlanungDomainSnapshot["assignments"];
  breaks?: PlanungDomainSnapshot["breaks"];
}): PlanungDomainSnapshot {
  return {
    tournamentId: "cmvdha8t7000007jyknqkpvm6",
    ownership: "TENANT_ORGANISED",
    timezone: TIMEZONE,
    windowStartUtc: "2026-10-25T08:00:00.000Z",
    windowEndUtc: "2026-10-25T18:00:00.000Z",
    scheduleVersionId: "sv-legacy",
    scheduleRevision: 3,
    schedulingConfig: {
      matchDurationMinutes: 10,
      transitionMinutes: 5,
      minRestMinutes: 0,
    },
    pitches: [
      { id: "pitch-1", displayOrder: 0, label: "Feld 1" },
      { id: "pitch-2", displayOrder: 1, label: "Feld 2" },
    ],
    breaks: params.breaks ?? [],
    fixtures: params.fixtures,
    assignments: params.assignments,
    participants: PARTICIPANTS.map((id, index) => ({
      participantId: id,
      displayName: `Team ${index + 1}`,
      crestUrl: null,
      accessibleLabel: `Team ${index + 1}`,
    })),
    participantCount: 4,
    fixtureCount: params.fixtures.length,
    feasibility: null,
    smartTiming: null,
    optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
    fixtureResults: [],
    groups: [],
    rankingConfiguration: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
    },
    scheduleConsistencyStatus: "MATCHES",
    fixtureHomeAwayRelevance: params.fixtureHomeAwayRelevance,
  };
}

function assignedCellsFromFixtures(
  fixtures: ReturnType<typeof generateRoundRobinFixtures>,
  idPrefix: string,
): {
  fixtures: PlanungDomainSnapshot["fixtures"];
  assignments: PlanungDomainSnapshot["assignments"];
  cells: TournamentPlanungBoardCell[];
} {
  const baseStart = Date.UTC(2026, 9, 25, 8, 0, 0);
  const fixtureRows = fixtures.map((f, idx) => ({
    id: `${idPrefix}-${idx}`,
    stageKey: f.stageKey,
    roundIndex: f.roundIndex,
    slotIndexInRound: f.slotIndexInRound,
    tournamentGroupId: "g1",
    phaseType: "GROUP_MIX" as const,
    sideAParticipantId: f.sideAParticipantId,
    sideBParticipantId: f.sideBParticipantId,
    sides: [],
    phaseLabel: null,
    groupLabel: null,
  }));
  const assignments = fixtures.map((f, idx) => ({
    id: `asg-${idPrefix}-${idx}`,
    fixtureId: `${idPrefix}-${idx}`,
    tournamentPitchId: idx % 2 === 0 ? "pitch-1" : "pitch-2",
    startAt: new Date(baseStart + idx * 15 * 60_000).toISOString(),
    endAt: new Date(baseStart + idx * 15 * 60_000 + 10 * 60_000).toISOString(),
    scheduleLockDimension: null,
  }));
  const snapshot = legacySnapshot({
    fixtureHomeAwayRelevance: "ON",
    fixtures: fixtureRows,
    assignments,
  });
  const vm = buildTournamentPlanungViewModel(snapshot);
  return { fixtures: fixtureRows, assignments, cells: [...vm.cells] };
}

describe("01K-R7.7 — PO UAT regression (real failure path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects legacy Home/Away ON topology with only first-leg fixtures", async () => {
    vi.mocked(prisma.tournamentParticipant.count).mockResolvedValue(4);
    vi.mocked(prisma.tournamentFixture.count)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.tournamentGroup.count).mockResolvedValue(0);
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      fixtureHomeAwayRelevance: "ON",
      roundRobinMeetingsPerOpponent: 1,
      competitionFormat: "GROUP_MIX_ONLY",
    } as never);

    const assessment = await assessPlanungRoundRobinTopologyMismatch({
      tenantId: "tenant-1",
      tournamentId: "cmvdha8t7000007jyknqkpvm6",
    });

    expect(assessment.mismatch).toBe(true);
    expect(assessment.expectedFixtureCount).toBe(12);
    expect(assessment.actualFixtureCount).toBe(6);
    expect(assessment.expectedCompetitionRoundCount).toBe(6);
  });

  it("persists meetings=2 when Home/Away relevance is ON but stored meetings remain 1", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      roundRobinMeetingsPerOpponent: 1,
    } as never);
    vi.mocked(prisma.tournamentCompetitionConfiguration.updateMany).mockResolvedValue({ count: 1 });

    await ensurePersistedRoundRobinMeetingsForHomeAwayRelevance({
      tenantId: "tenant-1",
      tournamentId: "cmvdha8t7000007jyknqkpvm6",
      fixtureHomeAwayRelevance: "ON",
    });

    expect(prisma.tournamentCompetitionConfiguration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { roundRobinMeetingsPerOpponent: 2 },
      }),
    );
  });

  it("HOME/AWAY ON — 12 fixtures, 12 assignments, 6 visible Planung rounds", () => {
    const meetings = resolveEffectiveRoundRobinMeetingsPerOpponent(1, "ON");
    const generated = generateRoundRobinFixtures({
      participantIds: PARTICIPANTS,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: meetings,
        homeAwayRelevance: "ON",
      },
    });
    expect(generated).toHaveLength(12);
    expect(expectedRoundRobinGlobalRoundCount(4, meetings)).toBe(6);

    const { fixtures, assignments } = assignedCellsFromFixtures(generated, "fx-on");
    const vm = buildTournamentPlanungViewModel(
      legacySnapshot({
        fixtureHomeAwayRelevance: "ON",
        fixtures,
        assignments,
      }),
    );

    const assigned = vm.cells.filter((c) => c.kind === "FIXTURE" && c.assignmentId != null);
    expect(assigned).toHaveLength(12);
    const roundSections = vm.scheduleSections.filter((s) => !s.sectionId.startsWith("break:"));
    expect(roundSections).toHaveLength(6);
  });

  it("OFF → ON → OFF fixture and round counts without stale topology", () => {
    let storedMeetings = 1;
    const offFixtures = generateRoundRobinFixtures({
      participantIds: PARTICIPANTS,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: 1,
        homeAwayRelevance: "OFF",
      },
    });
    expect(offFixtures).toHaveLength(6);

    storedMeetings = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(storedMeetings, "OFF", "ON");
    const onMeetings = resolveEffectiveRoundRobinMeetingsPerOpponent(storedMeetings, "ON");
    const onFixtures = generateRoundRobinFixtures({
      participantIds: PARTICIPANTS,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: onMeetings,
        homeAwayRelevance: "ON",
      },
    });
    expect(onFixtures).toHaveLength(12);

    storedMeetings = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(storedMeetings, "ON", "OFF");
    const offAgain = generateRoundRobinFixtures({
      participantIds: PARTICIPANTS,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: storedMeetings,
        homeAwayRelevance: "OFF",
      },
    });
    expect(offAgain).toHaveLength(6);
  });

  it("A vs B and B vs A once each when Home/Away ON", () => {
    const generated = generateRoundRobinFixtures({
      participantIds: PARTICIPANTS,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: 2,
        homeAwayRelevance: "ON",
      },
    });
    const pair = generated.filter(
      (f) =>
        (f.sideAParticipantId === "p-a" && f.sideBParticipantId === "p-b") ||
        (f.sideAParticipantId === "p-b" && f.sideBParticipantId === "p-a"),
    );
    expect(pair).toHaveLength(2);
    expect(pair.some((f) => f.sideAParticipantId === "p-a")).toBe(true);
    expect(pair.some((f) => f.sideAParticipantId === "p-b")).toBe(true);
  });

  it("ALL_PITCHES break 11:00–11:10 is explicit in Planung, Spielplan, and board time scale", () => {
    const offFixtures = generateRoundRobinFixtures({
      participantIds: PARTICIPANTS,
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 1, homeAwayRelevance: "OFF" },
    });
    const { fixtures, assignments, cells } = assignedCellsFromFixtures(offFixtures, "fx-br");
    const breakStart = zonedTimeToUtc("2026-10-25", "11:00", TIMEZONE).toISOString();
    const breakEnd = zonedTimeToUtc("2026-10-25", "11:10", TIMEZONE).toISOString();
    const snapshot = legacySnapshot({
      fixtureHomeAwayRelevance: "OFF",
      fixtures,
      assignments,
      breaks: [
        {
          id: "br-lunch",
          label: "Pause",
          startAt: breakStart,
          endAt: breakEnd,
          scope: "ALL_PITCHES",
          tournamentPitchIds: [],
        },
      ],
    });
    const vm = buildTournamentPlanungViewModel(snapshot);

    expect(
      vm.timeScale?.rowAnchorsUtc.some((a) => a === breakStart || Date.parse(a) === Date.parse(breakStart)),
    ).toBe(true);
    const breakSection = vm.scheduleSections.find((s) => s.sectionId.startsWith("break:"));
    expect(breakSection?.entries[0]?.kind).toBe("BREAK");

    const spielplan = buildTournamentSpielplanFromPlanung({
      tournamentId: snapshot.tournamentId,
      title: "Test",
      startAtIso: snapshot.windowStartUtc!,
      location: null,
      organizerName: null,
      tenantName: null,
      tenantLogoUrl: null,
      timezone: TIMEZONE,
      pitches: vm.pitches.map((p) => ({
        pitchId: p.pitchId,
        displayOrder: p.displayOrder,
        label: p.label,
      })),
      cells: vm.cells,
      scheduleSections: vm.scheduleSections,
      participants: vm.participants.map((p) => ({
        participantId: p.participantId,
        displayName: p.displayName,
        crestUrl: p.crestUrl,
      })),
    });

    const breakItem = spielplan.presentationItems.find((i) => i.kind === "SCHEDULE_BREAK");
    expect(breakItem?.kind).toBe("SCHEDULE_BREAK");
    if (breakItem?.kind === "SCHEDULE_BREAK") {
      expect(breakItem.break.label).toBe("Pause");
      expect(breakItem.break.timeLabel).toMatch(/11:00/);
      expect(breakItem.break.timeLabel).toMatch(/11:10/);
    }
    expect(spielplan.matrixRows.some((r) => r.kind === "ALL_PITCHES_BREAK")).toBe(true);

    const teamPlan = spielplan.teamPlans[0];
    expect(teamPlan?.entries.some((e) => e.kind === "BREAK")).toBe(true);
  });

  it("live reconcile module reconciles stale topology without an explicit Home/Away toggle", () => {
    const reconcile = readFileSync(
      join(process.cwd(), "lib/tournaments/planung/planung-live-schedule-reconcile.server.ts"),
      "utf8",
    );
    expect(reconcile).toMatch(/assessPlanungRoundRobinTopologyMismatch/);
    expect(reconcile).toMatch(/shouldReconcileTopology/);
    expect(reconcile).toMatch(/ensurePersistedRoundRobinMeetingsForHomeAwayRelevance/);
  });

  it("roadmap documents TournamentPitch sport/country neutrality (no format-aware pitch requirement)", () => {
    const roadmap = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01K.md"),
      "utf8",
    );
    expect(roadmap).toMatch(/01K-R7\.7/i);
    expect(roadmap).toMatch(/sport-neutral|sport neutral|COUNTRY-NEUTRAL|country-neutral/i);
    expect(roadmap).not.toMatch(/format-aware pitches.*future generic requirement/i);
  });
});
