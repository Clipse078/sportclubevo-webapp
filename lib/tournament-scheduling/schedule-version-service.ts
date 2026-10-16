/**
 * SCE-TOURNAMENT-PLANNER-01B — versioned tournament schedule containers.
 */

import { prisma } from "@/lib/db/prisma";
import type {
  CreateTournamentScheduleVersionInput,
  TournamentScheduleVersionDefinition,
} from "./types";
import { requireTournamentEvent } from "./internal/require-tournament";
import { TournamentInvalidTransitionError } from "@/lib/tournaments/errors";
import {
  TournamentScheduleNotFoundError,
  TournamentScheduleWorkingExistsError,
} from "./errors";

function toDefinition(row: {
  id: string;
  eventId: string;
  versionNumber: number;
  status: "WORKING" | "APPROVED" | "SUPERSEDED";
  revision: number;
  matchDurationMinutes: number | null;
  transitionMinutes: number | null;
  minRestMinutes: number | null;
  approvedAt: Date | null;
  supersededAt: Date | null;
}): TournamentScheduleVersionDefinition {
  return {
    id: row.id,
    eventId: row.eventId,
    versionNumber: row.versionNumber,
    status: row.status,
    revision: row.revision,
    matchDurationMinutes: row.matchDurationMinutes,
    transitionMinutes: row.transitionMinutes,
    minRestMinutes: row.minRestMinutes,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    supersededAt: row.supersededAt?.toISOString() ?? null,
  };
}

export async function createWorkingTournamentScheduleVersion(
  tenantId: string,
  tournamentId: string,
  input: CreateTournamentScheduleVersionInput = {},
): Promise<TournamentScheduleVersionDefinition> {
  await requireTournamentEvent(tenantId, tournamentId);

  const existingWorking = await prisma.tournamentScheduleVersion.findFirst({
    where: { tenantId, eventId: tournamentId, status: "WORKING" },
    select: { id: true },
  });
  if (existingWorking) {
    throw new TournamentScheduleWorkingExistsError(tournamentId);
  }

  const aggregate = await prisma.tournamentScheduleVersion.aggregate({
    where: { eventId: tournamentId },
    _max: { versionNumber: true },
  });
  const nextVersionNumber = (aggregate._max.versionNumber ?? 0) + 1;

  const row = await prisma.tournamentScheduleVersion.create({
    data: {
      tenantId,
      eventId: tournamentId,
      versionNumber: nextVersionNumber,
      status: "WORKING",
      revision: 0,
      matchDurationMinutes: input.matchDurationMinutes ?? null,
      transitionMinutes: input.transitionMinutes ?? null,
      minRestMinutes: input.minRestMinutes ?? null,
    },
  });

  return toDefinition(row);
}

export async function listTournamentScheduleVersions(
  tenantId: string,
  tournamentId: string,
): Promise<TournamentScheduleVersionDefinition[]> {
  await requireTournamentEvent(tenantId, tournamentId);

  const rows = await prisma.tournamentScheduleVersion.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [{ versionNumber: "desc" }],
  });

  return rows.map(toDefinition);
}

export async function getTournamentScheduleVersion(
  tenantId: string,
  scheduleVersionId: string,
): Promise<TournamentScheduleVersionDefinition> {
  const row = await prisma.tournamentScheduleVersion.findFirst({
    where: { id: scheduleVersionId, tenantId },
  });
  if (!row) throw new TournamentScheduleNotFoundError(scheduleVersionId);
  return toDefinition(row);
}

/**
 * Marks a WORKING version APPROVED (foundation for immutability enforcement).
 * Does not publish or materialize resource allocations (deferred).
 */
export async function approveTournamentScheduleVersion(
  tenantId: string,
  scheduleVersionId: string,
): Promise<TournamentScheduleVersionDefinition> {
  const version = await prisma.tournamentScheduleVersion.findFirst({
    where: { id: scheduleVersionId, tenantId },
  });
  if (!version) throw new TournamentScheduleNotFoundError(scheduleVersionId);
  if (version.status !== "WORKING") {
    throw new TournamentInvalidTransitionError(
      `Schedule version "${scheduleVersionId}" cannot be approved from status ${version.status}`,
    );
  }

  const now = new Date();

  const row = await prisma.$transaction(async (tx) => {
    await tx.tournamentScheduleVersion.updateMany({
      where: {
        tenantId,
        eventId: version.eventId,
        status: "APPROVED",
      },
      data: { status: "SUPERSEDED", supersededAt: now },
    });

    return tx.tournamentScheduleVersion.update({
      where: { id: scheduleVersionId },
      data: { status: "APPROVED", approvedAt: now },
    });
  });

  return toDefinition(row);
}
