/**
 * SCE-TOURNAMENT-PLANNER-01E3C — knockout bracket persistence service.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getTournamentCompetitionConfiguration,
  getTournamentPhase,
} from "../competition-structure/competition-structure-service";
import type { FixtureSideInput } from "../competition-structure/types";
import {
  TournamentCompetitionNotFoundError,
  TournamentCompetitionValidationError,
  TournamentFixtureSetConflictError,
  TournamentFormatUnsupportedError,
  TournamentGenerationInvalidError,
} from "../errors";
import { requireTenantOrganisedTournament } from "../internal/require-tenant-organised-tournament";
import type { TournamentFixtureDefinition } from "../types";
import {
  generateKnockoutBracketPure,
  KnockoutBracketValidationError,
} from "./knockout-bracket-pure";
import type {
  GenerateKnockoutBracketForPhaseInput,
  GenerateKnockoutBracketForPhaseResult,
  GeneratedKnockoutFixtureSpec,
  KnockoutEntrantInput,
  KnockoutFixtureSideSource,
} from "./knockout-bracket-types";

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function mapPureValidationError(error: KnockoutBracketValidationError): never {
  if (error.code === "INSUFFICIENT_ENTRANTS") {
    throw new TournamentCompetitionValidationError(error.message);
  }
  if (error.code === "DUPLICATE_ENTRANT") {
    throw new TournamentCompetitionValidationError(error.message);
  }
  if (error.code === "FIXTURE_LIMIT") {
    throw new TournamentGenerationInvalidError(error.message);
  }
  throw new TournamentGenerationInvalidError(error.message);
}

function assertKnockoutPhaseAllowed(
  competitionFormat: "GROUP_MIX_ONLY" | "KNOCKOUT_ONLY" | "GROUP_PLUS_KNOCKOUT",
  phaseType: "GROUP_MIX" | "KNOCKOUT",
): void {
  if (phaseType !== "KNOCKOUT") {
    throw new TournamentFormatUnsupportedError(
      "Knockout bracket generation applies only to KNOCKOUT phases",
    );
  }
  if (competitionFormat === "GROUP_MIX_ONLY") {
    throw new TournamentFormatUnsupportedError(
      "GROUP_MIX_ONLY tournaments do not include a KNOCKOUT phase",
    );
  }
}

function entrantFingerprint(entrants: readonly KnockoutEntrantInput[]): string {
  return JSON.stringify(
    entrants.map((entrant) =>
      entrant.kind === "CONCRETE_PARTICIPANT"
        ? { k: "p", id: entrant.participantId }
        : { k: "q", id: entrant.qualificationSourceId },
    ),
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

async function validateEntrantsForTournament(
  tenantId: string,
  tournamentId: string,
  entrants: readonly KnockoutEntrantInput[],
): Promise<void> {
  for (const entrant of entrants) {
    if (entrant.kind === "CONCRETE_PARTICIPANT") {
      const row = await prisma.tournamentParticipant.findFirst({
        where: { id: entrant.participantId, tenantId, eventId: tournamentId },
      });
      if (!row) {
        throw new TournamentCompetitionValidationError(
          `Participant not found in tournament: ${entrant.participantId}`,
        );
      }
      continue;
    }
    const qual = await prisma.tournamentQualificationSource.findFirst({
      where: { id: entrant.qualificationSourceId, tenantId, eventId: tournamentId },
    });
    if (!qual) {
      throw new TournamentCompetitionValidationError(
        `Qualification source not found in tournament: ${entrant.qualificationSourceId}`,
      );
    }
  }
}

function sideSourceToFixtureSideInput(
  side: KnockoutFixtureSideSource,
  winnerQualByLogicalKey: ReadonlyMap<string, string>,
): FixtureSideInput {
  if (side.type === "CONCRETE_PARTICIPANT") {
    return { kind: "CONCRETE_PARTICIPANT", participantId: side.participantId };
  }
  if (side.type === "QUALIFICATION_REFERENCE") {
    return { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: side.qualificationSourceId };
  }
  const qualId = winnerQualByLogicalKey.get(side.logicalFixtureKey);
  if (!qualId) {
    throw new TournamentGenerationInvalidError(
      `Missing WINNER_OF_FIXTURE qualification for ${side.logicalFixtureKey}`,
    );
  }
  return { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: qualId };
}

async function persistKnockoutFixtureSides(
  tx: Prisma.TransactionClient,
  tenantId: string,
  fixtureId: string,
  sideA: FixtureSideInput,
  sideB: FixtureSideInput,
): Promise<void> {
  const sideAParticipantId = sideA.kind === "CONCRETE_PARTICIPANT" ? sideA.participantId : null;
  const sideBParticipantId = sideB.kind === "CONCRETE_PARTICIPANT" ? sideB.participantId : null;

  await tx.tournamentFixture.update({
    where: { id: fixtureId },
    data: { sideAParticipantId, sideBParticipantId },
  });

  await tx.tournamentFixtureSide.createMany({
    data: [
      {
        tenantId,
        fixtureId,
        side: "A",
        sourceType:
          sideA.kind === "CONCRETE_PARTICIPANT" ? "CONCRETE_PARTICIPANT" : "QUALIFICATION_REFERENCE",
        participantId: sideAParticipantId,
        qualificationSourceId:
          sideA.kind === "QUALIFICATION_REFERENCE" ? sideA.qualificationSourceId : null,
      },
      {
        tenantId,
        fixtureId,
        side: "B",
        sourceType:
          sideB.kind === "CONCRETE_PARTICIPANT" ? "CONCRETE_PARTICIPANT" : "QUALIFICATION_REFERENCE",
        participantId: sideBParticipantId,
        qualificationSourceId:
          sideB.kind === "QUALIFICATION_REFERENCE" ? sideB.qualificationSourceId : null,
      },
    ],
  });
}

function sortGeneratedFixtures(
  fixtures: readonly GeneratedKnockoutFixtureSpec[],
): GeneratedKnockoutFixtureSpec[] {
  return [...fixtures].sort((a, b) => {
    if (a.roundIndex !== b.roundIndex) {
      return a.roundIndex - b.roundIndex;
    }
    return a.slotIndexInRound - b.slotIndexInRound;
  });
}

export async function generateKnockoutBracketForPhase(
  tenantId: string,
  input: GenerateKnockoutBracketForPhaseInput,
): Promise<GenerateKnockoutBracketForPhaseResult> {
  const tournamentId = input.tournamentId;
  await requireTenantOrganisedTournament(tenantId, tournamentId);

  const config = await getTournamentCompetitionConfiguration(tenantId, tournamentId);
  if (!config) {
    throw new TournamentCompetitionNotFoundError(tournamentId);
  }

  const phase = await getTournamentPhase(tenantId, tournamentId, input.phaseId);
  assertKnockoutPhaseAllowed(config.competitionFormat, phase.phaseType);
  await validateEntrantsForTournament(tenantId, tournamentId, input.entrants);

  let generated;
  try {
    generated = generateKnockoutBracketPure({
      stageKey: phase.stageKey,
      entrants: input.entrants,
    });
  } catch (error) {
    if (error instanceof KnockoutBracketValidationError) {
      mapPureValidationError(error);
    }
    throw error;
  }

  const orderedFixtures = sortGeneratedFixtures(generated.fixtures);
  const expectedGeneratorKeys = orderedFixtures.map((fixture) => fixture.generatorKey);
  const fingerprint = entrantFingerprint(input.entrants);

  const existing = await prisma.tournamentFixture.findMany({
    where: { tenantId, eventId: tournamentId, tournamentPhaseId: input.phaseId },
    orderBy: [{ roundIndex: "asc" }, { slotIndexInRound: "asc" }, { id: "asc" }],
  });

  if (existing.length > 0) {
    const existingKeys = existing.map((row) => row.generatorKey).filter(Boolean);
    const matches =
      existingKeys.length === expectedGeneratorKeys.length &&
      expectedGeneratorKeys.every((key, index) => existingKeys[index] === key);
    void fingerprint;
    if (matches) {
      return {
        fixtures: existing.map((row) => toFixtureDefinition(row)),
        diagnostics: generated.diagnostics,
      };
    }
    throw new TournamentFixtureSetConflictError(
      "Existing knockout fixtures differ from the deterministic generated set (structural drift)",
    );
  }

  try {
    const rows = await prisma.$transaction(async (tx) => {
      const winnerQualByLogicalKey = new Map<string, string>();
      const persisted = [];

      for (const fixture of orderedFixtures) {
        const sideA = sideSourceToFixtureSideInput(fixture.sides.sideA, winnerQualByLogicalKey);
        const sideB = sideSourceToFixtureSideInput(fixture.sides.sideB, winnerQualByLogicalKey);

        const row = await tx.tournamentFixture.create({
          data: {
            tenantId,
            eventId: tournamentId,
            tournamentPhaseId: input.phaseId,
            tournamentGroupId: null,
            stageKey: fixture.stageKey,
            roundIndex: fixture.roundIndex,
            slotIndexInRound: fixture.slotIndexInRound,
            generatorKey: fixture.generatorKey,
            sideAParticipantId: null,
            sideBParticipantId: null,
          },
        });

        await persistKnockoutFixtureSides(tx, tenantId, row.id, sideA, sideB);

        const winnerQual = await tx.tournamentQualificationSource.create({
          data: {
            tenantId,
            eventId: tournamentId,
            sourceType: "WINNER_OF_FIXTURE",
            sourceFixtureId: row.id,
          },
        });
        winnerQualByLogicalKey.set(fixture.logicalFixtureKey, winnerQual.id);

        persisted.push({
          ...row,
          sideAParticipantId: sideA.kind === "CONCRETE_PARTICIPANT" ? sideA.participantId : null,
          sideBParticipantId: sideB.kind === "CONCRETE_PARTICIPANT" ? sideB.participantId : null,
        });
      }

      return persisted;
    });

    return {
      fixtures: rows.map((row) => toFixtureDefinition(row)),
      diagnostics: generated.diagnostics,
    };
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }
    const raced = await prisma.tournamentFixture.findMany({
      where: { tenantId, eventId: tournamentId, tournamentPhaseId: input.phaseId },
    });
    if (raced.length > 0) {
      return generateKnockoutBracketForPhase(tenantId, input);
    }
    throw error;
  }
}
