/**
 * SCE-TOURNAMENT-PLANNER-01D-R1 — tournament-owned logical pitches (1:n per Event).
 */

import { prisma } from "@/lib/db/prisma";
import { requireTournamentEvent } from "./internal/require-tournament";

export type TournamentPitchDefinition = {
  id: string;
  eventId: string;
  displayOrder: number;
  label: string;
};

export type CreateTournamentPitchInput = {
  label: string;
  displayOrder?: number;
};

export async function listTournamentPitches(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentPitchDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);
  const rows = await prisma.tournamentPitch.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: { id: true, eventId: true, displayOrder: true, label: true },
  });
  return rows;
}

export async function createTournamentPitch(
  tenantId: string,
  tournamentId: string,
  input: CreateTournamentPitchInput,
): Promise<TournamentPitchDefinition> {
  await requireTournamentEvent(tenantId, tournamentId);
  const label = input.label.trim();
  if (!label) {
    throw new Error("Tournament pitch label is required");
  }

  let displayOrder = input.displayOrder;
  if (displayOrder === undefined) {
    const agg = await prisma.tournamentPitch.aggregate({
      where: { tenantId, eventId: tournamentId },
      _max: { displayOrder: true },
    });
    displayOrder = (agg._max.displayOrder ?? -1) + 1;
  }

  const row = await prisma.tournamentPitch.create({
    data: {
      tenantId,
      eventId: tournamentId,
      displayOrder,
      label,
    },
    select: { id: true, eventId: true, displayOrder: true, label: true },
  });
  return row;
}
