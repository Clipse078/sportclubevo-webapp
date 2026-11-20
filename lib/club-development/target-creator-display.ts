import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveAccountIdentityName } from "@/lib/people/identity";

export async function resolveTargetCreatorDisplayName(
  tenantId: string,
  createdByUserId: string | null | undefined,
): Promise<string | null> {
  if (!createdByUserId?.trim()) return null;

  const [user, tenant] = await Promise.all([
    prisma.user.findFirst({
      where: { id: createdByUserId },
      select: {
        firstName: true,
        lastName: true,
        person: {
          select: { firstName: true, lastName: true, displayName: true },
        },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  if (!user) return null;

  const identity = resolveAccountIdentityName({
    linkedPerson: user.person
      ? {
          firstName: user.person.firstName,
          lastName: user.person.lastName,
        }
      : null,
    sessionFirstName: user.firstName,
    sessionLastName: user.lastName,
    tenantName: tenant?.name ?? null,
  });

  const full = `${identity.firstName} ${identity.lastName}`.trim();
  return full || null;
}