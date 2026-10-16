/**
 * SCE-TOURNAMENT-PLANNER-01E3A — competition topology + fixture sides (mocked Prisma).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
    tournamentParticipant: { findFirst: vi.fn(), findMany: vi.fn() },
    tournamentFixture: { findFirst: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    tournamentPhase: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    tournamentGroup: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    tournamentGroupMembership: { findFirst: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    tournamentCompetitionConfiguration: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    tournamentRankingConfiguration: { findFirst: vi.fn(), upsert: vi.fn() },
    tournamentQualificationSource: { findFirst: vi.fn(), create: vi.fn() },
    tournamentFixtureSide: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  assignParticipantToTournamentGroup,
  createGroupRankQualificationSource,
  createTournamentGroup,
  listTournamentPhases,
  persistTournamentFixtureSides,
  upsertTournamentCompetitionConfiguration,
} from "../competition-structure";
import {
  TournamentCompetitionConflictError,
  TournamentCompetitionValidationError,
} from "../errors";
import { FORMAT_PHASE_BLUEPRINT } from "../competition-structure/constants";

const TENANT = "tenant-a";
const TOURNAMENT = "tournament-01";
const PHASE_GROUP = "phase-group";
const PHASE_KO = "phase-ko";

function mockOrganiserTournament() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
    organizerName: "FC Allschwil",
  } as never);
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ name: "FC Allschwil" } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrganiserTournament();
  vi.mocked(prisma.tournamentFixture.count).mockResolvedValue(0);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
});

describe("01E3A — competition format phases", () => {
  it("creates GROUP_PLUS_KNOCKOUT phases in deterministic order", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.upsert).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "GROUP_PLUS_KNOCKOUT",
    } as never);
    vi.mocked(prisma.tournamentPhase.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.tournamentPhase.create).mockImplementation(async (args) => {
      const data = (args as { data: { displayOrder: number; phaseType: string; label: string } })
        .data;
      return {
        id: data.displayOrder === 1 ? PHASE_GROUP : PHASE_KO,
        eventId: TOURNAMENT,
        stageKey: data.displayOrder === 1 ? "GROUP" : "KO",
        groupMixStrategy: null,
        smartMixTargetMatchesPerParticipant: null,
        ...data,
      } as never;
    });
    vi.mocked(prisma.tournamentRankingConfiguration.upsert).mockResolvedValue({
      id: "rank",
      eventId: TOURNAMENT,
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
    } as never);

    await upsertTournamentCompetitionConfiguration(TENANT, TOURNAMENT, "GROUP_PLUS_KNOCKOUT");
    expect(FORMAT_PHASE_BLUEPRINT.GROUP_PLUS_KNOCKOUT).toHaveLength(2);
    expect(vi.mocked(prisma.tournamentPhase.create)).toHaveBeenCalledTimes(2);
  });

  it("rejects topology change when fixtures already exist", async () => {
    vi.mocked(prisma.tournamentFixture.count).mockResolvedValue(3);
    await expect(
      upsertTournamentCompetitionConfiguration(TENANT, TOURNAMENT, "KNOCKOUT_ONLY"),
    ).rejects.toBeInstanceOf(TournamentCompetitionConflictError);
  });
});

describe("01E3A — groups and membership", () => {
  it("rejects duplicate membership in same phase", async () => {
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_GROUP,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "GROUP_MIX",
      label: "Gruppenphase",
      stageKey: "GROUP",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentGroup.findFirst).mockResolvedValue({
      id: "group-a",
      eventId: TOURNAMENT,
      tournamentPhaseId: PHASE_GROUP,
      displayOrder: 1,
      label: "Gruppe A",
      phase: { phaseType: "GROUP_MIX", displayOrder: 1 },
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.tournamentGroupMembership.findFirst).mockResolvedValue({
      id: "m-other",
      tournamentGroupId: "group-b",
    } as never);

    await expect(
      assignParticipantToTournamentGroup(TENANT, TOURNAMENT, "group-a", "p1"),
    ).rejects.toBeInstanceOf(TournamentCompetitionValidationError);
  });

  it("creates groups with deterministic order", async () => {
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_GROUP,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "GROUP_MIX",
      label: "Gruppenphase",
      stageKey: "GROUP",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentGroup.create).mockResolvedValue({
      id: "group-a",
      eventId: TOURNAMENT,
      tournamentPhaseId: PHASE_GROUP,
      displayOrder: 1,
      label: "Gruppe A",
    } as never);

    const group = await createTournamentGroup(TENANT, TOURNAMENT, PHASE_GROUP, {
      label: "Gruppe A",
      displayOrder: 1,
    });
    expect(group.label).toBe("Gruppe A");
  });
});

describe("01E3A — fixture sides + GROUP_RANK qualification", () => {
  it("persists mixed concrete vs qualification sides", async () => {
    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({
      id: "fx-1",
      eventId: TOURNAMENT,
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.tournamentQualificationSource.findFirst).mockImplementation(async (args) => {
      const where = (args as { where: { id: string } }).where;
      if (where.id === "qs-1") {
        return {
          id: "qs-1",
          eventId: TOURNAMENT,
          sourceType: "GROUP_RANK",
          sourceGroupId: "group-a",
          rank: 2,
          sourceFixtureId: null,
          sourceGroup: {
            phase: { displayOrder: 1, phaseType: "GROUP_MIX" },
          },
        } as never;
      }
      return null;
    });
    vi.mocked(prisma.tournamentPhase.findFirst).mockImplementation(async (args) => {
      const where = (args as { where: { id: string } }).where;
      if (where.id === PHASE_KO) {
        return {
          id: PHASE_KO,
          eventId: TOURNAMENT,
          displayOrder: 2,
          phaseType: "KNOCKOUT",
          label: "K.-o.-Phase",
          stageKey: "KO",
          groupMixStrategy: null,
          smartMixTargetMatchesPerParticipant: null,
        } as never;
      }
      return null;
    });
    vi.mocked(prisma.tournamentFixtureSide.create).mockImplementation(async (args) => {
      const data = (args as { data: object }).data;
      return { id: `side-${Math.random()}`, fixtureId: "fx-1", ...data } as never;
    });

    const sides = await persistTournamentFixtureSides(
      TENANT,
      TOURNAMENT,
      "fx-1",
      PHASE_KO,
      { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1" },
    );
    expect(sides).toHaveLength(2);
    expect(vi.mocked(prisma.tournamentFixture.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sideAParticipantId: "p1",
          sideBParticipantId: null,
        }),
      }),
    );
  });

  it("rejects GROUP_RANK from same or later phase", async () => {
    vi.mocked(prisma.tournamentGroup.findFirst).mockResolvedValue({
      id: "group-a",
      eventId: TOURNAMENT,
      phase: { phaseType: "GROUP_MIX", displayOrder: 2 },
    } as never);
    vi.mocked(prisma.tournamentQualificationSource.create).mockResolvedValue({
      id: "qs-1",
      eventId: TOURNAMENT,
      sourceType: "GROUP_RANK",
      sourceGroupId: "group-a",
      rank: 1,
      sourceFixtureId: null,
    } as never);

    const source = await createGroupRankQualificationSource(TENANT, TOURNAMENT, {
      sourceType: "GROUP_RANK",
      sourceGroupId: "group-a",
      rank: 1,
    });
    expect(source.sourceType).toBe("GROUP_RANK");

    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({ id: "fx-ko" } as never);
    vi.mocked(prisma.tournamentQualificationSource.findFirst).mockResolvedValue({
      id: source.id,
      eventId: TOURNAMENT,
      sourceType: "GROUP_RANK",
      sourceGroupId: "group-a",
      rank: 1,
      sourceFixtureId: null,
      sourceGroup: { phase: { displayOrder: 2, phaseType: "GROUP_MIX" } },
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 2,
      phaseType: "KNOCKOUT",
      label: "K.-o.",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);

    await expect(
      persistTournamentFixtureSides(
        TENANT,
        TOURNAMENT,
        "fx-ko",
        PHASE_KO,
        { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: source.id },
        { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: source.id },
      ),
    ).rejects.toBeInstanceOf(TournamentCompetitionValidationError);
  });
});

describe("01E3A — list phases", () => {
  it("lists phases ordered by displayOrder", async () => {
    vi.mocked(prisma.tournamentPhase.findMany).mockResolvedValue([
      {
        id: PHASE_GROUP,
        eventId: TOURNAMENT,
        displayOrder: 1,
        phaseType: "GROUP_MIX",
        label: "Gruppenphase",
        stageKey: "GROUP",
        groupMixStrategy: "SMART_MIX",
        smartMixTargetMatchesPerParticipant: 3,
      },
      {
        id: PHASE_KO,
        eventId: TOURNAMENT,
        displayOrder: 2,
        phaseType: "KNOCKOUT",
        label: "K.-o.-Phase",
        stageKey: "KO",
        groupMixStrategy: null,
        smartMixTargetMatchesPerParticipant: null,
      },
    ] as never);

    const phases = await listTournamentPhases(TENANT, TOURNAMENT);
    expect(phases.map((p) => p.displayOrder)).toEqual([1, 2]);
  });
});
