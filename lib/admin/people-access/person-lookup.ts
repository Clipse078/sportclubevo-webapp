import { prisma } from "@/lib/db/prisma";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";

export type PersonLookupResult =
  | { kind: "not_found" }
  | {
      kind: "person_without_access";
      personId: string;
      firstName: string;
      lastName: string;
      email: string | null;
    }
  | {
      kind: "active_member";
      userId: string;
      personId: string | null;
      firstName: string;
      lastName: string;
      email: string;
      pendingInvitation: boolean;
    }
  | { kind: "person_other_tenant"; masked: true };

/**
 * Tenant-scoped identity lookup by email. Never returns data from other tenants.
 */
export async function lookupPersonByEmailInTenant(
  tenantId: string,
  rawEmail: string,
): Promise<PersonLookupResult> {
  const email = normalizePeopleAccessEmail(rawEmail);
  if (!email) return { kind: "not_found" };

  const person = await prisma.person.findFirst({
    where: { tenantId, email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
    },
  });

  if (person) {
    if (person.userId) {
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: person.userId } },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              passwordResetTokens: {
                where: {
                  isInvitation: true,
                  usedAt: null,
                  expiresAt: { gt: new Date() },
                },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });
      if (membership) {
        return {
          kind: "active_member",
          userId: membership.user.id,
          personId: person.id,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          pendingInvitation: membership.user.passwordResetTokens.length > 0,
        };
      }
    }
    return {
      kind: "person_without_access",
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
    };
  }

  const userMember = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      user: { email: { equals: email, mode: "insensitive" } },
    },
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          person: { where: { tenantId }, select: { id: true } },
          passwordResetTokens: {
            where: {
              isInvitation: true,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (userMember) {
    const u = userMember.user;
    return {
      kind: "active_member",
      userId: u.id,
      personId: u.person?.id ?? null,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      pendingInvitation: u.passwordResetTokens.length > 0,
    };
  }

  // Same email may exist on another tenant — do not leak.
  const foreignUser = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      tenantMemberships: { none: { tenantId } },
    },
    select: { id: true },
  });
  if (foreignUser) {
    return { kind: "person_other_tenant", masked: true };
  }

  return { kind: "not_found" };
}
