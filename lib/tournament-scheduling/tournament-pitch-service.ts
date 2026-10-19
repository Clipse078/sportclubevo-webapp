/**
 * SCE-TOURNAMENT-PLANNER-01D-R1 — tournament-owned logical pitches (1:n per Event).
 * SCE-TOURNAMENT-PLANNER-02B — optional playersPerSide (PlayingFormat).
 */

import { prisma } from "@/lib/db/prisma";
import { requireTournamentEvent } from "./internal/require-tournament";
import {
  parsePlayersPerSideInput,
  type ParsedPlayersPerSide,
} from "./validate-tournament-pitch-playing-format";

export type TournamentPitchDefinition = {
  id: string;
  eventId: string;
  displayOrder: number;
  label: string;
  playersPerSide: number | null;
};

export type CreateTournamentPitchInput = {
  label: string;
  displayOrder?: number;
  playersPerSide?: ParsedPlayersPerSide;
};

export type UpdateTournamentPitchInput = {
  label?: string;
  displayOrder?: number;
  playersPerSide?: ParsedPlayersPerSide;
};

function mapPitchRow(row: {
  id: string;
  eventId: string;
  displayOrder: number;
  label: string;
  playersPerSide: number | null;
}): TournamentPitchDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    displayOrder: row.displayOrder,
    label: row.label,
    playersPerSide: row.playersPerSide,
  };
}

const pitchSelect = {
  id: true,
  eventId: true,
  displayOrder: true,
  label: true,
  playersPerSide: true,
} as const;

export async function listTournamentPitches(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentPitchDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);
  const rows = await prisma.tournamentPitch.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: pitchSelect,
  });
  return rows.map(mapPitchRow);
}

export async function getTournamentPitch(
  tenantId: string,
  tournamentId: string,
  pitchId: string,
): Promise<TournamentPitchDefinition | null> {
  await requireTournamentEvent(tenantId, tournamentId);
  const row = await prisma.tournamentPitch.findFirst({
    where: { id: pitchId, tenantId, eventId: tournamentId },
    select: pitchSelect,
  });
  return row ? mapPitchRow(row) : null;
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

  let playersPerSide: number | null = null;
  if (input.playersPerSide !== undefined) {
    playersPerSide = parsePlayersPerSideInput(input.playersPerSide);
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
      playersPerSide,
    },
    select: pitchSelect,
  });
  return mapPitchRow(row);
}

export async function updateTournamentPitch(
  tenantId: string,
  tournamentId: string,
  pitchId: string,
  input: UpdateTournamentPitchInput,
): Promise<TournamentPitchDefinition> {
  await requireTournamentEvent(tenantId, tournamentId);
  const existing = await prisma.tournamentPitch.findFirst({
    where: { id: pitchId, tenantId, eventId: tournamentId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Tournament pitch not found");
  }

  const data: {
    label?: string;
    displayOrder?: number;
    playersPerSide?: number | null;
  } = {};

  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) {
      throw new Error("Tournament pitch label is required");
    }
    data.label = label;
  }
  if (input.displayOrder !== undefined) {
    data.displayOrder = input.displayOrder;
  }
  if (input.playersPerSide !== undefined) {
    data.playersPerSide = parsePlayersPerSideInput(input.playersPerSide);
  }

  const row = await prisma.tournamentPitch.update({
    where: { id: pitchId },
    data,
    select: pitchSelect,
  });
  return mapPitchRow(row);
}
