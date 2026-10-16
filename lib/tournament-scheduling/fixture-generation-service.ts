/**
 * SCE-TOURNAMENT-PLANNER-01C — round-robin fixture generation + persistence bridge.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TournamentFixtureDefinition } from "./types";
import { requireTournamentEvent } from "./internal/require-tournament";
import {
  TournamentFixtureSetConflictError,
  TournamentFixturesAlreadyExistError,
  TournamentGenerationInvalidError,
  TournamentParticipantLimitExceededError,
  TournamentParticipantsInsufficientError,
  TournamentFormatUnsupportedError,
  TournamentScheduleParticipantInvalidError,
} from "./errors";
import {
  canonicalizeParticipantIds,
  compareParticipantId,
  generateRoundRobinFixtures,
  RoundRobinGenerationValidationError,
  TOURNAMENT_FIXTURE_STAGE_MAIN,
  type RoundRobinGenerationConfig,
  fixtureDefinitionsToLogicalKeys,
  persistedFixturesToLogicalKeys,
  logicalFixtureSetsEqual,
  participantIdsFromFixtures,
  type TournamentFixtureGenerationDefinition,
} from "./fixtures";
import { listTournamentFixtures } from "./fixture-service";

function toDefinition(row: {
  id: string;
  eventId: string;
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  generatorKey: string | null;
  sideAParticipantId: string;
  sideBParticipantId: string;
}): TournamentFixtureDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    stageKey: row.stageKey,
    roundIndex: row.roundIndex,
    slotIndexInRound: row.slotIndexInRound,
    generatorKey: row.generatorKey,
    sideAParticipantId: row.sideAParticipantId,
    sideBParticipantId: row.sideBParticipantId,
  };
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function sortFixtureDefinitions(rows: TournamentFixtureDefinition[]): TournamentFixtureDefinition[] {
  return [...rows].sort((a, b) => {
    if (a.stageKey !== b.stageKey) return compareParticipantId(a.stageKey, b.stageKey);
    if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
    if (a.slotIndexInRound !== b.slotIndexInRound) {
      return a.slotIndexInRound - b.slotIndexInRound;
    }
    return compareParticipantId(a.id, b.id);
  });
}

function reconcileExistingFixtures(
  tournamentId: string,
  generated: readonly TournamentFixtureGenerationDefinition[],
  existing: TournamentFixtureDefinition[],
  canonicalIdSet: Set<string>,
): TournamentFixtureDefinition[] | null {
  if (existing.length === 0) {
    return null;
  }

  const expectedKeys = fixtureDefinitionsToLogicalKeys(generated);
  const existingKeys = persistedFixturesToLogicalKeys(existing);

  if (logicalFixtureSetsEqual(expectedKeys, existingKeys)) {
    return existing;
  }

  const fixtureParticipantIds = participantIdsFromFixtures(existing);
  const currentMatchesFixtureParticipants =
    fixtureParticipantIds.size === canonicalIdSet.size &&
    [...fixtureParticipantIds].every((id) => canonicalIdSet.has(id));

  if (!currentMatchesFixtureParticipants) {
    throw new TournamentFixtureSetConflictError(
      "Tournament participants changed after fixtures were generated; controlled regeneration is required",
    );
  }

  throw new TournamentFixturesAlreadyExistError(
    tournamentId,
    "Existing tournament fixtures differ from the deterministic round-robin set",
  );
}

function mapPureValidationError(error: RoundRobinGenerationValidationError): never {
  switch (error.code) {
    case "TOURNAMENT_PARTICIPANTS_INSUFFICIENT":
      throw new TournamentParticipantsInsufficientError(error.message);
    case "TOURNAMENT_PARTICIPANT_LIMIT_EXCEEDED":
      throw new TournamentParticipantLimitExceededError(error.message);
    case "TOURNAMENT_FORMAT_UNSUPPORTED":
      throw new TournamentFormatUnsupportedError(error.message);
    default:
      throw new TournamentGenerationInvalidError(error.message);
  }
}

export interface GenerateTournamentRoundRobinFixturesInput {
  format?: RoundRobinGenerationConfig["format"];
  stageKey?: string;
}

/**
 * Loads canonical participants, generates deterministic round-robin fixtures, persists atomically.
 * Idempotent when an identical fixture set already exists (no new rows).
 */
export async function generateTournamentRoundRobinFixtures(
  tenantId: string,
  tournamentId: string,
  input: GenerateTournamentRoundRobinFixturesInput = {},
): Promise<TournamentFixtureDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);

  const format = input.format ?? "ROUND_ROBIN";
  if (format !== "ROUND_ROBIN") {
    throw new TournamentFormatUnsupportedError(`Unsupported tournament format: ${format}`);
  }

  const stageKey = input.stageKey ?? TOURNAMENT_FIXTURE_STAGE_MAIN;

  const participantRows = await prisma.tournamentParticipant.findMany({
    where: { tenantId, eventId: tournamentId },
    select: { id: true, displayOrder: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });

  const canonicalIds = canonicalizeParticipantIds(participantRows);
  const canonicalIdSet = new Set(canonicalIds);

  let generated;
  try {
    generated = generateRoundRobinFixtures({
      participantIds: canonicalIds,
      config: { format: "ROUND_ROBIN", stageKey },
    });
  } catch (error) {
    if (error instanceof RoundRobinGenerationValidationError) {
      if (error.code === "TOURNAMENT_GENERATION_INVALID" && error.message.includes("Duplicate")) {
        throw new TournamentScheduleParticipantInvalidError(error.message);
      }
      mapPureValidationError(error);
    }
    throw error;
  }

  const existing = await listTournamentFixtures(tenantId, tournamentId);
  const reconciled = reconcileExistingFixtures(tournamentId, generated, existing, canonicalIdSet);
  if (reconciled) {
    return sortFixtureDefinitions(reconciled);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const definition of generated) {
        const row = await tx.tournamentFixture.create({
          data: {
            tenantId,
            eventId: tournamentId,
            stageKey: definition.stageKey,
            roundIndex: definition.roundIndex,
            slotIndexInRound: definition.slotIndexInRound,
            generatorKey: definition.generatorKey,
            sideAParticipantId: definition.sideAParticipantId,
            sideBParticipantId: definition.sideBParticipantId,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    return sortFixtureDefinitions(created.map((row) => toDefinition(row)));
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }

    const afterRace = await listTournamentFixtures(tenantId, tournamentId);
    const raced = reconcileExistingFixtures(tournamentId, generated, afterRace, canonicalIdSet);
    if (raced) {
      return sortFixtureDefinitions(raced);
    }

    throw new TournamentFixturesAlreadyExistError(
      tournamentId,
      "Concurrent fixture generation left a non-matching fixture set",
    );
  }
}
