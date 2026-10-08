/**
 * SCE-PLANNER-UX-08-08A — centralized FacilityResource reference diagnostics.
 *
 * All counts are tenant-scoped: references in other tenants never affect delete safety.
 */

import type { FacilityType, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { countMatchLegacyResourceReferences } from "@/lib/facilities/match-legacy-resource-compatibility";
import {
  FACILITY_LIFECYCLE_ERROR_CODES,
  FACILITY_LIFECYCLE_MESSAGES,
  FacilityLifecycleError,
  isPrismaForeignKeyViolation,
} from "@/lib/facilities/facility-lifecycle-errors";

export type FacilityResourceReferenceCounts = {
  trainingAllocations: number;
  trainingSessionAllocations: number;
  tournamentResourceAllocations: number;
  tournamentParticipantAllocations: number;
  weekplannerPlanAllocations: number;
  eventFacilityAllocations: number;
  matchLegacyReferences: number;
};

export type FacilityResourceReferenceDb = Pick<
  PrismaClient,
  | "trainingAllocation"
  | "trainingSessionAllocation"
  | "tournamentResourceAllocation"
  | "tournamentParticipantAllocation"
  | "weekplannerPlanAllocation"
  | "eventFacilityAllocation"
  | "event"
  | "facilityResourceCodeAlias"
  | "facilityResource"
>;

export function totalFacilityResourceReferences(
  counts: FacilityResourceReferenceCounts,
): number {
  return (
    counts.trainingAllocations +
    counts.trainingSessionAllocations +
    counts.tournamentResourceAllocations +
    counts.tournamentParticipantAllocations +
    counts.weekplannerPlanAllocations +
    counts.eventFacilityAllocations +
    counts.matchLegacyReferences
  );
}

export async function countFacilityResourceReferences(
  db: FacilityResourceReferenceDb,
  tenantId: string,
  facilityResourceId: string,
): Promise<FacilityResourceReferenceCounts> {
  const scoped = { tenantId, facilityResourceId };

  const resource = await db.facilityResource.findFirst({
    where: { id: facilityResourceId, tenantId },
    select: { code: true },
  });

  const [
    trainingAllocations,
    trainingSessionAllocations,
    tournamentResourceAllocations,
    tournamentParticipantAllocations,
    weekplannerPlanAllocations,
    eventFacilityAllocations,
    matchLegacyReferences,
  ] = await Promise.all([
    db.trainingAllocation.count({ where: scoped }),
    db.trainingSessionAllocation.count({ where: scoped }),
    db.tournamentResourceAllocation.count({ where: scoped }),
    db.tournamentParticipantAllocation.count({ where: scoped }),
    db.weekplannerPlanAllocation.count({ where: scoped }),
    db.eventFacilityAllocation.count({ where: scoped }),
    resource
      ? countMatchLegacyResourceReferences(db, tenantId, facilityResourceId, resource.code)
      : Promise.resolve(0),
  ]);

  return {
    trainingAllocations,
    trainingSessionAllocations,
    tournamentResourceAllocations,
    tournamentParticipantAllocations,
    weekplannerPlanAllocations,
    eventFacilityAllocations,
    matchLegacyReferences,
  };
}

export async function countFacilityResourceReferencesForFacility(
  db: FacilityResourceReferenceDb,
  tenantId: string,
  resourceIds: string[],
): Promise<number> {
  if (resourceIds.length === 0) return 0;

  const counts = await Promise.all(
    resourceIds.map((id) => countFacilityResourceReferences(db, tenantId, id)),
  );
  return counts.reduce((sum, c) => sum + totalFacilityResourceReferences(c), 0);
}

export function assertFacilityResourceNotReferenced(
  counts: FacilityResourceReferenceCounts,
): void {
  if (totalFacilityResourceReferences(counts) > 0) {
    throw new FacilityLifecycleError(
      FACILITY_LIFECYCLE_ERROR_CODES.RESOURCE_IN_USE,
      FACILITY_LIFECYCLE_MESSAGES.resourceInUse,
    );
  }
}

export function assertFacilityNotReferenced(totalAllocationRefs: number): void {
  if (totalAllocationRefs > 0) {
    throw new FacilityLifecycleError(
      FACILITY_LIFECYCLE_ERROR_CODES.FACILITY_IN_USE,
      FACILITY_LIFECYCLE_MESSAGES.facilityInUse,
    );
  }
}

/** Convenience for route handlers — never crosses tenant boundaries. */
export async function getFacilityResourceReferenceCountsForTenant(
  tenantId: string,
  facilityResourceId: string,
): Promise<FacilityResourceReferenceCounts> {
  return countFacilityResourceReferences(prisma, tenantId, facilityResourceId);
}

export type FacilityResourceDeletionImpactView = FacilityResourceReferenceCounts & {
  totalReferences: number;
  deletable: boolean;
};

export function toResourceDeletionImpactView(
  counts: FacilityResourceReferenceCounts,
): FacilityResourceDeletionImpactView {
  const totalReferences = totalFacilityResourceReferences(counts);
  return {
    ...counts,
    totalReferences,
    deletable: totalReferences === 0,
  };
}

export type FacilityDeletionImpactView = {
  resources: number;
  totalAllocationRefs: number;
  deletable: boolean;
};

export function toFacilityDeletionImpactView(input: {
  resources: number;
  totalAllocationRefs: number;
}): FacilityDeletionImpactView {
  return {
    ...input,
    deletable: input.totalAllocationRefs === 0,
  };
}

export function mapForeignKeyViolationToLifecycleError(error: unknown): FacilityLifecycleError | null {
  if (!isPrismaForeignKeyViolation(error)) return null;
  return new FacilityLifecycleError(
    FACILITY_LIFECYCLE_ERROR_CODES.RESOURCE_IN_USE,
    FACILITY_LIFECYCLE_MESSAGES.resourceInUse,
  );
}

export type FacilityWriteDb = Pick<
  PrismaClient,
  "facilityResource" | "facility" | "facilityResourceCodeAlias"
>;

export function normalizeFacilityResourceCode(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeComparableFacilityName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-CH");
}

export async function assertFacilityResourceCodeAvailable(
  db: FacilityWriteDb,
  tenantId: string,
  code: string,
  excludeResourceId?: string,
): Promise<void> {
  const normalized = normalizeFacilityResourceCode(code);
  if (!normalized) {
    throw new FacilityLifecycleError(
      FACILITY_LIFECYCLE_ERROR_CODES.DUPLICATE_RESOURCE,
      "Ressourcen-Code ist erforderlich.",
    );
  }

  const [existing, alias] = await Promise.all([
    db.facilityResource.findFirst({
      where: {
        tenantId,
        code: normalized,
        ...(excludeResourceId ? { id: { not: excludeResourceId } } : {}),
      },
      select: { id: true },
    }),
    db.facilityResourceCodeAlias.findFirst({
      where: {
        tenantId,
        code: normalized,
        ...(excludeResourceId ? { facilityResourceId: { not: excludeResourceId } } : {}),
      },
      select: { id: true },
    }),
  ]);

  if (existing || alias) {
    throw new FacilityLifecycleError(
      FACILITY_LIFECYCLE_ERROR_CODES.DUPLICATE_RESOURCE,
      FACILITY_LIFECYCLE_MESSAGES.duplicateResourceCode,
    );
  }
}

export async function assertFacilityIdentityAvailable(
  db: FacilityWriteDb,
  tenantId: string,
  name: string,
  type: FacilityType,
  excludeFacilityId?: string,
): Promise<void> {
  const comparable = normalizeComparableFacilityName(name);
  if (!comparable) return;

  const candidates = await db.facility.findMany({
    where: {
      tenantId,
      type,
      status: { not: "ARCHIVED" },
      ...(excludeFacilityId ? { id: { not: excludeFacilityId } } : {}),
    },
    select: { id: true, name: true },
  });

  const collision = candidates.find(
    (f) => normalizeComparableFacilityName(f.name) === comparable,
  );
  if (collision) {
    throw new FacilityLifecycleError(
      FACILITY_LIFECYCLE_ERROR_CODES.DUPLICATE_RESOURCE,
      FACILITY_LIFECYCLE_MESSAGES.duplicateFacilityIdentity,
    );
  }
}
