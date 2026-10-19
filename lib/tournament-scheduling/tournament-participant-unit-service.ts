/**
 * SCE-TOURNAMENT-PLANNER-02C — tournament-local playing units (Spielteams).
 */

import { prisma } from "@/lib/db/prisma";
import type { TournamentParticipantUnitMode } from "@prisma/client";
import { getTournamentParticipant } from "@/lib/tournaments/participant-service";
import { TournamentParticipantNotFoundError } from "@/lib/tournaments/errors";
import { requireTournamentEvent } from "./internal/require-tournament";
import { TournamentSchedulingError } from "./errors";
import {
  doParticipantUnitsOverlapCapacity,
  toParticipantUnitCapacityRef,
  type ParticipantUnitCapacityRef,
} from "./participant-unit-capacity";

export type TournamentParticipantUnitDefinition = {
  id: string;
  tournamentParticipantId: string;
  tournamentId: string;
  displayName: string;
  mode: TournamentParticipantUnitMode;
  capacityPartitionKey: string | null;
  displayOrder: number;
  /** False for persisted rows; implicit compatibility units are synthetic only. */
  isPersisted: boolean;
};

export type CreateTournamentParticipantUnitInput = {
  displayName: string;
  mode?: TournamentParticipantUnitMode;
  capacityPartitionKey?: string | null;
  displayOrder?: number;
};

export type UpdateTournamentParticipantUnitInput = {
  displayName?: string;
  mode?: TournamentParticipantUnitMode;
  capacityPartitionKey?: string | null;
  displayOrder?: number;
};

export const IMPLICIT_FULL_PLAYING_UNIT_ID_PREFIX = "implicit-full:" as const;

export function buildImplicitFullPlayingUnitId(participantId: string): string {
  return `${IMPLICIT_FULL_PLAYING_UNIT_ID_PREFIX}${participantId}`;
}

export function isImplicitFullPlayingUnitId(unitId: string): boolean {
  return unitId.startsWith(IMPLICIT_FULL_PLAYING_UNIT_ID_PREFIX);
}

const unitSelect = {
  id: true,
  tournamentParticipantId: true,
  displayName: true,
  mode: true,
  capacityPartitionKey: true,
  displayOrder: true,
  tournamentParticipant: { select: { eventId: true } },
} as const;

function mapUnitRow(row: {
  id: string;
  tournamentParticipantId: string;
  displayName: string;
  mode: TournamentParticipantUnitMode;
  capacityPartitionKey: string | null;
  displayOrder: number;
  tournamentParticipant: { eventId: string };
}): TournamentParticipantUnitDefinition {
  return {
    id: row.id,
    tournamentParticipantId: row.tournamentParticipantId,
    tournamentId: row.tournamentParticipant.eventId,
    displayName: row.displayName,
    mode: row.mode,
    capacityPartitionKey: row.capacityPartitionKey,
    displayOrder: row.displayOrder,
    isPersisted: true,
  };
}

async function requireParticipantForTournament(
  tenantId: string,
  tournamentId: string,
  participantId: string,
): Promise<void> {
  await requireTournamentEvent(tenantId, tournamentId);
  const participant = await getTournamentParticipant(tenantId, participantId);
  if (participant.tournamentId !== tournamentId) {
    throw new TournamentParticipantNotFoundError(participantId);
  }
}

export function createImplicitFullPlayingUnit(input: {
  participantId: string;
  tournamentId: string;
  displayName: string;
}): TournamentParticipantUnitDefinition {
  return {
    id: buildImplicitFullPlayingUnitId(input.participantId),
    tournamentParticipantId: input.participantId,
    tournamentId: input.tournamentId,
    displayName: input.displayName,
    mode: "FULL",
    capacityPartitionKey: null,
    displayOrder: 0,
    isPersisted: false,
  };
}

/**
 * When no persisted units exist, returns a single implicit FULL unit for backward compatibility.
 */
export function resolveEffectivePlayingUnits(
  participant: { id: string; tournamentId: string; displayName: string },
  persistedUnits: readonly TournamentParticipantUnitDefinition[],
): TournamentParticipantUnitDefinition[] {
  if (persistedUnits.length > 0) {
    return [...persistedUnits].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
  }
  return [createImplicitFullPlayingUnit(participant)];
}

export function resolveEffectiveFullPlayingUnit(
  participant: { id: string; tournamentId: string; displayName: string },
  persistedUnits: readonly TournamentParticipantUnitDefinition[],
): TournamentParticipantUnitDefinition {
  const effective = resolveEffectivePlayingUnits(participant, persistedUnits);
  const explicitFull = effective.find((u) => u.mode === "FULL" && u.isPersisted);
  if (explicitFull) return explicitFull;
  return effective[0]!;
}

export function toCapacityRefFromDefinition(
  unit: TournamentParticipantUnitDefinition,
): ParticipantUnitCapacityRef {
  return toParticipantUnitCapacityRef({
    id: unit.id,
    tournamentParticipantId: unit.tournamentParticipantId,
    mode: unit.mode,
    capacityPartitionKey: unit.capacityPartitionKey,
  });
}

export { doParticipantUnitsOverlapCapacity };

export async function listTournamentParticipantUnits(
  tenantId: string,
  tournamentId: string,
  participantId: string,
): Promise<TournamentParticipantUnitDefinition[]> {
  await requireParticipantForTournament(tenantId, tournamentId, participantId);
  const rows = await prisma.tournamentParticipantUnit.findMany({
    where: { tenantId, tournamentParticipantId: participantId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: unitSelect,
  });
  return rows.map(mapUnitRow);
}

export async function listTournamentParticipantUnitsForEvent(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentParticipantUnitDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);
  const rows = await prisma.tournamentParticipantUnit.findMany({
    where: {
      tenantId,
      tournamentParticipant: { eventId: tournamentId },
    },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: unitSelect,
  });
  return rows.map(mapUnitRow);
}

export async function createTournamentParticipantUnit(
  tenantId: string,
  tournamentId: string,
  participantId: string,
  input: CreateTournamentParticipantUnitInput,
): Promise<TournamentParticipantUnitDefinition> {
  await requireParticipantForTournament(tenantId, tournamentId, participantId);

  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_PARTICIPANT_UNIT_VALIDATION",
      "Spielteam-Name ist erforderlich.",
    );
  }

  const mode = input.mode ?? "SUBUNIT";

  if (mode === "FULL") {
    const existingFull = await prisma.tournamentParticipantUnit.findFirst({
      where: { tenantId, tournamentParticipantId: participantId, mode: "FULL" },
      select: { id: true },
    });
    if (existingFull) {
      throw new TournamentSchedulingError(
        "TOURNAMENT_PARTICIPANT_UNIT_VALIDATION",
        "Es gibt bereits ein ganzes Team für diesen Teilnehmer.",
      );
    }
  }

  let displayOrder = input.displayOrder;
  if (displayOrder === undefined) {
    const agg = await prisma.tournamentParticipantUnit.aggregate({
      where: { tenantId, tournamentParticipantId: participantId },
      _max: { displayOrder: true },
    });
    displayOrder = (agg._max.displayOrder ?? -1) + 1;
  }

  const row = await prisma.tournamentParticipantUnit.create({
    data: {
      tenantId,
      tournamentParticipantId: participantId,
      displayName,
      mode,
      capacityPartitionKey: input.capacityPartitionKey?.trim() || null,
      displayOrder,
    },
    select: unitSelect,
  });
  return mapUnitRow(row);
}

export async function updateTournamentParticipantUnit(
  tenantId: string,
  tournamentId: string,
  participantId: string,
  unitId: string,
  input: UpdateTournamentParticipantUnitInput,
): Promise<TournamentParticipantUnitDefinition> {
  await requireParticipantForTournament(tenantId, tournamentId, participantId);

  const existing = await prisma.tournamentParticipantUnit.findFirst({
    where: { id: unitId, tenantId, tournamentParticipantId: participantId },
    select: { id: true, mode: true },
  });
  if (!existing) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_PARTICIPANT_UNIT_NOT_FOUND",
      "Spielteam nicht gefunden.",
    );
  }

  const data: {
    displayName?: string;
    mode?: TournamentParticipantUnitMode;
    capacityPartitionKey?: string | null;
    displayOrder?: number;
  } = {};

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new TournamentSchedulingError(
        "TOURNAMENT_PARTICIPANT_UNIT_VALIDATION",
        "Spielteam-Name ist erforderlich.",
      );
    }
    data.displayName = displayName;
  }

  if (input.mode !== undefined) {
    if (input.mode === "FULL" && existing.mode !== "FULL") {
      const otherFull = await prisma.tournamentParticipantUnit.findFirst({
        where: {
          tenantId,
          tournamentParticipantId: participantId,
          mode: "FULL",
          NOT: { id: unitId },
        },
        select: { id: true },
      });
      if (otherFull) {
        throw new TournamentSchedulingError(
          "TOURNAMENT_PARTICIPANT_UNIT_VALIDATION",
          "Es gibt bereits ein ganzes Team für diesen Teilnehmer.",
        );
      }
    }
    data.mode = input.mode;
  }

  if (input.capacityPartitionKey !== undefined) {
    data.capacityPartitionKey = input.capacityPartitionKey?.trim() || null;
  }
  if (input.displayOrder !== undefined) {
    data.displayOrder = input.displayOrder;
  }

  const row = await prisma.tournamentParticipantUnit.update({
    where: { id: unitId },
    data,
    select: unitSelect,
  });
  return mapUnitRow(row);
}

export async function removeTournamentParticipantUnit(
  tenantId: string,
  tournamentId: string,
  participantId: string,
  unitId: string,
): Promise<void> {
  await requireParticipantForTournament(tenantId, tournamentId, participantId);

  const existing = await prisma.tournamentParticipantUnit.findFirst({
    where: { id: unitId, tenantId, tournamentParticipantId: participantId },
    select: { id: true },
  });
  if (!existing) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_PARTICIPANT_UNIT_NOT_FOUND",
      "Spielteam nicht gefunden.",
    );
  }

  await prisma.tournamentParticipantUnit.delete({ where: { id: unitId } });
}

/**
 * Creates two SUBUNIT rows as the default split workflow (no arbitrary max).
 */
export async function splitParticipantIntoDefaultSubunits(
  tenantId: string,
  tournamentId: string,
  participantId: string,
  baseDisplayName: string,
): Promise<TournamentParticipantUnitDefinition[]> {
  const trimmed = baseDisplayName.trim() || "Team";
  const first = await createTournamentParticipantUnit(tenantId, tournamentId, participantId, {
    displayName: `${trimmed}-1`,
    mode: "SUBUNIT",
  });
  const second = await createTournamentParticipantUnit(tenantId, tournamentId, participantId, {
    displayName: `${trimmed}-2`,
    mode: "SUBUNIT",
  });
  return [first, second];
}
