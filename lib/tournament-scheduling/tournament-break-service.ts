/**
 * SCE-TOURNAMENT-PLANNER-01D-R1 — tournament-owned breaks / blocked periods (0:n).
 */

import { prisma } from "@/lib/db/prisma";
import type { TournamentBreakScope } from "@prisma/client";
import { requireTournamentEvent } from "./internal/require-tournament";
import { listTournamentPitches } from "./tournament-pitch-service";

export type TournamentBreakDefinition = {
  id: string;
  eventId: string;
  label: string | null;
  startAt: string;
  endAt: string;
  scope: TournamentBreakScope;
  tournamentPitchIds: string[];
};

export type CreateTournamentBreakInput = {
  label?: string | null;
  startAt: Date;
  endAt: Date;
  scope: TournamentBreakScope;
  tournamentPitchIds?: string[];
};

function toDefinition(row: {
  id: string;
  eventId: string;
  label: string | null;
  startAt: Date;
  endAt: Date;
  scope: TournamentBreakScope;
  pitches: { tournamentPitchId: string }[];
}): TournamentBreakDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    label: row.label,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    scope: row.scope,
    tournamentPitchIds: row.pitches.map((p) => p.tournamentPitchId),
  };
}

export async function listTournamentBreaks(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentBreakDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);
  const rows = await prisma.tournamentBreak.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    include: { pitches: { select: { tournamentPitchId: true } } },
  });
  return rows.map(toDefinition);
}

export async function createTournamentBreak(
  tenantId: string,
  tournamentId: string,
  input: CreateTournamentBreakInput,
): Promise<TournamentBreakDefinition> {
  await requireTournamentEvent(tenantId, tournamentId);
  if (input.endAt.getTime() <= input.startAt.getTime()) {
    throw new Error("Break endAt must be after startAt");
  }

  const pitchIds = input.tournamentPitchIds ?? [];
  if (input.scope === "SELECTED_PITCHES") {
    const known = new Set(
      (await listTournamentPitches(tenantId, tournamentId)).map((p) => p.id),
    );
    const unique = [...new Set(pitchIds)];
    if (unique.length === 0) {
      throw new Error("Selected-pitch break requires at least one tournament pitch");
    }
    for (const id of unique) {
      if (!known.has(id)) {
        throw new Error(`Unknown tournament pitch for break: ${id}`);
      }
    }
  }

  const row = await prisma.tournamentBreak.create({
    data: {
      tenantId,
      eventId: tournamentId,
      label: input.label?.trim() || null,
      startAt: input.startAt,
      endAt: input.endAt,
      scope: input.scope,
      pitches:
        input.scope === "SELECTED_PITCHES"
          ? {
              create: [...new Set(pitchIds)].map((tournamentPitchId) => ({
                tenantId,
                tournamentPitchId,
              })),
            }
          : undefined,
    },
    include: { pitches: { select: { tournamentPitchId: true } } },
  });

  return toDefinition(row);
}
