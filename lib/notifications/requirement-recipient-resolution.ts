import { prisma } from "@/lib/db/prisma";

export type SubjectPersonNotificationContext = {
  personId: string;
  displayName: string;
  selfUserId: string | null;
  guardianUserIds: string[];
};

function formatPersonDisplayName(input: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  const named = input.displayName?.trim();
  if (named) return named;
  return `${input.firstName} ${input.lastName}`.trim();
}

/**
 * Batch inverse of getUserIdsAuthorizedToRespondForPerson — maps subject Person
 * to authorised notification User ids (self account + linked guardians).
 */
export async function loadSubjectPersonNotificationContexts(
  tenantId: string,
  subjectPersonIds: string[],
): Promise<Map<string, SubjectPersonNotificationContext>> {
  const uniqueIds = [...new Set(subjectPersonIds)];
  if (uniqueIds.length === 0) return new Map();

  const rows = await prisma.person.findMany({
    where: { tenantId, id: { in: uniqueIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      userId: true,
      guardianRelationshipsAsChild: {
        select: { guardianPerson: { select: { userId: true } } },
      },
    },
  });

  const map = new Map<string, SubjectPersonNotificationContext>();
  for (const row of rows) {
    const guardianUserIds = row.guardianRelationshipsAsChild
      .map((link) => link.guardianPerson.userId)
      .filter((userId): userId is string => !!userId);
    map.set(row.id, {
      personId: row.id,
      displayName: formatPersonDisplayName(row),
      selfUserId: row.userId,
      guardianUserIds,
    });
  }
  return map;
}

export function resolveNotificationUserIdsForSubject(
  context: SubjectPersonNotificationContext,
): string[] {
  const userIds = new Set<string>();
  if (context.selfUserId) userIds.add(context.selfUserId);
  for (const guardianUserId of context.guardianUserIds) {
    userIds.add(guardianUserId);
  }
  return [...userIds];
}

export function isGuardianNotificationRecipient(
  recipientUserId: string,
  context: SubjectPersonNotificationContext,
): boolean {
  return recipientUserId !== context.selfUserId;
}
