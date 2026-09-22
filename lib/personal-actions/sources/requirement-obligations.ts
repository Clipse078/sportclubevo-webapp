/**
 * AUFGABEN-06G3 — batched RequirementRecipient obligations for authorised persons.
 */

import { prisma } from "@/lib/db/prisma";
import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";

export type RequirementObligationCandidate = {
  recipientId: string;
  requirementId: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  subjectPersonId: string;
  subjectDisplayName: string;
  /** True when the authenticated user is responding on behalf of another person. */
  actingForOtherPerson: boolean;
};

function formatPersonDisplayName(person: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const fromDisplay = person.displayName?.trim();
  if (fromDisplay) return fromDisplay;
  const parts = [person.firstName, person.lastName].map((p) => p?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unbenannt";
}

export async function loadRequirementObligationCandidates(
  tenantId: string,
  userId: string,
): Promise<RequirementObligationCandidate[]> {
  const personIds = await getAuthorizedPersonIdsForUser(tenantId, userId);
  if (personIds.length === 0) {
    return [];
  }

  const [linkedPerson, rows] = await Promise.all([
    prisma.person.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    }),
    prisma.requirementRecipient.findMany({
      where: {
        tenantId,
        subjectPersonId: { in: [...personIds] },
        removedAt: null,
        resolutionStatus: "OPEN",
        requirement: {
          status: "ACTIVE",
          responseMode: "ACKNOWLEDGE",
        },
      },
      select: {
        id: true,
        requirementId: true,
        subjectPersonId: true,
        requirement: {
          select: {
            title: true,
            description: true,
            dueAt: true,
          },
        },
        subjectPerson: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  const selfPersonId = linkedPerson?.id ?? null;

  return rows.map((row) => ({
    recipientId: row.id,
    requirementId: row.requirementId,
    title: row.requirement.title,
    description: row.requirement.description,
    dueAt: row.requirement.dueAt,
    subjectPersonId: row.subjectPersonId,
    subjectDisplayName: formatPersonDisplayName(row.subjectPerson),
    actingForOtherPerson: selfPersonId !== row.subjectPersonId,
  }));
}

export async function countOpenRequirementObligationsForUser(
  tenantId: string,
  userId: string,
): Promise<number> {
  const personIds = await getAuthorizedPersonIdsForUser(tenantId, userId);
  if (personIds.length === 0) {
    return 0;
  }

  return prisma.requirementRecipient.count({
    where: {
      tenantId,
      subjectPersonId: { in: [...personIds] },
      removedAt: null,
      resolutionStatus: "OPEN",
      requirement: {
        status: "ACTIVE",
        responseMode: "ACKNOWLEDGE",
      },
    },
  });
}
