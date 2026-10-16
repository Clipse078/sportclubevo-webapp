/**
 * SCE-TOURNAMENT-PLANNER-01E3B — automatic group formation + group-scoped fixture generation.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireTenantOrganisedTournament } from "../internal/require-tenant-organised-tournament";
import {
  getTournamentCompetitionConfiguration,
  getTournamentPhase,
  listTournamentGroupsForPhase,
} from "../competition-structure/competition-structure-service";
import type { TournamentCompetitionFormat } from "../competition-structure/types";
import {
  TournamentCompetitionConflictError,
  TournamentCompetitionNotFoundError,
  TournamentCompetitionValidationError,
  TournamentFixtureSetConflictError,
  TournamentFixturesAlreadyExistError,
  TournamentFormatUnsupportedError,
  TournamentGenerationInvalidError,
  TournamentMeetingsPerOpponentInvalidError,
  TournamentSmartMixTargetInvalidError,
} from "../errors";
import { canonicalizeParticipantIds, compareParticipantId } from "../fixtures/ordering";
import {
  generateRoundRobinFixtures,
  generateSmartMixFixtures,
  RoundRobinGenerationValidationError,
} from "../fixtures";
import type { TournamentFixtureGenerationDefinition } from "../fixtures/types";
import { HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT } from "../smart-generator-architecture";
import type { TournamentFixtureDefinition } from "../types";
import {
  GROUP_FORMATION_ALGORITHM,
  GroupFormationValidationError,
  planAutomaticGroupTopology,
  summarizeGroupFormation,
} from "./group-formation-pure";
import {
  assertNoCrossGroupFixtures,
  computeSmartMixPairDiagnostics,
  countFixturesByGroup,
} from "./group-fixture-pure";
import type {
  FormTournamentGroupsAndGenerateFixturesInput,
  FormTournamentGroupsAndGenerateFixturesResult,
  FormTournamentGroupsInput,
  FormTournamentGroupsResult,
  GenerateTournamentGroupFixturesInput,
  GenerateTournamentGroupFixturesResult,
} from "./group-formation-types";

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toFixtureDefinition(row: {
  id: string;
  eventId: string;
  tournamentPhaseId?: string | null;
  tournamentGroupId?: string | null;
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  generatorKey: string | null;
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
}): TournamentFixtureDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    tournamentPhaseId: row.tournamentPhaseId ?? null,
    tournamentGroupId: row.tournamentGroupId ?? null,
    stageKey: row.stageKey,
    roundIndex: row.roundIndex,
    slotIndexInRound: row.slotIndexInRound,
    generatorKey: row.generatorKey,
    sideAParticipantId: row.sideAParticipantId,
    sideBParticipantId: row.sideBParticipantId,
  };
}

function assertFormatAllowsGroupFormation(
  format: TournamentCompetitionFormat,
  phaseType: "GROUP_MIX" | "KNOCKOUT",
): void {
  if (phaseType !== "GROUP_MIX") {
    throw new TournamentFormatUnsupportedError(
      "Automatic group formation applies only to GROUP_MIX phases",
    );
  }
  if (format === "KNOCKOUT_ONLY") {
    throw new TournamentFormatUnsupportedError(
      "KNOCKOUT_ONLY tournaments do not support automatic group formation",
    );
  }
}

function buildTopologyFingerprint(
  groupCount: number,
  planned: ReturnType<typeof planAutomaticGroupTopology>,
): string {
  return JSON.stringify({
    groupCount,
    groups: planned.map((group) => ({
      displayOrder: group.displayOrder,
      label: group.label,
      participantIds: [...group.participantIds].sort(compareParticipantId),
    })),
  });
}

async function loadValidatedParticipants(
  tenantId: string,
  tournamentId: string,
  participantIds: readonly string[],
): Promise<string[]> {
  if (participantIds.length === 0) {
    throw new TournamentCompetitionValidationError("At least one participant is required");
  }
  const unique = new Set(participantIds);
  if (unique.size !== participantIds.length) {
    throw new TournamentCompetitionValidationError("Duplicate participant ids in request");
  }

  const rows = await prisma.tournamentParticipant.findMany({
    where: { tenantId, eventId: tournamentId, id: { in: [...participantIds] } },
    select: { id: true, displayOrder: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });

  if (rows.length !== participantIds.length) {
    throw new TournamentCompetitionValidationError(
      "One or more participants are missing or belong to another tournament/tenant",
    );
  }

  return canonicalizeParticipantIds(rows);
}

async function readExistingPhaseTopology(tenantId: string, tournamentId: string, phaseId: string) {
  const groups = await prisma.tournamentGroup.findMany({
    where: { tenantId, eventId: tournamentId, tournamentPhaseId: phaseId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    include: {
      memberships: {
        orderBy: [{ tournamentParticipantId: "asc" }],
      },
    },
  });

  const phaseFixtures = await prisma.tournamentFixture.count({
    where: { tenantId, eventId: tournamentId, tournamentPhaseId: phaseId },
  });

  return { groups, phaseFixtures };
}

function existingTopologyFingerprint(
  groups: Awaited<ReturnType<typeof readExistingPhaseTopology>>["groups"],
): string | null {
  if (groups.length === 0) {
    return null;
  }
  return JSON.stringify({
    groupCount: groups.length,
    groups: groups.map((group) => ({
      displayOrder: group.displayOrder,
      label: group.label,
      participantIds: group.memberships
        .map((m) => m.tournamentParticipantId)
        .sort(compareParticipantId),
    })),
  });
}

function mapPureGroupFormationError(error: GroupFormationValidationError): never {
  if (error.code === "DUPLICATE_PARTICIPANT") {
    throw new TournamentCompetitionValidationError(error.message);
  }
  if (error.code === "GROUP_COUNT_INVALID") {
    throw new TournamentCompetitionValidationError(error.message);
  }
  throw new TournamentCompetitionValidationError(error.message);
}

export async function formTournamentGroups(
  tenantId: string,
  input: FormTournamentGroupsInput,
): Promise<FormTournamentGroupsResult> {
  const tournamentId = input.tournamentId;
  await requireTenantOrganisedTournament(tenantId, tournamentId);

  const config = await getTournamentCompetitionConfiguration(tenantId, tournamentId);
  if (!config) {
    throw new TournamentCompetitionNotFoundError(tournamentId);
  }

  const phase = await getTournamentPhase(tenantId, tournamentId, input.phaseId);
  assertFormatAllowsGroupFormation(config.competitionFormat, phase.phaseType);

  const canonicalParticipantIds = await loadValidatedParticipants(
    tenantId,
    tournamentId,
    input.participantIds,
  );

  let planned;
  try {
    planned = planAutomaticGroupTopology(canonicalParticipantIds, input.groupCount);
  } catch (error) {
    if (error instanceof GroupFormationValidationError) {
      mapPureGroupFormationError(error);
    }
    throw error;
  }

  const expectedFingerprint = buildTopologyFingerprint(input.groupCount, planned);
  const existing = await readExistingPhaseTopology(tenantId, tournamentId, input.phaseId);
  const existingFingerprint = existingTopologyFingerprint(existing.groups);

  if (existingFingerprint !== null) {
    if (existing.phaseFixtures > 0 && existingFingerprint !== expectedFingerprint) {
      throw new TournamentCompetitionConflictError(
        "Group topology drift: fixtures exist and group membership differs from requested formation",
      );
    }
    if (existingFingerprint === expectedFingerprint) {
      const groups = await listTournamentGroupsForPhase(tenantId, tournamentId, input.phaseId);
      const memberships = await prisma.tournamentGroupMembership.findMany({
        where: { tenantId, eventId: tournamentId, group: { tournamentPhaseId: input.phaseId } },
        orderBy: [{ tournamentGroupId: "asc" }, { tournamentParticipantId: "asc" }],
      });
      const summary = summarizeGroupFormation(
        canonicalParticipantIds.length,
        planned.map((g) => g.participantIds.length),
      );
      return {
        groups,
        memberships: memberships.map((row) => ({
          id: row.id,
          eventId: row.eventId,
          tournamentGroupId: row.tournamentGroupId,
          tournamentParticipantId: row.tournamentParticipantId,
        })),
        diagnostics: {
          ...summary,
          algorithm: GROUP_FORMATION_ALGORITHM,
          balancingDimension: "PARTICIPANT_COUNT_ONLY",
        },
      };
    }
    throw new TournamentCompetitionConflictError(
      "Group topology already exists and differs from the requested automatic formation",
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const groupRows = [];
      for (const groupPlan of planned) {
        const groupRow = await tx.tournamentGroup.create({
          data: {
            tenantId,
            eventId: tournamentId,
            tournamentPhaseId: input.phaseId,
            displayOrder: groupPlan.displayOrder,
            label: groupPlan.label,
          },
        });
        groupRows.push(groupRow);
        for (const participantId of groupPlan.participantIds) {
          await tx.tournamentGroupMembership.create({
            data: {
              tenantId,
              eventId: tournamentId,
              tournamentGroupId: groupRow.id,
              tournamentParticipantId: participantId,
            },
          });
        }
      }
      return groupRows;
    });

    const memberships = await prisma.tournamentGroupMembership.findMany({
      where: {
        tenantId,
        eventId: tournamentId,
        tournamentGroupId: { in: created.map((g) => g.id) },
      },
      orderBy: [{ tournamentGroupId: "asc" }, { tournamentParticipantId: "asc" }],
    });

    const summary = summarizeGroupFormation(
      canonicalParticipantIds.length,
      planned.map((g) => g.participantIds.length),
    );

    return {
      groups: created.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        tournamentPhaseId: row.tournamentPhaseId,
        displayOrder: row.displayOrder,
        label: row.label,
      })),
      memberships: memberships.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        tournamentGroupId: row.tournamentGroupId,
        tournamentParticipantId: row.tournamentParticipantId,
      })),
      diagnostics: {
        ...summary,
        algorithm: GROUP_FORMATION_ALGORITHM,
        balancingDimension: "PARTICIPANT_COUNT_ONLY",
      },
    };
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }
    const after = await readExistingPhaseTopology(tenantId, tournamentId, input.phaseId);
    const afterFingerprint = existingTopologyFingerprint(after.groups);
    if (afterFingerprint === expectedFingerprint) {
      return formTournamentGroups(tenantId, input);
    }
    throw new TournamentCompetitionConflictError(
      "Concurrent group formation produced a conflicting topology",
    );
  }
}

function mapPureFixtureValidationError(error: RoundRobinGenerationValidationError): never {
  switch (error.code) {
    case "TOURNAMENT_MEETINGS_PER_OPPONENT_INVALID":
      throw new TournamentMeetingsPerOpponentInvalidError(error.message);
    case "TOURNAMENT_SMART_MIX_TARGET_INVALID":
      throw new TournamentSmartMixTargetInvalidError(error.message);
    case "TOURNAMENT_FORMAT_UNSUPPORTED":
      throw new TournamentFormatUnsupportedError(error.message);
    default:
      throw new TournamentGenerationInvalidError(error.message);
  }
}

function generateFixturesForGroup(input: {
  strategy: "ROUND_ROBIN" | "SMART_MIX";
  participantIds: readonly string[];
  stageKey: string;
  groupScope: string;
  meetingsPerOpponent?: number;
  targetMatchesPerParticipant?: number;
  homeAwayRelevance: typeof HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT;
}): TournamentFixtureGenerationDefinition[] {
  try {
    if (input.strategy === "ROUND_ROBIN") {
      return generateRoundRobinFixtures({
        participantIds: input.participantIds,
        config: {
          format: "ROUND_ROBIN",
          stageKey: input.stageKey,
          generatorKeyGroupScope: input.groupScope,
          meetingsPerOpponent: input.meetingsPerOpponent,
          homeAwayRelevance: input.homeAwayRelevance,
        },
      });
    }
    if (input.targetMatchesPerParticipant === undefined) {
      throw new TournamentSmartMixTargetInvalidError(
        "targetMatchesPerParticipant is required for SMART_MIX group fixture generation",
      );
    }
    return generateSmartMixFixtures({
      participantIds: input.participantIds,
      config: {
        stageKey: input.stageKey,
        generatorKeyGroupScope: input.groupScope,
        targetMatchesPerParticipant: input.targetMatchesPerParticipant,
        homeAwayRelevance: input.homeAwayRelevance,
      },
    });
  } catch (error) {
    if (error instanceof RoundRobinGenerationValidationError) {
      mapPureFixtureValidationError(error);
    }
    throw error;
  }
}

function logicalFixtureKey(fixture: {
  tournamentGroupId: string;
  roundIndex: number;
  slotIndexInRound: number;
  sideAParticipantId: string;
  sideBParticipantId: string;
}): string {
  const sides =
    compareParticipantId(fixture.sideAParticipantId, fixture.sideBParticipantId) <= 0
      ? `${fixture.sideAParticipantId}|${fixture.sideBParticipantId}`
      : `${fixture.sideBParticipantId}|${fixture.sideAParticipantId}`;
  return `${fixture.tournamentGroupId}:${fixture.roundIndex}:${fixture.slotIndexInRound}:${sides}`;
}

export async function generateTournamentGroupFixturesForPhase(
  tenantId: string,
  input: GenerateTournamentGroupFixturesInput,
): Promise<GenerateTournamentGroupFixturesResult> {
  const tournamentId = input.tournamentId;
  await requireTenantOrganisedTournament(tenantId, tournamentId);

  const config = await getTournamentCompetitionConfiguration(tenantId, tournamentId);
  if (!config) {
    throw new TournamentCompetitionNotFoundError(tournamentId);
  }

  const phase = await getTournamentPhase(tenantId, tournamentId, input.phaseId);
  assertFormatAllowsGroupFormation(config.competitionFormat, phase.phaseType);

  const strategy = input.strategy ?? phase.groupMixStrategy;
  if (!strategy) {
    throw new TournamentCompetitionValidationError(
      "GROUP_MIX phase strategy must be configured before group fixture generation",
    );
  }

  const groups = await prisma.tournamentGroup.findMany({
    where: { tenantId, eventId: tournamentId, tournamentPhaseId: input.phaseId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    include: { memberships: true },
  });
  if (groups.length === 0) {
    throw new TournamentCompetitionValidationError(
      "Group fixture generation requires persisted tournament groups for the phase",
    );
  }

  const homeAwayRelevance = input.homeAwayRelevance ?? HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT;
  const groupParticipantSets = new Map<string, ReadonlySet<string>>();
  const generatedByGroup = new Map<string, TournamentFixtureGenerationDefinition[]>();

  const participantOrderRows = await prisma.tournamentParticipant.findMany({
    where: {
      tenantId,
      eventId: tournamentId,
      id: { in: groups.flatMap((g) => g.memberships.map((m) => m.tournamentParticipantId)) },
    },
    select: { id: true, displayOrder: true },
  });
  const participantOrderById = new Map(
    participantOrderRows.map((row) => [row.id, row.displayOrder] as const),
  );

  for (const group of groups) {
    const participantIds = canonicalizeParticipantIds(
      group.memberships.map((m) => ({
        id: m.tournamentParticipantId,
        displayOrder: participantOrderById.get(m.tournamentParticipantId) ?? 0,
      })),
    );
    const groupScope = group.id;
    const fixtures = generateFixturesForGroup({
      strategy,
      participantIds,
      stageKey: phase.stageKey,
      groupScope,
      meetingsPerOpponent: input.meetingsPerOpponent,
      targetMatchesPerParticipant:
        input.targetMatchesPerParticipant ?? phase.smartMixTargetMatchesPerParticipant ?? undefined,
      homeAwayRelevance,
    });
    groupParticipantSets.set(
      group.id,
      new Set(participantIds),
    );
    generatedByGroup.set(group.id, fixtures);
  }

  const allGenerated = [...generatedByGroup.entries()].flatMap(([groupId, fixtures]) =>
    fixtures.map((fixture) => ({ groupId, fixture })),
  );

  const globalParticipantSets = groupParticipantSets;
  assertNoCrossGroupFixtures(
    allGenerated.map((entry) => entry.fixture),
    globalParticipantSets,
  );

  const generatorKeys = new Set<string>();
  for (const entry of allGenerated) {
    if (generatorKeys.has(entry.fixture.generatorKey)) {
      throw new TournamentGenerationInvalidError(
        `Duplicate generatorKey across groups: ${entry.fixture.generatorKey}`,
      );
    }
    generatorKeys.add(entry.fixture.generatorKey);
  }

  const existing = await prisma.tournamentFixture.findMany({
    where: { tenantId, eventId: tournamentId, tournamentPhaseId: input.phaseId },
    orderBy: [{ roundIndex: "asc" }, { slotIndexInRound: "asc" }, { id: "asc" }],
  });

  const expectedKeys = new Set(
    allGenerated.map(({ groupId, fixture }) =>
      logicalFixtureKey({
        tournamentGroupId: groupId,
        roundIndex: fixture.roundIndex,
        slotIndexInRound: fixture.slotIndexInRound,
        sideAParticipantId: fixture.sideAParticipantId,
        sideBParticipantId: fixture.sideBParticipantId,
      }),
    ),
  );

  if (existing.length > 0) {
    const existingKeys = new Set(
      existing
        .filter((row) => row.tournamentGroupId && row.sideAParticipantId && row.sideBParticipantId)
        .map((row) =>
          logicalFixtureKey({
            tournamentGroupId: row.tournamentGroupId!,
            roundIndex: row.roundIndex,
            slotIndexInRound: row.slotIndexInRound,
            sideAParticipantId: row.sideAParticipantId!,
            sideBParticipantId: row.sideBParticipantId!,
          }),
        ),
    );
    if (
      existingKeys.size === expectedKeys.size &&
      [...expectedKeys].every((key) => existingKeys.has(key))
    ) {
      return {
        fixtures: existing.map((row) => toFixtureDefinition(row)),
        diagnostics: buildFixtureDiagnostics(strategy, existing, groups, generatedByGroup),
      };
    }
    throw new TournamentFixtureSetConflictError(
      "Existing group fixtures differ from the deterministic generated set",
    );
  }

  try {
    const rows = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const { groupId, fixture } of allGenerated) {
        const row = await tx.tournamentFixture.create({
          data: {
            tenantId,
            eventId: tournamentId,
            tournamentPhaseId: input.phaseId,
            tournamentGroupId: groupId,
            stageKey: fixture.stageKey,
            roundIndex: fixture.roundIndex,
            slotIndexInRound: fixture.slotIndexInRound,
            generatorKey: fixture.generatorKey,
            sideAParticipantId: fixture.sideAParticipantId,
            sideBParticipantId: fixture.sideBParticipantId,
          },
        });
        await tx.tournamentFixtureSide.createMany({
          data: [
            {
              tenantId,
              fixtureId: row.id,
              side: "A",
              sourceType: "CONCRETE_PARTICIPANT",
              participantId: fixture.sideAParticipantId,
            },
            {
              tenantId,
              fixtureId: row.id,
              side: "B",
              sourceType: "CONCRETE_PARTICIPANT",
              participantId: fixture.sideBParticipantId,
            },
          ],
        });
        created.push(row);
      }
      return created;
    });

    return {
      fixtures: rows.map((row) => toFixtureDefinition(row)),
      diagnostics: buildFixtureDiagnostics(strategy, rows, groups, generatedByGroup),
    };
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }
    const raced = await prisma.tournamentFixture.findMany({
      where: { tenantId, eventId: tournamentId, tournamentPhaseId: input.phaseId },
    });
    if (raced.length > 0) {
      return generateTournamentGroupFixturesForPhase(tenantId, input);
    }
    throw error;
  }
}

function buildFixtureDiagnostics(
  strategy: "ROUND_ROBIN" | "SMART_MIX",
  persisted: readonly { id: string; tournamentGroupId: string | null }[],
  groups: readonly { id: string }[],
  generatedByGroup: ReadonlyMap<string, TournamentFixtureGenerationDefinition[]>,
): GenerateTournamentGroupFixturesResult["diagnostics"] {
  const fixtureCountByGroup = countFixturesByGroup(persisted);
  const base = {
    fixtureCount: persisted.length,
    fixtureCountByGroup,
    strategy,
  };

  if (strategy !== "SMART_MIX") {
    return base;
  }

  const uniquePairCountByGroup: Record<string, number> = {};
  const repeatedPairCountByGroup: Record<string, number> = {};
  const maxPairMultiplicityByGroup: Record<string, number> = {};

  for (const group of groups) {
    const fixtures = generatedByGroup.get(group.id) ?? [];
    const stats = computeSmartMixPairDiagnostics(fixtures);
    uniquePairCountByGroup[group.id] = stats.uniquePairCount;
    repeatedPairCountByGroup[group.id] = stats.repeatedPairCount;
    maxPairMultiplicityByGroup[group.id] = stats.maxPairMultiplicity;
  }

  return {
    ...base,
    uniquePairCountByGroup,
    repeatedPairCountByGroup,
    maxPairMultiplicityByGroup,
  };
}

export async function formTournamentGroupsAndGenerateGroupFixtures(
  tenantId: string,
  input: FormTournamentGroupsAndGenerateFixturesInput,
): Promise<FormTournamentGroupsAndGenerateFixturesResult> {
  const formation = await formTournamentGroups(tenantId, {
    tournamentId: input.tournamentId,
    phaseId: input.phaseId,
    participantIds: input.participantIds,
    groupCount: input.groupCount,
  });

  const fixtures = await generateTournamentGroupFixturesForPhase(tenantId, {
    tournamentId: input.tournamentId,
    phaseId: input.phaseId,
    strategy: input.strategy,
    meetingsPerOpponent: input.meetingsPerOpponent,
    targetMatchesPerParticipant: input.targetMatchesPerParticipant,
    homeAwayRelevance: input.homeAwayRelevance,
  });

  return { formation, fixtures };
}
