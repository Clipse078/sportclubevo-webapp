/**
 * SCE-TOURNAMENT-PLANNER-01B — schedule assignments (WHEN + WHERE).
 *
 * Boundary: assignments are schedule truth only. Authoritative facility occupancy
 * remains existing allocation / availability services (materialisation deferred).
 */

import { prisma } from "@/lib/db/prisma";
import {
  loadTenantFacilityResourceForWrite,
  validateAssignableFacilityResource,
} from "@/lib/facilities/facility-resource-write-validation";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import type {
  PersistTournamentFixtureAssignmentInput,
  TournamentFixtureAssignmentDefinition,
  UpdateTournamentFixtureAssignmentInput,
} from "./types";
import {
  TournamentAssignmentDuplicateError,
  TournamentAssignmentNotFoundError,
  TournamentFixtureNotFoundError,
  TournamentScheduleApprovedImmutableError,
  TournamentScheduleNotFoundError,
  TournamentScheduleResourceInvalidError,
  TournamentScheduleStaleVersionError,
} from "./errors";

function toDefinition(row: {
  id: string;
  scheduleVersionId: string;
  fixtureId: string;
  facilityResourceId: string;
  startAt: Date;
  endAt: Date;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedByUserId: string | null;
}): TournamentFixtureAssignmentDefinition {
  return {
    id: row.id,
    scheduleVersionId: row.scheduleVersionId,
    fixtureId: row.fixtureId,
    facilityResourceId: row.facilityResourceId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    isLocked: row.isLocked,
    lockedAt: row.lockedAt?.toISOString() ?? null,
    lockedByUserId: row.lockedByUserId,
  };
}

async function requireMutableScheduleVersion(tenantId: string, scheduleVersionId: string) {
  const version = await prisma.tournamentScheduleVersion.findFirst({
    where: { id: scheduleVersionId, tenantId },
  });
  if (!version) throw new TournamentScheduleNotFoundError(scheduleVersionId);
  if (version.status === "APPROVED") {
    throw new TournamentScheduleApprovedImmutableError(scheduleVersionId);
  }
  return version;
}

function assertExpectedRevision(
  expectedRevision: number | undefined,
  actualRevision: number,
): void {
  if (expectedRevision === undefined) return;
  if (expectedRevision !== actualRevision) {
    throw new TournamentScheduleStaleVersionError(expectedRevision, actualRevision);
  }
}

async function bumpScheduleRevision(
  scheduleVersionId: string,
  expectedRevision?: number,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.tournamentScheduleVersion.findUniqueOrThrow({
      where: { id: scheduleVersionId },
      select: { revision: true, status: true },
    });
    if (current.status === "APPROVED") {
      throw new TournamentScheduleApprovedImmutableError(scheduleVersionId);
    }
    assertExpectedRevision(expectedRevision, current.revision);
    const updated = await tx.tournamentScheduleVersion.update({
      where: { id: scheduleVersionId },
      data: { revision: { increment: 1 } },
      select: { revision: true },
    });
    return updated.revision;
  });
}

async function validateFacilityResource(tenantId: string, facilityResourceId: string): Promise<void> {
  const resource = await loadTenantFacilityResourceForWrite(tenantId, facilityResourceId);
  switch (validateAssignableFacilityResource(resource)) {
    case "NOT_FOUND":
      throw new TournamentScheduleResourceInvalidError(
        `FacilityResource not found: ${facilityResourceId}`,
      );
    case "ARCHIVED_RESOURCE":
      throw new TournamentScheduleResourceInvalidError(
        `FacilityResource "${facilityResourceId}" is archived and cannot receive new assignments`,
      );
    case "ARCHIVED_FACILITY":
      throw new TournamentScheduleResourceInvalidError(
        `Facility "${resource!.facility.id}" is archived; its resources cannot receive new assignments`,
      );
    case null:
      break;
  }
}

async function resolveAssignmentEndAt(
  tenantId: string,
  scheduleVersionId: string,
  startAt: Date,
  explicitEndAt: Date | undefined,
): Promise<Date> {
  if (explicitEndAt) return explicitEndAt;

  const version = await prisma.tournamentScheduleVersion.findFirst({
    where: { id: scheduleVersionId, tenantId },
    select: { matchDurationMinutes: true },
  });
  if (version?.matchDurationMinutes != null) {
    return new Date(startAt.getTime() + version.matchDurationMinutes * 60_000);
  }

  const policy = await getTenantOperationalDurationPolicy(tenantId);
  const durationMinutes = policy.TOURNAMENT.durationMinutes;
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

async function requireFixtureInTournament(
  tenantId: string,
  tournamentId: string,
  fixtureId: string,
): Promise<void> {
  const fixture = await prisma.tournamentFixture.findFirst({
    where: { id: fixtureId, tenantId, eventId: tournamentId },
    select: { id: true },
  });
  if (!fixture) throw new TournamentFixtureNotFoundError(fixtureId);
}

export async function persistTournamentFixtureAssignment(
  tenantId: string,
  scheduleVersionId: string,
  input: PersistTournamentFixtureAssignmentInput,
  options?: { expectedRevision?: number },
): Promise<{ assignment: TournamentFixtureAssignmentDefinition; revision: number }> {
  const version = await requireMutableScheduleVersion(tenantId, scheduleVersionId);
  assertExpectedRevision(options?.expectedRevision, version.revision);

  await requireFixtureInTournament(tenantId, version.eventId, input.fixtureId);
  await validateFacilityResource(tenantId, input.facilityResourceId);

  const existing = await prisma.tournamentFixtureAssignment.findUnique({
    where: {
      scheduleVersionId_fixtureId: {
        scheduleVersionId,
        fixtureId: input.fixtureId,
      },
    },
  });
  if (existing) {
    throw new TournamentAssignmentDuplicateError(scheduleVersionId, input.fixtureId);
  }

  const endAt = await resolveAssignmentEndAt(
    tenantId,
    scheduleVersionId,
    input.startAt,
    input.endAt,
  );
  if (endAt.getTime() <= input.startAt.getTime()) {
    throw new TournamentScheduleResourceInvalidError("Assignment endAt must be after startAt");
  }

  const { assignment, revision } = await prisma.$transaction(async (tx) => {
    const current = await tx.tournamentScheduleVersion.findUniqueOrThrow({
      where: { id: scheduleVersionId },
      select: { revision: true, status: true },
    });
    if (current.status === "APPROVED") {
      throw new TournamentScheduleApprovedImmutableError(scheduleVersionId);
    }
    assertExpectedRevision(options?.expectedRevision, current.revision);

    const updatedVersion = await tx.tournamentScheduleVersion.update({
      where: { id: scheduleVersionId },
      data: { revision: { increment: 1 } },
      select: { revision: true },
    });

    const row = await tx.tournamentFixtureAssignment.create({
      data: {
        tenantId,
        scheduleVersionId,
        fixtureId: input.fixtureId,
        facilityResourceId: input.facilityResourceId,
        startAt: input.startAt,
        endAt,
      },
    });

    return { assignment: toDefinition(row), revision: updatedVersion.revision };
  });

  return { assignment, revision };
}

export async function updateTournamentFixtureAssignment(
  tenantId: string,
  assignmentId: string,
  input: UpdateTournamentFixtureAssignmentInput,
  options?: { expectedRevision?: number },
): Promise<{ assignment: TournamentFixtureAssignmentDefinition; revision: number }> {
  const existing = await prisma.tournamentFixtureAssignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: { scheduleVersion: { select: { id: true, status: true, revision: true, eventId: true } } },
  });
  if (!existing) throw new TournamentAssignmentNotFoundError(assignmentId);
  if (existing.scheduleVersion.status === "APPROVED") {
    throw new TournamentScheduleApprovedImmutableError(existing.scheduleVersion.id);
  }
  assertExpectedRevision(options?.expectedRevision, existing.scheduleVersion.revision);

  if (input.facilityResourceId) {
    await validateFacilityResource(tenantId, input.facilityResourceId);
  }

  const startAt = input.startAt ?? existing.startAt;
  const endAt =
    input.endAt ??
    (input.startAt && !input.endAt
      ? await resolveAssignmentEndAt(tenantId, existing.scheduleVersionId, startAt, undefined)
      : existing.endAt);

  if (endAt.getTime() <= startAt.getTime()) {
    throw new TournamentScheduleResourceInvalidError("Assignment endAt must be after startAt");
  }

  const revision = await bumpScheduleRevision(
    existing.scheduleVersionId,
    options?.expectedRevision,
  );

  const row = await prisma.tournamentFixtureAssignment.update({
    where: { id: assignmentId },
    data: {
      facilityResourceId: input.facilityResourceId ?? existing.facilityResourceId,
      startAt,
      endAt,
    },
  });

  return { assignment: toDefinition(row), revision };
}

export async function removeTournamentFixtureAssignment(
  tenantId: string,
  assignmentId: string,
  options?: { expectedRevision?: number },
): Promise<{ revision: number }> {
  const existing = await prisma.tournamentFixtureAssignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: { scheduleVersion: { select: { id: true, status: true, revision: true } } },
  });
  if (!existing) throw new TournamentAssignmentNotFoundError(assignmentId);
  if (existing.scheduleVersion.status === "APPROVED") {
    throw new TournamentScheduleApprovedImmutableError(existing.scheduleVersion.id);
  }
  assertExpectedRevision(options?.expectedRevision, existing.scheduleVersion.revision);

  const revision = await bumpScheduleRevision(
    existing.scheduleVersionId,
    options?.expectedRevision,
  );

  await prisma.tournamentFixtureAssignment.delete({ where: { id: assignmentId } });

  return { revision };
}

export async function setTournamentFixtureAssignmentLocked(
  tenantId: string,
  assignmentId: string,
  locked: boolean,
  lockedByUserId: string | null,
  options?: { expectedRevision?: number },
): Promise<{ assignment: TournamentFixtureAssignmentDefinition; revision: number }> {
  const existing = await prisma.tournamentFixtureAssignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: { scheduleVersion: { select: { id: true, status: true, revision: true } } },
  });
  if (!existing) throw new TournamentAssignmentNotFoundError(assignmentId);
  if (existing.scheduleVersion.status === "APPROVED") {
    throw new TournamentScheduleApprovedImmutableError(existing.scheduleVersion.id);
  }
  assertExpectedRevision(options?.expectedRevision, existing.scheduleVersion.revision);

  const revision = await bumpScheduleRevision(
    existing.scheduleVersionId,
    options?.expectedRevision,
  );

  const row = await prisma.tournamentFixtureAssignment.update({
    where: { id: assignmentId },
    data: locked
      ? {
          isLocked: true,
          lockedAt: new Date(),
          lockedByUserId,
        }
      : {
          isLocked: false,
          lockedAt: null,
          lockedByUserId: null,
        },
  });

  return { assignment: toDefinition(row), revision };
}

export async function listTournamentFixtureAssignmentsForVersion(
  tenantId: string,
  scheduleVersionId: string,
): Promise<TournamentFixtureAssignmentDefinition[]> {
  const version = await prisma.tournamentScheduleVersion.findFirst({
    where: { id: scheduleVersionId, tenantId },
    select: { id: true },
  });
  if (!version) throw new TournamentScheduleNotFoundError(scheduleVersionId);

  const rows = await prisma.tournamentFixtureAssignment.findMany({
    where: { tenantId, scheduleVersionId },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });

  return rows.map(toDefinition);
}
