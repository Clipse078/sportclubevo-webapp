/**
 * AUFGABEN-05-ORG-01 — Task organisational ownership helpers.
 *
 * Prisma FK to OrgUnit does not enforce tenantId equality on Task/TaskSeries.
 * ORG-02/03 must call this (or equivalent) before persisting orgUnitId.
 */

import { prisma } from "@/lib/db/prisma";
import { TaskValidationError } from "./errors";

export async function assertTaskOrgUnitBelongsToTenant(
  tenantId: string,
  orgUnitId: string,
): Promise<void> {
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
