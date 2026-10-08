/**
 * lib/facilities/facility-delete-service.ts
 *
 * SCE-PLANNER-UX-08-08A — safe permanent delete for Facility / FacilityResource.
 *
 * Lifecycle policy:
 *   - Archive/deactivate is the normal retirement path when a resource was used.
 *   - Physical delete is allowed only when no protected allocation/history links exist.
 *   - DB FKs on allocation → FacilityResource use ON DELETE RESTRICT (race-safe backstop).
 */

import { prisma } from "@/lib/db/prisma";
import {
  FACILITY_LIFECYCLE_ERROR_CODES,
  FACILITY_LIFECYCLE_MESSAGES,
  FacilityLifecycleError,
  isPrismaForeignKeyViolation,
} from "@/lib/facilities/facility-lifecycle-errors";
import {
  assertFacilityNotReferenced,
  assertFacilityResourceNotReferenced,
  countFacilityResourceReferences,
  countFacilityResourceReferencesForFacility,
  toFacilityDeletionImpactView,
  toResourceDeletionImpactView,
  totalFacilityResourceReferences,
  type FacilityResourceReferenceCounts,
} from "@/lib/facilities/facility-resource-reference-guard";

export type FacilityResourceDeletionImpact = FacilityResourceReferenceCounts & {
  totalReferences: number;
  deletable: boolean;
};

/**
 * Returns deletion impact for a FacilityResource within the given tenant.
 * Returns null when the resource does not exist or is cross-tenant.
 * Never mutates.
 */
export async function getFacilityResourceDeletionImpact(
  tenantId: string,
  resourceId: string,
): Promise<FacilityResourceDeletionImpact | null> {
  const resource = await prisma.facilityResource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });

  if (!resource) return null;

  const counts = await countFacilityResourceReferences(prisma, tenantId, resourceId);
  return toResourceDeletionImpactView(counts);
}

export type FacilityResourceDeletionResult = {
  resourceId: string;
  name: string;
  code: string;
  impact: FacilityResourceReferenceCounts;
};

/**
 * Permanently deletes a FacilityResource within the given tenant when structurally safe.
 *
 * Throws FacilityLifecycleError (RESOURCE_IN_USE) when any allocation link exists.
 * Returns null when the resource does not exist in the tenant.
 */
export async function deleteFacilityResourcePermanently(
  tenantId: string,
  resourceId: string,
): Promise<FacilityResourceDeletionResult | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const resource = await tx.facilityResource.findFirst({
        where: { id: resourceId, tenantId },
        select: { id: true, name: true, code: true },
      });

      if (!resource) return null;

      const impact = await countFacilityResourceReferences(tx, tenantId, resourceId);
      assertFacilityResourceNotReferenced(impact);

      await tx.facilityResource.delete({ where: { id: resourceId } });

      return { resourceId, name: resource.name, code: resource.code, impact };
    });
  } catch (error) {
    if (isPrismaForeignKeyViolation(error)) {
      throw new FacilityLifecycleError(
        FACILITY_LIFECYCLE_ERROR_CODES.RESOURCE_IN_USE,
        FACILITY_LIFECYCLE_MESSAGES.resourceInUse,
      );
    }
    throw error;
  }
}

export type FacilityDeletionImpact = {
  resources: number;
  totalAllocationRefs: number;
  deletable: boolean;
};

/**
 * Returns deletion impact for a Facility within the given tenant.
 * Returns null when the facility does not exist or is cross-tenant.
 * Never mutates.
 */
export async function getFacilityDeletionImpact(
  tenantId: string,
  facilityId: string,
): Promise<FacilityDeletionImpact | null> {
  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, tenantId },
    select: {
      _count: { select: { resources: true } },
    },
  });

  if (!facility) return null;

  const resourceIds = await prisma.facilityResource.findMany({
    where: { facilityId, tenantId },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  const totalAllocationRefs = await countFacilityResourceReferencesForFacility(
    prisma,
    tenantId,
    resourceIds,
  );

  return toFacilityDeletionImpactView({
    resources: facility._count.resources,
    totalAllocationRefs,
  });
}

export type FacilityDeletionResult = {
  facilityId: string;
  name: string;
  impact: Omit<FacilityDeletionImpact, "deletable">;
};

/**
 * Permanently deletes a Facility within the given tenant when all child resources are unused.
 *
 * Throws FacilityLifecycleError (FACILITY_IN_USE) when any child resource is referenced.
 * Returns null when the facility does not exist in the tenant.
 */
export async function deleteFacilityPermanently(
  tenantId: string,
  facilityId: string,
): Promise<FacilityDeletionResult | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.findFirst({
        where: { id: facilityId, tenantId },
        select: {
          name: true,
          _count: { select: { resources: true } },
        },
      });

      if (!facility) return null;

      const resourceIds = await tx.facilityResource.findMany({
        where: { facilityId, tenantId },
        select: { id: true },
      }).then((rows) => rows.map((r) => r.id));

      const totalAllocationRefs = await countFacilityResourceReferencesForFacility(
        tx,
        tenantId,
        resourceIds,
      );

      assertFacilityNotReferenced(totalAllocationRefs);

      await tx.facility.delete({ where: { id: facilityId } });

      return {
        facilityId,
        name: facility.name,
        impact: {
          resources: facility._count.resources,
          totalAllocationRefs,
        },
      };
    });
  } catch (error) {
    if (isPrismaForeignKeyViolation(error)) {
      throw new FacilityLifecycleError(
        FACILITY_LIFECYCLE_ERROR_CODES.FACILITY_IN_USE,
        FACILITY_LIFECYCLE_MESSAGES.facilityInUse,
      );
    }
    throw error;
  }
}

/** @internal test helper */
export { totalFacilityResourceReferences };
