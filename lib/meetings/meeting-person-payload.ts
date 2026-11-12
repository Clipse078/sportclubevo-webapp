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

/** Best-effort link from session user to tenant Person (email match). */
export async function resolvePersonIdForUser(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { email: true },
  });
  if (!user?.email?.trim()) return null;
  const person = await prisma.person.findFirst({
    where: {
      tenantId,
      isActive: true,
      email: { equals: user.email.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  return person?.id ?? null;
}

export async function assertApproverActsAsSelf(input: {
  tenantId: string;
  actorUserId: string;
  actorPersonId: string | null;
  approverPersonId: string;
}): Promise<void> {
  if (input.actorPersonId === input.approverPersonId) return;
  const snap = await resolveMeetingPersonSnapshot(input.tenantId, input.approverPersonId);
  if (snap?.userId === input.actorUserId) return;
  throw new Error("APPROVER_IDENTITY_MISMATCH");
}
