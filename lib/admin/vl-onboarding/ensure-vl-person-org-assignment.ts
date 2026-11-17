/**
 * Idempotent VL org-unit assignment for invited persons.
 */

import { prisma } from "@/lib/db/prisma";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
export class VlPersonOrgAssignmentError extends Error {
  constructor(
    readonly code: "VL_ORG_UNIT_MISSING" | "VL_ORG_FUNCTION_UNCONFIRMED",
    message: string,
  ) {
    super(message);
    this.name = "VlPersonOrgAssignmentError";
  }
}

export async function ensureVlPersonOrgAssignment(input: {
  tenantId: string;
  personId: string;
  functionKey?: string | null;
}): Promise<{ created: boolean; assignmentId: string }> {
  const orgUnit = await prisma.orgUnit.findFirst({
    where: { tenantId: input.tenantId, key: FCA_VL_INVITATION_PRESET.orgUnitKey },
    select: { id: true },
  });
  if (!orgUnit) {
    throw new VlPersonOrgAssignmentError(
      "VL_ORG_UNIT_MISSING",
      `Org-Einheit «${FCA_VL_INVITATION_PRESET.orgUnitKey}» fehlt im Mandanten.`,
    );
  }

  const existing = await prisma.personAssignment.findFirst({
    where: {
      tenantId: input.tenantId,
      personId: input.personId,
      orgUnitId: orgUnit.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (existing) {
    return { created: false, assignmentId: existing.id };
  }

  const functionKey = input.functionKey?.trim();
  if (!functionKey) {
    throw new VlPersonOrgAssignmentError(
      "VL_ORG_FUNCTION_UNCONFIRMED",
      "Organisationsfunktion muss vor der VL-Zuweisung bestätigt werden.",
    );
  }

  const created = await prisma.personAssignment.create({
    data: {
      tenantId: input.tenantId,
      personId: input.personId,
      orgUnitId: orgUnit.id,
      functionKey,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return { created: true, assignmentId: created.id };
}