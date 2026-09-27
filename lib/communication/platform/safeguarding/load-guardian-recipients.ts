/**
 * SCE-COMM-18 — load active tenant-scoped guardian recipients for subjects.
 */

import { prisma } from "@/lib/db/prisma";
import type { SafeguardingGuardianRecipient } from "@/lib/communication/platform/safeguarding/guardian-recipient-types";

export async function loadGuardianRecipientsForSubjects(input: {
  tenantId: string;
  subjectPersonIds: readonly string[];
}): Promise<Map<string, SafeguardingGuardianRecipient[]>> {
  const uniqueIds = [...new Set(input.subjectPersonIds.filter(Boolean))];
  const map = new Map<string, SafeguardingGuardianRecipient[]>();
  if (uniqueIds.length === 0) return map;

  const rows = await prisma.guardianRelationship.findMany({
    where: {
      tenantId: input.tenantId,
      childPersonId: { in: uniqueIds },
      guardianPerson: { isActive: true },
    },
    select: {
      id: true,
      childPersonId: true,
      guardianPersonId: true,
      isPrimary: true,
      guardianPerson: {
        select: { userId: true, isActive: true },
      },
    },
    orderBy: [{ childPersonId: "asc" }, { isPrimary: "desc" }, { createdAt: "asc" }],
  });

  for (const row of rows) {
    if (!row.guardianPerson.isActive) continue;
    const list = map.get(row.childPersonId) ?? [];
    list.push({
      guardianPersonId: row.guardianPersonId,
      guardianUserId: row.guardianPerson.userId,
      relationshipId: row.id,
      isPrimary: row.isPrimary,
    });
    map.set(row.childPersonId, list);
  }

  return map;
}
