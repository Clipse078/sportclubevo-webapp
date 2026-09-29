/**
 * Canonical Person ↔ User ↔ TenantMembership resolution for operational eligibility.
 * Person.userId is the sole link (ADMIN-MASTERDATA-UX-01); TenantMembership is authoritative for tenant access (RPERM-02).
 */

import { prisma } from "@/lib/db/prisma";

export type PersonUserIdentity = {
  personId: string;
  userId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
};

const personSelect = {
  id: true,
  tenantId: true,
  userId: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
  isActive: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  },
} as const;

function formatDisplayName(row: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  const fromParts = `${row.firstName} ${row.lastName}`.trim();
  return row.displayName?.trim() || fromParts || "Unbenannt";
}

function mapPersonRow(row: {
  id: string;
  tenantId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
}): PersonUserIdentity | null {
  if (!row.isActive || !row.userId || !row.user?.isActive) return null;
  if (row.userId !== row.user.id) return null;
  const displayName = formatDisplayName(row);
  return {
    personId: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName,
    email: row.user.email || row.email || "",
  };
}

export async function resolvePersonUserIdentityByPersonId(
  tenantId: string,
  personId: string,
): Promise<PersonUserIdentity | null> {
  const row = await prisma.person.findFirst({
    where: { id: personId, tenantId },
    select: personSelect,
  });
  if (!row) return null;
  const identity = mapPersonRow(row);
  if (!identity) return null;
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId: identity.userId } },
    select: { isActive: true },
  });
  if (!membership?.isActive) return null;
  return identity;
}

export async function resolvePersonUserIdentityByUserId(
  tenantId: string,
  userId: string,
): Promise<PersonUserIdentity | null> {
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { isActive: true },
  });
  if (!membership?.isActive) return null;

  const row = await prisma.person.findUnique({
    where: { userId },
    select: personSelect,
  });
  if (!row || row.tenantId !== tenantId) return null;
  return mapPersonRow(row);
}

/**
 * TASK_ASSIGNMENT eligibility: active tenant Person with linked active User and active membership.
 * Person-first query (aligned with People directory tenant scoping, not membership-first nesting).
 */
export async function listTaskAssignablePersonUserIdentitiesInTenant(
  tenantId: string,
): Promise<PersonUserIdentity[]> {
  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      isActive: true,
      userId: { not: null },
      user: {
        isActive: true,
        tenantMemberships: { some: { tenantId, isActive: true } },
      },
    },
    select: personSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const byUserId = new Map<string, PersonUserIdentity>();
  for (const row of rows) {
    const identity = mapPersonRow(row);
    if (!identity || identity.tenantId !== tenantId) continue;
    byUserId.set(identity.userId, identity);
  }

  return [...byUserId.values()];
}

export async function listEligiblePersonUserIdentitiesInTenant(
  tenantId: string,
): Promise<PersonUserIdentity[]> {
  return listTaskAssignablePersonUserIdentitiesInTenant(tenantId);
}

export async function searchEligiblePersonUserIdentitiesInTenant(
  tenantId: string,
  search: string,
  limit: number,
): Promise<PersonUserIdentity[]> {
  const term = search.trim();
  if (!term) return listEligiblePersonUserIdentitiesInTenant(tenantId);

  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      isActive: true,
      userId: { not: null },
      user: {
        isActive: true,
        tenantMemberships: { some: { tenantId, isActive: true } },
      },
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
      ],
    },
    select: personSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: Math.max(limit * 2, limit),
  });

  const byUserId = new Map<string, PersonUserIdentity>();
  for (const row of rows) {
    const identity = mapPersonRow(row);
    if (!identity) continue;
    byUserId.set(identity.userId, identity);
    if (byUserId.size >= limit) break;
  }
  return [...byUserId.values()];
}
