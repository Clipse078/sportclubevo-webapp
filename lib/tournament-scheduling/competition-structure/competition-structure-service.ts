/**
 * SCE-TOURNAMENT-PLANNER-01E3A — competition format, phases, groups, ranking, qualification, fixture sides.
 */

import { prisma } from "@/lib/db/prisma";
import { requireTenantOrganisedTournament } from "../internal/require-tenant-organised-tournament";
import {
  TournamentCompetitionConflictError,
  TournamentCompetitionNotFoundError,
  TournamentCompetitionValidationError,
  TournamentGroupNotFoundError,
  TournamentPhaseNotFoundError,
  TournamentQualificationSourceNotFoundError,
} from "../errors";
import {
  DEFAULT_FOOTBALL_RANKING_POINTS,
  DEFAULT_FOOTBALL_TIEBREAK_ORDER,
  FORMAT_PHASE_BLUEPRINT,
  LEGACY_DEFAULT_GROUP_MIX_LABEL,
  LEGACY_DEFAULT_STAGE_KEY,
} from "./constants";
import type {
  FixtureSideInput,
  GroupRankQualificationInput,
  TournamentCompetitionConfigurationDefinition,
  TournamentCompetitionFormat,
  TournamentFixtureSideDefinition,
  TournamentGroupDefinition,
  TournamentGroupMembershipDefinition,
  TournamentGroupMixGenerationStrategy,
  TournamentPhaseDefinition,
  TournamentPhaseType,
  TournamentQualificationSourceDefinition,
  TournamentRankingConfigurationDefinition,
} from "./types";

function toCompetitionConfiguration(row: {
  id: string;
  eventId: string;
  competitionFormat: TournamentCompetitionFormat;
}): TournamentCompetitionConfigurationDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    competitionFormat: row.competitionFormat,
  };
}

function toPhase(row: {
  id: string;
  eventId: string;
  displayOrder: number;
  phaseType: TournamentPhaseType;
  label: string;
  stageKey: string;
  groupMixStrategy: TournamentGroupMixGenerationStrategy | null;
  smartMixTargetMatchesPerParticipant: number | null;
}): TournamentPhaseDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    displayOrder: row.displayOrder,
    phaseType: row.phaseType,
    label: row.label,
    stageKey: row.stageKey,
    groupMixStrategy: row.groupMixStrategy,
    smartMixTargetMatchesPerParticipant: row.smartMixTargetMatchesPerParticipant,
  };
}

function toGroup(row: {
  id: string;
  eventId: string;
  tournamentPhaseId: string;
  displayOrder: number;
  label: string;
}): TournamentGroupDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    tournamentPhaseId: row.tournamentPhaseId,
    displayOrder: row.displayOrder,
    label: row.label,
  };
}

function toMembership(row: {
  id: string;
  eventId: string;
  tournamentGroupId: string;
  tournamentParticipantId: string;
}): TournamentGroupMembershipDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    tournamentGroupId: row.tournamentGroupId,
    tournamentParticipantId: row.tournamentParticipantId,
  };
}

function toRankingConfiguration(row: {
  id: string;
  eventId: string;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  tiebreakOrder: readonly ("POINTS" | "GOAL_DIFFERENCE" | "GOALS_SCORED" | "HEAD_TO_HEAD")[];
}): TournamentRankingConfigurationDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    winPoints: row.winPoints,
    drawPoints: row.drawPoints,
    lossPoints: row.lossPoints,
    tiebreakOrder: row.tiebreakOrder,
  };
}

function toQualificationSource(row: {
  id: string;
  eventId: string;
  sourceType: "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE";
  sourceGroupId: string | null;
  rank: number | null;
  sourceFixtureId: string | null;
}): TournamentQualificationSourceDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    sourceType: row.sourceType,
    sourceGroupId: row.sourceGroupId,
    rank: row.rank,
    sourceFixtureId: row.sourceFixtureId,
  };
}

function toFixtureSide(row: {
  id: string;
  fixtureId: string;
  side: "A" | "B";
  sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";
  participantId: string | null;
  qualificationSourceId: string | null;
}): TournamentFixtureSideDefinition {
  return {
    id: row.id,
    fixtureId: row.fixtureId,
    side: row.side,
    sourceType: row.sourceType,
    participantId: row.participantId,
    qualificationSourceId: row.qualificationSourceId,
  };
}

async function assertNoGeneratedFixtures(tenantId: string, tournamentId: string): Promise<void> {
  const count = await prisma.tournamentFixture.count({
    where: { tenantId, eventId: tournamentId },
  });
  if (count > 0) {
    throw new TournamentCompetitionConflictError(
      "Competition topology cannot change while generated fixtures exist; use future regeneration (01G)",
    );
  }
}

function validateFormatPhaseBlueprint(format: TournamentCompetitionFormat): void {
  const blueprint = FORMAT_PHASE_BLUEPRINT[format];
  if (!blueprint || blueprint.length === 0) {
    throw new TournamentCompetitionValidationError(`Unsupported competition format: ${format}`);
  }
}

export async function getTournamentCompetitionConfiguration(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentCompetitionConfigurationDefinition | null> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  const row = await prisma.tournamentCompetitionConfiguration.findFirst({
    where: { tenantId, eventId: tournamentId },
  });
  return row ? toCompetitionConfiguration(row) : null;
}

export async function upsertTournamentCompetitionConfiguration(
  tenantId: string,
  tournamentId: string,
  competitionFormat: TournamentCompetitionFormat,
): Promise<TournamentCompetitionConfigurationDefinition> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  validateFormatPhaseBlueprint(competitionFormat);
  await assertNoGeneratedFixtures(tenantId, tournamentId);

  const row = await prisma.$transaction(async (tx) => {
    const config = await tx.tournamentCompetitionConfiguration.upsert({
      where: { eventId: tournamentId },
      create: { tenantId, eventId: tournamentId, competitionFormat },
      update: { competitionFormat },
    });

    await tx.tournamentPhase.deleteMany({ where: { tenantId, eventId: tournamentId } });

    const blueprint = FORMAT_PHASE_BLUEPRINT[competitionFormat];
    for (let i = 0; i < blueprint.length; i++) {
      const spec = blueprint[i]!;
      await tx.tournamentPhase.create({
        data: {
          tenantId,
          eventId: tournamentId,
          displayOrder: i + 1,
          phaseType: spec.phaseType,
          label: spec.label,
          stageKey: spec.stageKey,
        },
      });
    }

    await tx.tournamentRankingConfiguration.upsert({
      where: { eventId: tournamentId },
      create: {
        tenantId,
        eventId: tournamentId,
        winPoints: DEFAULT_FOOTBALL_RANKING_POINTS.winPoints,
        drawPoints: DEFAULT_FOOTBALL_RANKING_POINTS.drawPoints,
        lossPoints: DEFAULT_FOOTBALL_RANKING_POINTS.lossPoints,
        tiebreakOrder: [...DEFAULT_FOOTBALL_TIEBREAK_ORDER],
      },
      update: {},
    });

    return config;
  });

  return toCompetitionConfiguration(row);
}

export async function listTournamentPhases(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentPhaseDefinition[]> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  const rows = await prisma.tournamentPhase.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  return rows.map(toPhase);
}

export async function getTournamentPhase(
  tenantId: string,
  tournamentId: string,
  phaseId: string,
): Promise<TournamentPhaseDefinition> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  const row = await prisma.tournamentPhase.findFirst({
    where: { id: phaseId, tenantId, eventId: tournamentId },
  });
  if (!row) {
    throw new TournamentPhaseNotFoundError(phaseId);
  }
  return toPhase(row);
}

export async function updateTournamentPhaseGroupMixStrategy(
  tenantId: string,
  tournamentId: string,
  phaseId: string,
  input: {
    groupMixStrategy: TournamentGroupMixGenerationStrategy;
    smartMixTargetMatchesPerParticipant?: number | null;
  },
): Promise<TournamentPhaseDefinition> {
  const phase = await getTournamentPhase(tenantId, tournamentId, phaseId);
  if (phase.phaseType !== "GROUP_MIX") {
    throw new TournamentCompetitionValidationError(
      "Group/mix generation strategy applies only to GROUP_MIX phases",
    );
  }
  if (input.groupMixStrategy === "SMART_MIX" && input.smartMixTargetMatchesPerParticipant == null) {
    throw new TournamentCompetitionValidationError(
      "smartMixTargetMatchesPerParticipant is required when strategy is SMART_MIX",
    );
  }

  const row = await prisma.tournamentPhase.update({
    where: { id: phaseId },
    data: {
      groupMixStrategy: input.groupMixStrategy,
      smartMixTargetMatchesPerParticipant:
        input.groupMixStrategy === "SMART_MIX"
          ? (input.smartMixTargetMatchesPerParticipant ?? null)
          : null,
    },
  });
  return toPhase(row);
}

/**
 * Legacy compatibility (LEGACY_TOURNAMENT_PHASE_COMPATIBILITY):
 * - Pre-01E3A tournaments without explicit configuration receive synthetic GROUP_MIX_ONLY
 *   + a single GROUP_MIX phase for stageKey MAIN (never silently upgraded to GROUP_PLUS_KNOCKOUT).
 * - Invoked automatically before 01E1/01E2 generation when no phaseId is supplied.
 */
export async function ensureLegacyGroupMixPhaseForGeneration(
  tenantId: string,
  tournamentId: string,
  stageKey: string = LEGACY_DEFAULT_STAGE_KEY,
): Promise<TournamentPhaseDefinition> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);

  const existing = await prisma.tournamentPhase.findFirst({
    where: { tenantId, eventId: tournamentId, stageKey },
  });
  if (existing) {
    return toPhase(existing);
  }

  const config = await prisma.tournamentCompetitionConfiguration.findFirst({
    where: { tenantId, eventId: tournamentId },
  });
  if (config) {
    throw new TournamentCompetitionValidationError(
      `Configured tournament is missing phase for stageKey "${stageKey}"`,
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    await tx.tournamentCompetitionConfiguration.create({
      data: {
        tenantId,
        eventId: tournamentId,
        competitionFormat: "GROUP_MIX_ONLY",
      },
    });
    const phase = await tx.tournamentPhase.create({
      data: {
        tenantId,
        eventId: tournamentId,
        displayOrder: 1,
        phaseType: "GROUP_MIX",
        label: LEGACY_DEFAULT_GROUP_MIX_LABEL,
        stageKey,
      },
    });
    await tx.tournamentFixture.updateMany({
      where: { tenantId, eventId: tournamentId, stageKey, tournamentPhaseId: null },
      data: { tournamentPhaseId: phase.id },
    });
    return phase;
  });

  return toPhase(row);
}

export async function createTournamentGroup(
  tenantId: string,
  tournamentId: string,
  phaseId: string,
  input: { label: string; displayOrder: number },
): Promise<TournamentGroupDefinition> {
  const phase = await getTournamentPhase(tenantId, tournamentId, phaseId);
  if (phase.phaseType !== "GROUP_MIX") {
    throw new TournamentCompetitionValidationError("Groups are supported only on GROUP_MIX phases");
  }

  const row = await prisma.tournamentGroup.create({
    data: {
      tenantId,
      eventId: tournamentId,
      tournamentPhaseId: phaseId,
      label: input.label.trim(),
      displayOrder: input.displayOrder,
    },
  });
  return toGroup(row);
}

export async function renameTournamentGroup(
  tenantId: string,
  tournamentId: string,
  groupId: string,
  label: string,
): Promise<TournamentGroupDefinition> {
  const group = await prisma.tournamentGroup.findFirst({
    where: { id: groupId, tenantId, eventId: tournamentId },
  });
  if (!group) {
    throw new TournamentGroupNotFoundError(groupId);
  }
  const row = await prisma.tournamentGroup.update({
    where: { id: groupId },
    data: { label: label.trim() },
  });
  return toGroup(row);
}

export async function listTournamentGroupsForPhase(
  tenantId: string,
  tournamentId: string,
  phaseId: string,
): Promise<TournamentGroupDefinition[]> {
  await getTournamentPhase(tenantId, tournamentId, phaseId);
  const rows = await prisma.tournamentGroup.findMany({
    where: { tenantId, eventId: tournamentId, tournamentPhaseId: phaseId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  return rows.map(toGroup);
}

async function requireParticipantInTournament(
  tenantId: string,
  tournamentId: string,
  participantId: string,
): Promise<void> {
  const participant = await prisma.tournamentParticipant.findFirst({
    where: { id: participantId, tenantId, eventId: tournamentId },
    select: { id: true },
  });
  if (!participant) {
    throw new TournamentCompetitionValidationError(
      `Participant "${participantId}" is not part of tournament "${tournamentId}"`,
    );
  }
}

export async function assignParticipantToTournamentGroup(
  tenantId: string,
  tournamentId: string,
  groupId: string,
  participantId: string,
): Promise<TournamentGroupMembershipDefinition> {
  const group = await prisma.tournamentGroup.findFirst({
    where: { id: groupId, tenantId, eventId: tournamentId },
    include: { phase: true },
  });
  if (!group) {
    throw new TournamentGroupNotFoundError(groupId);
  }
  if (group.phase.phaseType !== "GROUP_MIX") {
    throw new TournamentCompetitionValidationError("Group membership requires a GROUP_MIX phase");
  }

  await requireParticipantInTournament(tenantId, tournamentId, participantId);

  const otherGroupMembership = await prisma.tournamentGroupMembership.findFirst({
    where: {
      tenantId,
      eventId: tournamentId,
      tournamentParticipantId: participantId,
      group: { tournamentPhaseId: group.tournamentPhaseId },
      NOT: { tournamentGroupId: groupId },
    },
  });
  if (otherGroupMembership) {
    throw new TournamentCompetitionValidationError(
      "Participant already belongs to another group in the same group phase",
    );
  }

  const row = await prisma.tournamentGroupMembership.upsert({
    where: {
      tournamentGroupId_tournamentParticipantId: {
        tournamentGroupId: groupId,
        tournamentParticipantId: participantId,
      },
    },
    create: {
      tenantId,
      eventId: tournamentId,
      tournamentGroupId: groupId,
      tournamentParticipantId: participantId,
    },
    update: {},
  });
  return toMembership(row);
}

export async function moveParticipantBetweenTournamentGroups(
  tenantId: string,
  tournamentId: string,
  fromGroupId: string,
  toGroupId: string,
  participantId: string,
): Promise<TournamentGroupMembershipDefinition> {
  if (fromGroupId === toGroupId) {
    throw new TournamentCompetitionValidationError("Source and destination group must differ");
  }

  const groupScopedFixtures = await prisma.tournamentFixture.count({
    where: {
      tenantId,
      eventId: tournamentId,
      tournamentGroupId: { in: [fromGroupId, toGroupId] },
    },
  });
  if (groupScopedFixtures > 0) {
    throw new TournamentCompetitionConflictError(
      "Cannot move participants between groups while group fixtures exist; use future regeneration (01G)",
    );
  }

  await prisma.tournamentGroupMembership.deleteMany({
    where: {
      tenantId,
      eventId: tournamentId,
      tournamentGroupId: fromGroupId,
      tournamentParticipantId: participantId,
    },
  });
  return assignParticipantToTournamentGroup(tenantId, tournamentId, toGroupId, participantId);
}

export async function getTournamentRankingConfiguration(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentRankingConfigurationDefinition | null> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  const row = await prisma.tournamentRankingConfiguration.findFirst({
    where: { tenantId, eventId: tournamentId },
  });
  return row ? toRankingConfiguration(row) : null;
}

export async function upsertTournamentRankingConfiguration(
  tenantId: string,
  tournamentId: string,
  input: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    tiebreakOrder: readonly ("POINTS" | "GOAL_DIFFERENCE" | "GOALS_SCORED" | "HEAD_TO_HEAD")[];
  },
): Promise<TournamentRankingConfigurationDefinition> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  if (input.tiebreakOrder.length === 0) {
    throw new TournamentCompetitionValidationError("At least one tiebreak criterion is required");
  }
  const row = await prisma.tournamentRankingConfiguration.upsert({
    where: { eventId: tournamentId },
    create: {
      tenantId,
      eventId: tournamentId,
      winPoints: input.winPoints,
      drawPoints: input.drawPoints,
      lossPoints: input.lossPoints,
      tiebreakOrder: [...input.tiebreakOrder],
    },
    update: {
      winPoints: input.winPoints,
      drawPoints: input.drawPoints,
      lossPoints: input.lossPoints,
      tiebreakOrder: [...input.tiebreakOrder],
    },
  });
  return toRankingConfiguration(row);
}

export async function createGroupRankQualificationSource(
  tenantId: string,
  tournamentId: string,
  input: GroupRankQualificationInput,
): Promise<TournamentQualificationSourceDefinition> {
  if (input.rank < 1) {
    throw new TournamentCompetitionValidationError("GROUP_RANK rank must be >= 1");
  }

  const group = await prisma.tournamentGroup.findFirst({
    where: { id: input.sourceGroupId, tenantId, eventId: tournamentId },
    include: { phase: true },
  });
  if (!group) {
    throw new TournamentGroupNotFoundError(input.sourceGroupId);
  }
  if (group.phase.phaseType !== "GROUP_MIX") {
    throw new TournamentCompetitionValidationError(
      "GROUP_RANK qualification must reference a group in a GROUP_MIX phase",
    );
  }

  const row = await prisma.tournamentQualificationSource.create({
    data: {
      tenantId,
      eventId: tournamentId,
      sourceType: "GROUP_RANK",
      sourceGroupId: input.sourceGroupId,
      rank: input.rank,
    },
  });
  return toQualificationSource(row);
}

async function validateQualificationSourceForFixtureSide(
  tenantId: string,
  tournamentId: string,
  qualificationSourceId: string,
  destinationPhaseId: string,
): Promise<TournamentQualificationSourceDefinition> {
  const source = await prisma.tournamentQualificationSource.findFirst({
    where: { id: qualificationSourceId, tenantId, eventId: tournamentId },
    include: { sourceGroup: { include: { phase: true } } },
  });
  if (!source) {
    throw new TournamentQualificationSourceNotFoundError(qualificationSourceId);
  }

  const destinationPhase = await getTournamentPhase(tenantId, tournamentId, destinationPhaseId);

  if (source.sourceType === "GROUP_RANK") {
    const sourcePhaseOrder = source.sourceGroup?.phase.displayOrder;
    if (sourcePhaseOrder == null) {
      throw new TournamentCompetitionValidationError("GROUP_RANK source group is missing phase");
    }
    if (sourcePhaseOrder >= destinationPhase.displayOrder) {
      throw new TournamentCompetitionValidationError(
        "GROUP_RANK source must come from an earlier GROUP_MIX phase than the destination fixture phase",
      );
    }
    if (source.sourceGroup?.phase.phaseType !== "GROUP_MIX") {
      throw new TournamentCompetitionValidationError(
        "GROUP_RANK source group must belong to a GROUP_MIX phase",
      );
    }
  }

  return toQualificationSource(source);
}

function validateFixtureSideInput(side: FixtureSideInput): void {
  if (side.kind === "CONCRETE_PARTICIPANT" && !side.participantId) {
    throw new TournamentCompetitionValidationError("Concrete fixture side requires participantId");
  }
  if (side.kind === "QUALIFICATION_REFERENCE" && !side.qualificationSourceId) {
    throw new TournamentCompetitionValidationError(
      "Qualification fixture side requires qualificationSourceId",
    );
  }
}

export async function persistTournamentFixtureSides(
  tenantId: string,
  tournamentId: string,
  fixtureId: string,
  tournamentPhaseId: string,
  sideA: FixtureSideInput,
  sideB: FixtureSideInput,
): Promise<TournamentFixtureSideDefinition[]> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  validateFixtureSideInput(sideA);
  validateFixtureSideInput(sideB);

  const fixture = await prisma.tournamentFixture.findFirst({
    where: { id: fixtureId, tenantId, eventId: tournamentId },
  });
  if (!fixture) {
    throw new TournamentCompetitionValidationError(`Fixture not found: ${fixtureId}`);
  }

  if (sideA.kind === "CONCRETE_PARTICIPANT") {
    await requireParticipantInTournament(tenantId, tournamentId, sideA.participantId);
  } else {
    await validateQualificationSourceForFixtureSide(
      tenantId,
      tournamentId,
      sideA.qualificationSourceId,
      tournamentPhaseId,
    );
  }
  if (sideB.kind === "CONCRETE_PARTICIPANT") {
    await requireParticipantInTournament(tenantId, tournamentId, sideB.participantId);
  } else {
    await validateQualificationSourceForFixtureSide(
      tenantId,
      tournamentId,
      sideB.qualificationSourceId,
      tournamentPhaseId,
    );
  }

  if (
    sideA.kind === "CONCRETE_PARTICIPANT" &&
    sideB.kind === "CONCRETE_PARTICIPANT" &&
    sideA.participantId === sideB.participantId
  ) {
    throw new TournamentCompetitionValidationError(
      "Fixture sides must reference two distinct tournament participants",
    );
  }

  const sideAParticipantId = sideA.kind === "CONCRETE_PARTICIPANT" ? sideA.participantId : null;
  const sideBParticipantId = sideB.kind === "CONCRETE_PARTICIPANT" ? sideB.participantId : null;

  const rows = await prisma.$transaction(async (tx) => {
    await tx.tournamentFixtureSide.deleteMany({ where: { fixtureId } });
    await tx.tournamentFixture.update({
      where: { id: fixtureId },
      data: {
        tournamentPhaseId,
        sideAParticipantId,
        sideBParticipantId,
      },
    });

    const created = [];
    for (const [side, input] of [
      ["A", sideA],
      ["B", sideB],
    ] as const) {
      const row = await tx.tournamentFixtureSide.create({
        data: {
          tenantId,
          fixtureId,
          side,
          sourceType:
            input.kind === "CONCRETE_PARTICIPANT"
              ? "CONCRETE_PARTICIPANT"
              : "QUALIFICATION_REFERENCE",
          participantId: input.kind === "CONCRETE_PARTICIPANT" ? input.participantId : null,
          qualificationSourceId:
            input.kind === "QUALIFICATION_REFERENCE" ? input.qualificationSourceId : null,
        },
      });
      created.push(row);
    }
    return created;
  });

  return rows.map(toFixtureSide);
}

export async function listTournamentFixtureSides(
  tenantId: string,
  fixtureId: string,
): Promise<TournamentFixtureSideDefinition[]> {
  const rows = await prisma.tournamentFixtureSide.findMany({
    where: { tenantId, fixtureId },
    orderBy: [{ side: "asc" }],
  });
  return rows.map(toFixtureSide);
}

export async function getTournamentCompetitionConfigurationOrThrow(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentCompetitionConfigurationDefinition> {
  const config = await getTournamentCompetitionConfiguration(tenantId, tournamentId);
  if (!config) {
    throw new TournamentCompetitionNotFoundError(tournamentId);
  }
  return config;
}
