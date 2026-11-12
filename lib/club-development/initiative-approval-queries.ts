/**
 * Initiative approval vote queries (SCE-CD-03R3F1).
 */

import { prisma } from "@/lib/db/prisma";

export async function getInitiativeApprovalVotes(initiativeId: string, tenantId: string) {
  return prisma.initiativeApprovalVote.findMany({
    where: { initiativeId, tenantId },
    orderBy: [{ contentRevision: "desc" }, { decidedAt: "asc" }],
    select: {
      id: true,
      approverPersonId: true,
      contentRevision: true,
      legacyRevisionUnscoped: true,
      decision: true,
      comment: true,
      decidedAt: true,
    },
  });
}
