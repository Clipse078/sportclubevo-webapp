import { prisma } from "@/lib/db/prisma";
import { TaskValidationError } from "./errors";

/**
 * AUFGABEN-05-ORG-01 — Task organisational ownership helpers.
 *
 * Prisma FK to OrgUnit guarantees the referenced row exists, NOT that
 * OrgUnit.tenantId matches Task.tenantId. ORG-02/03 must never treat FK
 * validity as tenant validity.
 *
 * Invariant for any future write path that sets Task.orgUnitId or
 * TaskSeries.orgUnitId: call assertTaskOrgUnitBelongsToTenant (or equivalent)
 * with the same tenantId immediately before persistence.
 */
export const TASK_ORG_UNIT_PERSISTENCE_INVARIANT =
  "Any write that sets Task.orgUnitId or TaskSeries.orgUnitId MUST validate OrgUnit belongs to the same tenant via assertTaskOrgUnitBelongsToTenant before persist.";

export async function assertTaskOrgUnitBelongsToTenant(
  tenantId: string,
  orgUnitId: string,
): Promise<void> {
  if (!tenantId.trim()) {
    throw new TaskValidationError("Mandant fehlt.");
  }
  if (!orgUnitId.trim()) {
    throw new TaskValidationError("Organisationseinheit fehlt.");
  }

  const orgUnit = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId },
    select: { id: true },
  });
  if (!orgUnit) {
    throw new TaskValidationError(
      "Organisationseinheit gehört nicht zu diesem Mandanten.",
    );
  }
}
