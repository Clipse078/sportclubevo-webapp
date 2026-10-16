/**
 * SCE-TOURNAMENT-PLANNER-01E3D — qualification mapping service (mocked Prisma).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
    tournamentParticipant: { findFirst: vi.fn(), findMany: vi.fn() },
    tournamentFixture: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    tournamentFixtureSide: { createMany: vi.fn() },
    tournamentQualificationSource: { findFirst: vi.fn(), create: vi.fn() },
    tournamentCompetitionConfiguration: { findFirst: vi.fn() },
    tournamentPhase: { findFirst: vi.fn() },
    tournamentGroup: { findMany: vi.fn(), findFirst: vi.fn() },
    tournamentGroupMembership: { count: vi.fn() },
    tournamentKnockoutQualificationMapping: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../knockout-bracket/knockout-bracket-service", () => ({
  generateKnockoutBracketForPhase: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { generateKnockoutBracketForPhase } from "../knockout-bracket/knockout-bracket-service";
import {
  applyGroupToKnockoutQualificationAndGenerateBracket,
} from "../qualification-mapping/qualification-mapping-service";
import {
  TournamentCompetitionConflictError,
  TournamentFormatUnsupportedError,
} from "../errors";

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

function mockGroupPlusKnockoutPhases() {
  vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
    id: "cfg",
    eventId: TOURNAMENT,
    competitionFormat: "GROUP_PLUS_KNOCKOUT",
  } as never);
  vi.mocked(prisma.tournamentPhase.findFirst).mockImplementation(async (args) => {
    const id = (args as { where: { id: string } }).where.id;
    if (id === PHASE_GROUP) {
      return {
        id: PHASE_GROUP,
        eventId: TOURNAMENT,
        displayOrder: 1,
        phaseType: "GROUP_MIX",
        label: "Gruppen",
        stageKey: "MAIN",
        groupMixStrategy: "ROUND_ROBIN",
        smartMixTargetMatchesPerParticipant: null,
      } as never;
    }
    return {
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 2,
      phaseType: "KNOCKOUT",
      label: "KO",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrganiserTournament();
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
  vi.mocked(prisma.tournamentKnockoutQualificationMapping.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tournamentGroup.findMany).mockResolvedValue([
    { id: "group-a", eventId: TOURNAMENT, tournamentPhaseId: PHASE_GROUP, displayOrder: 1, label: "A" },
    { id: "group-b", eventId: TOURNAMENT, tournamentPhaseId: PHASE_GROUP, displayOrder: 2, label: "B" },
  ] as never);
  vi.mocked(prisma.tournamentGroupMembership.count).mockResolvedValue(4);
  vi.mocked(prisma.tournamentQualificationSource.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.tournamentQualificationSource.create).mockImplementation(async (args) => {
    const data = (args as { data: { sourceGroupId: string; rank: number } }).data;
    return {
      id: `qs-${data.sourceGroupId}-r${data.rank}`,
      sourceType: "GROUP_RANK",
    } as never;
  });
  vi.mocked(prisma.tournamentKnockoutQualificationMapping.create).mockResolvedValue({} as never);
  vi.mocked(generateKnockoutBracketForPhase).mockResolvedValue({
    fixtures: [{ id: "fx-1", eventId: TOURNAMENT, tournamentPhaseId: PHASE_KO }],
    diagnostics: { entrantCount: 4, bracketSize: 4, byeCount: 0, roundCount: 2, realFixtureCount: 3, fixturesByRound: {}, byeAdvancements: [] },
  });
});

describe("01E3D — service format guard", () => {
  it("rejects GROUP_MIX_ONLY", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "GROUP_MIX_ONLY",
    } as never);

    await expect(
      applyGroupToKnockoutQualificationAndGenerateBracket(TENANT, {
        tournamentId: TOURNAMENT,
        groupPhaseId: PHASE_GROUP,
        knockoutPhaseId: PHASE_KO,
        mapping: { mode: "DEFAULT", qualifiersPerGroup: 2 },
      }),
    ).rejects.toBeInstanceOf(TournamentFormatUnsupportedError);
  });
});

describe("01E3D — default mapping integration", () => {
  it("persists mappings and calls canonical knockout generator", async () => {
    mockGroupPlusKnockoutPhases();

    const result = await applyGroupToKnockoutQualificationAndGenerateBracket(TENANT, {
      tournamentId: TOURNAMENT,
      groupPhaseId: PHASE_GROUP,
      knockoutPhaseId: PHASE_KO,
      mapping: { mode: "DEFAULT", qualifiersPerGroup: 2 },
    });

    expect(result.mappings).toHaveLength(4);
    expect(vi.mocked(prisma.tournamentKnockoutQualificationMapping.create)).toHaveBeenCalledTimes(4);
    expect(generateKnockoutBracketForPhase).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        tournamentId: TOURNAMENT,
        phaseId: PHASE_KO,
        entrants: expect.arrayContaining([
          expect.objectContaining({ kind: "QUALIFICATION_REFERENCE" }),
        ]),
      }),
    );
  });
});

describe("01E3D — drift safety", () => {
  it("rejects conflicting persisted mappings", async () => {
    mockGroupPlusKnockoutPhases();
    vi.mocked(prisma.tournamentKnockoutQualificationMapping.findMany).mockResolvedValue([
      {
        sourceGroupId: "group-a",
        rank: 1,
        roundIndex: 0,
        slotIndexInRound: 0,
        side: "B",
        qualificationSourceId: "qs-1",
      },
      {
        sourceGroupId: "group-b",
        rank: 2,
        roundIndex: 0,
        slotIndexInRound: 0,
        side: "A",
        qualificationSourceId: "qs-2",
      },
      {
        sourceGroupId: "group-a",
        rank: 2,
        roundIndex: 0,
        slotIndexInRound: 1,
        side: "A",
        qualificationSourceId: "qs-3",
      },
      {
        sourceGroupId: "group-b",
        rank: 1,
        roundIndex: 0,
        slotIndexInRound: 1,
        side: "B",
        qualificationSourceId: "qs-4",
      },
    ] as never);

    await expect(
      applyGroupToKnockoutQualificationAndGenerateBracket(TENANT, {
        tournamentId: TOURNAMENT,
        groupPhaseId: PHASE_GROUP,
        knockoutPhaseId: PHASE_KO,
        mapping: { mode: "DEFAULT", qualifiersPerGroup: 2 },
      }),
    ).rejects.toBeInstanceOf(TournamentCompetitionConflictError);
  });
});
