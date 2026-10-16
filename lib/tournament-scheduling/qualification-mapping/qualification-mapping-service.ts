/**
 * SCE-TOURNAMENT-PLANNER-01E3D — group → knockout qualification mapping persistence + bracket integration.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getTournamentCompetitionConfiguration,
  getTournamentPhase,
  listTournamentGroupsForPhase,
} from "../competition-structure/competition-structure-service";
import type { TournamentFixtureSideLabel } from "../competition-structure/types";
import {
  TournamentCompetitionConflictError,
  TournamentCompetitionNotFoundError,
  TournamentCompetitionValidationError,
  TournamentFormatUnsupportedError,
} from "../errors";
import { requireTenantOrganisedTournament } from "../internal/require-tenant-organised-tournament";
import { generateKnockoutBracketForPhase } from "../knockout-bracket/knockout-bracket-service";
import type { GenerateKnockoutBracketForPhaseResult } from "../knockout-bracket/knockout-bracket-types";
import {
  buildKnockoutEntrantOrderFromMappingsPure,
  generateDefaultGroupRankMappingsPure,
  mappingFingerprint,
  QualificationMappingValidationError,
  validateGroupRankMappingsPure,
} from "./qualification-mapping-pure";
import type {
  GroupRankToKnockoutEntryMapping,
  QualificationMappingModeInput,
} from "./qualification-mapping-types";

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function mapPureValidationError(error: QualificationMappingValidationError): never {
  if (
    error.code === "DUPLICATE_SOURCE" ||
    error.code === "DUPLICATE_TARGET" ||
    error.code === "STRUCTURAL_CONFLICT"
  ) {
    throw new TournamentCompetitionConflictError(error.message);
  }
  throw new TournamentCompetitionValidationError(error.message);
}

function groupRankKey(sourceGroupId: string, rank: number): string {
  return `${sourceGroupId}:${rank}`;
}

export interface ApplyGroupToKnockoutQualificationInput {
  tournamentId: string;
  groupPhaseId: string;
  knockoutPhaseId: string;
  mapping: QualificationMappingModeInput;
}

export interface ApplyGroupToKnockoutQualificationResult extends GenerateKnockoutBracketForPhaseResult {
  mappings: GroupRankToKnockoutEntryMapping[];
  mappingFingerprint: string;
}

function assertGroupPlusKnockout(
  format: "GROUP_MIX_ONLY" | "KNOCKOUT_ONLY" | "GROUP_PLUS_KNOCKOUT",
): void {
  if (format !== "GROUP_PLUS_KNOCKOUT") {
    throw new TournamentFormatUnsupportedError(
      "Group → knockout qualification mapping applies only to GROUP_PLUS_KNOCKOUT",
    );
  }
}

async function loadGroupParticipantCounts(
  tenantId: string,
  tournamentId: string,
  groupIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const groupId of groupIds) {
    const count = await prisma.tournamentGroupMembership.count({
      where: { tenantId, eventId: tournamentId, tournamentGroupId: groupId },
    });
    counts.set(groupId, count);
  }
  return counts;
}

async function resolveMappings(
  tenantId: string,
  tournamentId: string,
  groupPhaseId: string,
  mapping: QualificationMappingModeInput,
): Promise<GroupRankToKnockoutEntryMapping[]> {
  const groups = await listTournamentGroupsForPhase(tenantId, tournamentId, groupPhaseId);
  if (mapping.mode === "EXPLICIT") {
    const entrantCount = mapping.mappings.length;
    const groupIds = [...new Set(mapping.mappings.map((m) => m.source.sourceGroupId))];
    const participantCounts = await loadGroupParticipantCounts(tenantId, tournamentId, groupIds);
    try {
      validateGroupRankMappingsPure({
        mappings: mapping.mappings,
        entrantCount,
        groupParticipantCountById: participantCounts,
      });
    } catch (error) {
      if (error instanceof QualificationMappingValidationError) {
        mapPureValidationError(error);
      }
      throw error;
    }
    for (const m of mapping.mappings) {
      const group = groups.find((g) => g.id === m.source.sourceGroupId);
      if (!group) {
        const foreign = await prisma.tournamentGroup.findFirst({
          where: { id: m.source.sourceGroupId, tenantId, eventId: tournamentId },
        });
        if (!foreign) {
          throw new TournamentCompetitionValidationError(
            `GROUP_RANK source group not found in tournament: ${m.source.sourceGroupId}`,
          );
        }
        throw new TournamentCompetitionValidationError(
          `GROUP_RANK source group must belong to the configured GROUP_MIX phase`,
        );
      }
    }
    return [...mapping.mappings];
  }

  try {
    const generated = generateDefaultGroupRankMappingsPure({
      groups,
      qualifiersPerGroup: mapping.qualifiersPerGroup,
    });
    const groupIds = groups.map((g) => g.id);
    const participantCounts = await loadGroupParticipantCounts(tenantId, tournamentId, groupIds);
    validateGroupRankMappingsPure({
      mappings: generated.mappings,
      entrantCount: generated.entrantCount,
      groupParticipantCountById: participantCounts,
    });
    return generated.mappings;
  } catch (error) {
    if (error instanceof QualificationMappingValidationError) {
      mapPureValidationError(error);
    }
    throw error;
  }
}

async function validatePhaseOrdering(
  tenantId: string,
  tournamentId: string,
  groupPhaseId: string,
  knockoutPhaseId: string,
): Promise<void> {
  const groupPhase = await getTournamentPhase(tenantId, tournamentId, groupPhaseId);
  const knockoutPhase = await getTournamentPhase(tenantId, tournamentId, knockoutPhaseId);
  if (groupPhase.phaseType !== "GROUP_MIX") {
    throw new TournamentCompetitionValidationError("groupPhaseId must reference a GROUP_MIX phase");
  }
  if (knockoutPhase.phaseType !== "KNOCKOUT") {
    throw new TournamentCompetitionValidationError(
      "knockoutPhaseId must reference a KNOCKOUT phase",
    );
  }
  if (groupPhase.displayOrder >= knockoutPhase.displayOrder) {
    throw new TournamentCompetitionValidationError(
      "GROUP_MIX phase must have lower displayOrder than target KNOCKOUT phase",
    );
  }
}

async function getOrCreateGroupRankQualificationSource(
  tx: Prisma.TransactionClient,
  tenantId: string,
  tournamentId: string,
  sourceGroupId: string,
  rank: number,
): Promise<string> {
  const existing = await tx.tournamentQualificationSource.findFirst({
    where: {
      tenantId,
      eventId: tournamentId,
      sourceType: "GROUP_RANK",
      sourceGroupId,
      rank,
    },
  });
  if (existing) {
    return existing.id;
  }
  const created = await tx.tournamentQualificationSource.create({
    data: {
      tenantId,
      eventId: tournamentId,
      sourceType: "GROUP_RANK",
      sourceGroupId,
      rank,
    },
  });
  return created.id;
}

type PersistedMappingRow = {
  sourceGroupId: string;
  rank: number;
  roundIndex: number;
  slotIndexInRound: number;
  side: TournamentFixtureSideLabel;
  qualificationSourceId: string;
};

function rowsToMappings(rows: readonly PersistedMappingRow[]): GroupRankToKnockoutEntryMapping[] {
  return rows.map((row) => ({
    source: { sourceGroupId: row.sourceGroupId, rank: row.rank },
    target: {
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      side: row.side,
    },
  }));
}

function mappingsMatchPersisted(
  mappings: readonly GroupRankToKnockoutEntryMapping[],
  rows: readonly PersistedMappingRow[],
): boolean {
  return mappingFingerprint(mappings) === mappingFingerprint(rowsToMappings(rows));
}

export async function listKnockoutQualificationMappings(
  tenantId: string,
  tournamentId: string,
  knockoutPhaseId: string,
): Promise<GroupRankToKnockoutEntryMapping[]> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  const rows = await prisma.tournamentKnockoutQualificationMapping.findMany({
    where: { tenantId, eventId: tournamentId, knockoutPhaseId },
    orderBy: [
      { roundIndex: "asc" },
      { slotIndexInRound: "asc" },
      { side: "asc" },
    ],
  });
  return rowsToMappings(rows);
}

export async function applyGroupToKnockoutQualificationAndGenerateBracket(
  tenantId: string,
  input: ApplyGroupToKnockoutQualificationInput,
): Promise<ApplyGroupToKnockoutQualificationResult> {
  const tournamentId = input.tournamentId;
  await requireTenantOrganisedTournament(tenantId, tournamentId);

  const config = await getTournamentCompetitionConfiguration(tenantId, tournamentId);
  if (!config) {
    throw new TournamentCompetitionNotFoundError(tournamentId);
  }
  assertGroupPlusKnockout(config.competitionFormat);
  await validatePhaseOrdering(
    tenantId,
    tournamentId,
    input.groupPhaseId,
    input.knockoutPhaseId,
  );

  const mappings = await resolveMappings(
    tenantId,
    tournamentId,
    input.groupPhaseId,
    input.mapping,
  );
  const fingerprint = mappingFingerprint(mappings);
  const entrantCount = mappings.length;

  const existingRows = await prisma.tournamentKnockoutQualificationMapping.findMany({
    where: { tenantId, eventId: tournamentId, knockoutPhaseId: input.knockoutPhaseId },
  });

  if (existingRows.length > 0 && !mappingsMatchPersisted(mappings, existingRows)) {
    throw new TournamentCompetitionConflictError(
      "Existing knockout qualification mappings differ from requested mapping (structural drift)",
    );
  }

  if (existingRows.length > 0 && mappingsMatchPersisted(mappings, existingRows)) {
    const qualMap = new Map<string, string>();
    for (const row of existingRows) {
      qualMap.set(groupRankKey(row.sourceGroupId, row.rank), row.qualificationSourceId);
    }
    const { entrants } = buildKnockoutEntrantOrderFromMappingsPure({
      entrantCount,
      qualificationSourceIdByGroupRank: qualMap,
      mappings,
    });
    const bracket = await generateKnockoutBracketForPhase(tenantId, {
      tournamentId,
      phaseId: input.knockoutPhaseId,
      entrants,
    });
    return { ...bracket, mappings, mappingFingerprint: fingerprint };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const qualIdByGroupRank = new Map<string, string>();
      const persistedRows: PersistedMappingRow[] = [];

      for (const mapping of mappings) {
        const qualId = await getOrCreateGroupRankQualificationSource(
          tx,
          tenantId,
          tournamentId,
          mapping.source.sourceGroupId,
          mapping.source.rank,
        );
        qualIdByGroupRank.set(
          groupRankKey(mapping.source.sourceGroupId, mapping.source.rank),
          qualId,
        );

        await tx.tournamentKnockoutQualificationMapping.create({
          data: {
            tenantId,
            eventId: tournamentId,
            knockoutPhaseId: input.knockoutPhaseId,
            sourceGroupId: mapping.source.sourceGroupId,
            rank: mapping.source.rank,
            roundIndex: mapping.target.roundIndex,
            slotIndexInRound: mapping.target.slotIndexInRound,
            side: mapping.target.side,
            qualificationSourceId: qualId,
          },
        });

        persistedRows.push({
          sourceGroupId: mapping.source.sourceGroupId,
          rank: mapping.source.rank,
          roundIndex: mapping.target.roundIndex,
          slotIndexInRound: mapping.target.slotIndexInRound,
          side: mapping.target.side,
          qualificationSourceId: qualId,
        });
      }

      const { entrants } = buildKnockoutEntrantOrderFromMappingsPure({
        entrantCount,
        qualificationSourceIdByGroupRank: qualIdByGroupRank,
        mappings,
      });

      return { entrants, persistedRows };
    });

    let bracket: GenerateKnockoutBracketForPhaseResult;
    try {
      bracket = await generateKnockoutBracketForPhase(tenantId, {
        tournamentId,
        phaseId: input.knockoutPhaseId,
        entrants: result.entrants,
      });
    } catch (bracketError) {
      await prisma.tournamentKnockoutQualificationMapping.deleteMany({
        where: { tenantId, eventId: tournamentId, knockoutPhaseId: input.knockoutPhaseId },
      });
      throw bracketError;
    }

    return { ...bracket, mappings, mappingFingerprint: fingerprint };
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }
    const raced = await prisma.tournamentKnockoutQualificationMapping.findMany({
      where: { tenantId, eventId: tournamentId, knockoutPhaseId: input.knockoutPhaseId },
    });
    if (raced.length === 0) {
      throw error;
    }
    return applyGroupToKnockoutQualificationAndGenerateBracket(tenantId, input);
  }
}
