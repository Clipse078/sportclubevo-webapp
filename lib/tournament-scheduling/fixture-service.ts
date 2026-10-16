/**
 * SCE-TOURNAMENT-PLANNER-01B — tournament fixture persistence (WHO).
 */

import { prisma } from "@/lib/db/prisma";
import type { CreateTournamentFixtureInput, TournamentFixtureDefinition } from "./types";
import { requireTournamentEvent } from "./internal/require-tournament";
import {
  TournamentFixtureNotFoundError,
  TournamentScheduleParticipantInvalidError,
} from "./errors";

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

async function requireParticipantForTournament(
  tenantId: string,
  tournamentId: string,
  participantId: string,
  label: "side A" | "side B",
): Promise<void> {
  const participant = await prisma.tournamentParticipant.findFirst({
    where: { id: participantId, tenantId, eventId: tournamentId },
    select: { id: true },
  });
  if (!participant) {
    throw new TournamentScheduleParticipantInvalidError(
      `${label} participant "${participantId}" is not part of tournament "${tournamentId}"`,
    );
  }
}

function validateDistinctSides(sideA: string, sideB: string): void {
  if (sideA === sideB) {
    throw new TournamentScheduleParticipantInvalidError(
      "Fixture sides must reference two distinct tournament participants",
    );
  }
}

/**
 * Creates a durable tournament fixture. Does not generate pairings (01C).
 */
export async function createTournamentFixture(
  tenantId: string,
  tournamentId: string,
  input: CreateTournamentFixtureInput,
): Promise<TournamentFixtureDefinition> {
  await requireTournamentEvent(tenantId, tournamentId);
  validateDistinctSides(input.sideAParticipantId, input.sideBParticipantId);
  await requireParticipantForTournament(
    tenantId,
    tournamentId,
    input.sideAParticipantId,
    "side A",
  );
  await requireParticipantForTournament(
    tenantId,
    tournamentId,
    input.sideBParticipantId,
    "side B",
  );

  const row = await prisma.tournamentFixture.create({
    data: {
      tenantId,
      eventId: tournamentId,
      stageKey: input.stageKey ?? "MAIN",
      roundIndex: input.roundIndex,
      slotIndexInRound: input.slotIndexInRound,
      generatorKey: input.generatorKey ?? null,
      sideAParticipantId: input.sideAParticipantId,
      sideBParticipantId: input.sideBParticipantId,
    },
  });

  return toDefinition(row);
}

/**
 * Lists fixtures in deterministic tournament order.
 */
export async function listTournamentFixtures(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentFixtureDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);

  const rows = await prisma.tournamentFixture.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [
      { stageKey: "asc" },
      { roundIndex: "asc" },
      { slotIndexInRound: "asc" },
      { id: "asc" },
    ],
  });

  return rows.map(toDefinition);
}

export async function getTournamentFixture(
  tenantId: string,
  fixtureId: string,
): Promise<TournamentFixtureDefinition> {
  const row = await prisma.tournamentFixture.findFirst({
    where: { id: fixtureId, tenantId },
  });
  if (!row) throw new TournamentFixtureNotFoundError(fixtureId);
  return toDefinition(row);
}
