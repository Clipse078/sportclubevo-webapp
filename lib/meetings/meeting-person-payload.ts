/**
 * Server-side helpers — validate tenant-scoped person picks for meeting sub-entities.
 */

import { prisma } from "@/lib/db/prisma";

export type MeetingPersonSnapshot = {
  personId: string;
  displayName: string;
  userId: string | null;
};

function personLabel(person: {
  displayName: string | null;
  firstName: string;
  lastName: string;
}): string {
  return person.displayName?.trim() || `${person.firstName} ${person.lastName}`.trim();
}

export async function resolveMeetingPersonSnapshot(
  tenantId: string,
  personId: string,
): Promise<MeetingPersonSnapshot | null> {
  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId, isActive: true },
    select: { id: true, displayName: true, firstName: true, lastName: true, email: true },
  });
  if (!person) return null;

  let userId: string | null = null;
  if (person.email?.trim()) {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: person.email.trim(), mode: "insensitive" },
        tenantMemberships: { some: { tenantId, isActive: true } },
        isActive: true,
      },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  return {
    personId: person.id,
    displayName: personLabel(person),
    userId,
  };
}
