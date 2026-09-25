/**
 * PLANNING-UX-07R5 — shared facility resource write validation primitives.
 *
 * Domain allocation services keep their own persistence and error types; they
 * must not diverge on tenant ownership, archive rules, or allocation-group fit.
 */

import { prisma } from "@/lib/db/prisma";
import type { FacilityResourceType } from "@prisma/client";
import { classifyFacilityResourceType, type TrainingAllocationGroupKey } from "@/lib/training/allocation-groups";

export type FacilityResourceWriteRow = {
  id: string;
  tenantId: string;
  status: string;
  type: FacilityResourceType;
  facility: { id: string; status: string };
};

export type FacilityResourceWriteValidationIssue =
  | "NOT_FOUND"
  | "ARCHIVED_RESOURCE"
  | "ARCHIVED_FACILITY"
  | "GROUP_MISMATCH";

export async function loadTenantFacilityResourceForWrite(
  tenantId: string,
  facilityResourceId: string,
): Promise<FacilityResourceWriteRow | null> {
  return prisma.facilityResource.findFirst({
    where: { id: facilityResourceId, tenantId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      type: true,
      facility: { select: { id: true, status: true } },
    },
  });
}

export function validateAssignableFacilityResource(
  resource: FacilityResourceWriteRow | null,
): FacilityResourceWriteValidationIssue | null {
  if (!resource) return "NOT_FOUND";
  if (resource.status === "ARCHIVED") return "ARCHIVED_RESOURCE";
  if (resource.facility.status === "ARCHIVED") return "ARCHIVED_FACILITY";
  return null;
}

export function validateFacilityResourceAllocationGroup(
  resource: FacilityResourceWriteRow,
  allocationGroup: Extract<TrainingAllocationGroupKey, "PITCH_HALL" | "DRESSING_ROOM">,
): FacilityResourceWriteValidationIssue | null {
  const resourceGroup = classifyFacilityResourceType(resource.type);
  if (resourceGroup !== allocationGroup) return "GROUP_MISMATCH";
  return null;
}
